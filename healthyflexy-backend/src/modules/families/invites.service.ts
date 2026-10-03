import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { ErrorCode, INVITE, PLAN } from '../../common/constants';
import { DomainEvent, FamilyCreatedEvent } from '../../common/events/domain-events';
import { AppException } from '../../common/exceptions/app.exception';
import { EnvironmentVariables } from '../../config';
import { generateInviteCode } from '../../common/utils/invite-code.util';
import { User } from '../users/entities/user.entity';
import { CreateInviteDto, InviteResponseDto } from './dto';
import { Family } from './entities/family.entity';
import { Invite } from './entities/invite.entity';

const PG_UNIQUE_VIOLATION = '23505';
const MAX_CODE_ATTEMPTS = 8;

/** Запрошення (ТЗ §5.5): дитина створює код → батько/мати вводить → створюється сім'я. */
@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @InjectRepository(Invite) private readonly invites: Repository<Invite>,
    @InjectRepository(Family) private readonly families: Repository<Family>,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Нове запрошення знецінює попередні невикористані. Дитина може мати кілька батьків
   * (кожне запрошення = ще одна сім'я), але не більше PLAN.MAX_FAMILIES_PER_CHILD.
   */
  async create(childId: string, dto: CreateInviteDto): Promise<InviteResponseDto> {
    if ((await this.families.count({ where: { childId } })) >= PLAN.MAX_FAMILIES_PER_CHILD) {
      throw new AppException(ErrorCode.ALREADY_IN_FAMILY, HttpStatus.CONFLICT);
    }
    const { relationship } = dto;
    const expiresAt = new Date(Date.now() + INVITE.TTL_DAYS * 24 * 3600_000);

    // Колізія коду (unique) скасовує транзакцію в PostgreSQL, тому повторюємо її цілком з новим кодом
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const repo = manager.getRepository(Invite);
          await repo.update(
            { childId, usedAt: IsNull(), revokedAt: IsNull() },
            { revokedAt: new Date() },
          );
          const invite = await repo.save(
            repo.create({
              childId,
              code: generateInviteCode(),
              relationship,
              rate: dto.rate ?? null,
              parentLabel: dto.parentLabel?.trim() || null,
              expiresAt,
            }),
          );
          return this.toResponse(invite);
        });
      } catch (error) {
        if ((error as { code?: string }).code !== PG_UNIQUE_VIOLATION) throw error;
      }
    }
    throw new AppException(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async getActive(childId: string): Promise<InviteResponseDto | null> {
    const invite = await this.invites.findOne({
      where: { childId, usedAt: IsNull(), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    return invite ? this.toResponse(invite) : null;
  }

  /** Батько/мати вводить код: перевірки → створення Family → подія FAMILY_CREATED */
  async accept(parent: User, rawCode: string): Promise<Family> {
    const code = rawCode.trim().toUpperCase();
    const family = await this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .getRepository(Invite)
        .createQueryBuilder('i')
        .setLock('pessimistic_write')
        .where('i.code = :code', { code })
        .getOne();

      if (!invite || invite.revokedAt)
        throw new AppException(ErrorCode.INVITE_INVALID, HttpStatus.NOT_FOUND);
      if (invite.usedAt) throw new AppException(ErrorCode.INVITE_USED, HttpStatus.CONFLICT);
      if (invite.expiresAt <= new Date())
        throw new AppException(ErrorCode.INVITE_EXPIRED, HttpStatus.GONE);
      if (invite.childId === parent.id)
        throw new AppException(ErrorCode.INVITE_INVALID, HttpStatus.BAD_REQUEST);
      if (await manager.getRepository(Family).exists({ where: { parentId: parent.id } })) {
        throw new AppException(ErrorCode.ALREADY_IN_FAMILY, HttpStatus.CONFLICT);
      }

      const created = await manager.getRepository(Family).save(
        manager.getRepository(Family).create({
          childId: invite.childId,
          parentId: parent.id,
          relationship: invite.relationship,
          parentLabel: invite.parentLabel,
          ...(invite.rate !== null ? { rate: invite.rate } : {}),
        }),
      );
      await manager
        .getRepository(Invite)
        .update({ id: invite.id }, { usedById: parent.id, usedAt: new Date() });
      return created;
    });

    const payload: FamilyCreatedEvent = {
      familyId: family.id,
      childId: family.childId,
      parentId: family.parentId,
      relationship: family.relationship,
    };
    this.events.emit(DomainEvent.FAMILY_CREATED, payload);
    this.logger.log({ event: 'family_created', familyId: family.id });

    return this.families.findOneOrFail({
      where: { id: family.id },
      relations: { parent: true, child: true },
    });
  }

  private toResponse(invite: Invite): InviteResponseDto {
    const scheme = this.config.get('APP_DEEP_LINK_SCHEME', { infer: true });
    return {
      code: invite.code,
      deepLink: `${scheme}://join/${invite.code}`,
      relationship: invite.relationship,
      expiresAt: invite.expiresAt,
    };
  }
}
