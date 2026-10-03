import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PLAN } from '../../common/constants';
import { SessionStatus } from '../../common/enums';
import { daysInMonth, isoWeekdayOf } from '../../common/utils/date.util';
import { FamilyStatsResponseDto } from '../families/dto';
import { Family } from '../families/entities/family.entity';
import { BalanceService } from '../ledger/balance.service';
import { DaySession } from './entities/day-session.entity';

/** Статистика сім'ї (ТЗ §8.4): агрегати в SQL, серія — за впорядкованими записами днів. */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(DaySession) private readonly sessions: Repository<DaySession>,
    private readonly balance: BalanceService,
  ) {}

  async getFamilyStats(family: Family, today: string): Promise<FamilyStatsResponseDto> {
    const [balance, fund, counts, currentStreak, month] = await Promise.all([
      this.balance.getBalance(family.id),
      this.balance.getFund(family.id),
      this.sessions
        .createQueryBuilder('s')
        .select('s.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('s.familyId = :id', { id: family.id })
        .groupBy('s.status')
        .getRawMany<{ status: SessionStatus; count: string }>(),
      this.computeStreak(family.id, today),
      this.computeMonth(family, today),
    ]);
    const countOf = (status: SessionStatus) =>
      Number(counts.find((c) => c.status === status)?.count ?? 0);
    const completed = countOf(SessionStatus.COMPLETED);
    const missed = countOf(SessionStatus.MISSED);
    return {
      currency: family.currency,
      ...balance,
      daysCompleted: completed,
      daysMissed: missed,
      completionPct:
        completed + missed === 0 ? 0 : Math.round((completed / (completed + missed)) * 100),
      currentStreak,
      ...month,
      ...fund,
      ...this.fundRunway(family, fund.fundBalance, today),
    };
  }

  /**
   * На скільки вистачить фонду за поточного плану: витрата = ставка × днів занять на тиждень (якщо виконувати все).
   * Повертає місяці (з точністю до 0,1) і орієнтовну дату, до якої фонд покриває заняття.
   */
  fundRunway(
    family: Pick<Family, 'rate' | 'planDays'>,
    fundBalance: number,
    today: string,
  ): Pick<FamilyStatsResponseDto, 'fundMonthlyCost' | 'fundMonths' | 'fundCoversUntil'> {
    const perWeek = family.rate * family.planDays.length;
    const monthly = Math.round(perWeek * PLAN.WEEKS_PER_MONTH * 100) / 100;
    if (fundBalance <= 0 || perWeek <= 0)
      return { fundMonthlyCost: monthly, fundMonths: 0, fundCoversUntil: null };
    const days = Math.floor((fundBalance / perWeek) * 7);
    const until = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return {
      fundMonthlyCost: monthly,
      fundMonths: Math.floor((fundBalance / monthly) * 10) / 10,
      fundCoversUntil: until,
    };
  }

  /**
   * Поточний місяць (за локальною датою батька/матері): уже створені дні беруться з їхньою зафіксованою ставкою,
   * майбутні заплановані — за поточною ставкою сім'ї. Минулі дні без запису (до реєстрації/зміни плану) не рахуються.
   */
  async computeMonth(
    family: Family,
    today: string,
  ): Promise<
    Pick<
      FamilyStatsResponseDto,
      'monthFund' | 'monthEarned' | 'monthPlannedDays' | 'monthCompletedDays'
    >
  > {
    const days = daysInMonth(today.slice(0, 7));
    const rows = await this.sessions.find({
      where: { familyId: family.id, date: Between(days[0], days[days.length - 1]) },
      select: { date: true, status: true, rate: true, earned: true },
    });
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const upcoming = days.filter(
      (d) => d >= today && !byDate.has(d) && family.planDays.includes(isoWeekdayOf(d)),
    );
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      monthFund: round(rows.reduce((sum, r) => sum + r.rate, 0) + upcoming.length * family.rate),
      monthEarned: round(rows.reduce((sum, r) => sum + r.earned, 0)),
      monthPlannedDays: rows.length + upcoming.length,
      monthCompletedDays: rows.filter((r) => r.status === SessionStatus.COMPLETED).length,
    };
  }

  /**
   * Серія = запланованих днів поспіль зі статусом completed від останнього завершеного/сьогодні.
   * Записи існують лише для запланованих днів (closePastDays), тому незаплановані дні пропускаються самі;
   * сьогоднішній незавершений день серію не переривається.
   */
  async computeStreak(familyId: string, today: string): Promise<number> {
    // Один SQL (замість читання до 400 рядків): completed-дні після останнього «розриву» —
    // будь-якого незавершеного дня, крім сьогоднішнього відкритого. Індекс (family_id, status, date).
    const rows: Array<{ streak: number }> = await this.sessions.query(
      `SELECT count(*)::int AS streak
         FROM day_sessions
        WHERE family_id = $1
          AND status = $2
          AND date > COALESCE(
            (SELECT max(date) FROM day_sessions
              WHERE family_id = $1
                AND status <> $2
                AND NOT (date = $3 AND status IN ($4, $5))),
            '-infinity'::date)`,
      [familyId, SessionStatus.COMPLETED, today, SessionStatus.PENDING, SessionStatus.IN_PROGRESS],
    );
    return rows[0]?.streak ?? 0;
  }
}
