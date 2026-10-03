import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { requestContext } from '../../common/context/request-context';
import { AppException } from '../../common/exceptions/app.exception';
import { User } from '../users/entities/user.entity';
import { Family } from './entities/family.entity';

/**
 * Резолвить сім'ю поточного користувача й перевіряє членство. Усі сервіси беруть familyId ЗВІДСИ, а не з клієнта:
 * це і є «RLS» цього бекенду (ТЗ §19, правило 6).
 *
 * Батько/мати має рівно одну сім'ю. Дитина може мати кілька (мама, тато, бабуся): обрана в перемикачі сім'я
 * приходить заголовком `X-Family-Id` і береться, лише якщо дитина справді її учасник; інакше — найперша.
 */
@Injectable()
export class FamilyContextService {
  constructor(@InjectRepository(Family) private readonly families: Repository<Family>) {}

  /**
   * Один SQL із JOIN (без `findOne` + relations: той робить два запити — `SELECT DISTINCT` для пагінації й основний).
   * Цей метод викликається майже в кожному запиті застосунку.
   */
  async findFamilyFor(userId: string): Promise<Family | null> {
    const base = () =>
      this.families
        .createQueryBuilder('f')
        .leftJoinAndSelect('f.parent', 'parent')
        .leftJoinAndSelect('f.child', 'child')
        .where('(f.parent_id = :userId OR f.child_id = :userId)', { userId });
    const selected = requestContext.getStore()?.familyId;
    if (selected) {
      const family = await base().andWhere('f.id = :selected', { selected }).getOne();
      if (family) return family;
    }
    return base().orderBy('f.created_at', 'ASC').getOne();
  }

  /** Усі сім'ї користувача (для дитини — перемикач батьків), від найстарішої */
  listFamiliesFor(userId: string): Promise<Family[]> {
    return this.families.find({
      where: [{ parentId: userId }, { childId: userId }],
      relations: { parent: true, child: true },
      order: { createdAt: 'ASC' },
    });
  }

  async requireFamilyFor(userId: string): Promise<Family> {
    const family = await this.findFamilyFor(userId);
    if (!family) throw new AppException(ErrorCode.FAMILY_NOT_FOUND, HttpStatus.NOT_FOUND);
    return family;
  }

  async requireMembership(userId: string, familyId: string): Promise<Family> {
    const family = await this.families
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.parent', 'parent')
      .leftJoinAndSelect('f.child', 'child')
      .where('f.id = :familyId', { familyId })
      .getOne();
    if (!family) throw new AppException(ErrorCode.FAMILY_NOT_FOUND, HttpStatus.NOT_FOUND);
    if (family.parentId !== userId && family.childId !== userId) {
      throw new AppException(ErrorCode.NOT_FAMILY_MEMBER, HttpStatus.FORBIDDEN);
    }
    return family;
  }

  counterpartOf(family: Family, userId: string): User {
    return family.parentId === userId ? family.child : family.parent;
  }
}
