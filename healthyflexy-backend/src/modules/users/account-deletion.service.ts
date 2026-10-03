import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { DomainEvent, FamilyRemovedEvent } from '../../common/events/domain-events';
import { Family } from '../families/entities/family.entity';
import { StorageService } from '../storage/storage.service';
import { User } from './entities/user.entity';

/**
 * Видалення акаунта (розділ 15.4 ТЗ; вимога Apple та GDPR ст. 17).
 * 1) у транзакції: знайти сім'ю → видалити User (каскадом: families → day_sessions → exercise_records, ledger, invites, tokens);
 * 2) подія FAMILY_REMOVED: друга сторона побачить, що акаунт видалено;
 * 3) у фоні: видалити аватари й кадри сімей зі сховища (prefix `{familyId}/`) — клієнт не чекає на це.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    // дитина може мати кілька сімей (кілька батьків) — прибираємо файли й повідомляємо кожну
    const families = await this.dataSource.transaction(async (manager) => {
      const found = await manager
        .getRepository(Family)
        .find({ where: [{ parentId: userId }, { childId: userId }] });
      await manager.getRepository(User).delete({ id: userId });
      return found;
    });

    this.logger.log({ event: 'account_deleted', userId, families: families.map((f) => f.id) });

    // друга сторона дізнається одразу; файли прибираємо у фоні — відповідь клієнту не чекає на сховище
    for (const family of families) {
      const payload: FamilyRemovedEvent = {
        familyId: family.id,
        childId: family.childId,
        parentId: family.parentId,
        removedByUserId: userId,
      };
      this.events.emit(DomainEvent.FAMILY_REMOVED, payload);
    }
    void this.cleanupFiles(userId, families);
  }

  /** Аватари користувача й кадри його сімей; помилка сховища не впливає на вже видалені дані */
  private async cleanupFiles(userId: string, families: Family[]): Promise<void> {
    await this.storage
      .deleteUserAvatars(userId)
      .catch((error: unknown) =>
        this.logger.error({ event: 'avatar_delete_failed', userId, reason: String(error) }),
      );
    for (const family of families) {
      try {
        const removed = await this.storage.deleteFamilyFiles(family.id);
        this.logger.log({ event: 'family_files_deleted', familyId: family.id, files: removed });
      } catch (error) {
        this.logger.error({
          event: 'family_files_delete_failed',
          familyId: family.id,
          reason: String(error),
        });
      }
    }
  }
}
