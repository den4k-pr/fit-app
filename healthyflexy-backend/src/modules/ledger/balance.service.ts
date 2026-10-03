import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { fromCents } from '../../common/utils/money.util';

export interface Balance {
  earnedTotal: number;
  settledTotal: number;
  pendingTotal: number;
  /** earn − confirmed settlements: скільки дитина винна батьку/матері */
  owed: number;
}

export interface FundBalance {
  /** Усього закладено у фонд */
  fundDeposited: number;
  /** Залишок фонду: поповнення − нарахування з моменту першого поповнення (не менше 0) */
  fundBalance: number;
}

/**
 * Баланс лише через SQL-агрегати (SUM) над ledger_entries (ТЗ §8.5). Ніякого лічильника в БД: він не може «розійтися».
 * Приймає EntityManager, щоб читати баланс усередині тієї ж транзакції, що й запис (створення переказу).
 */
@Injectable()
export class BalanceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getBalance(
    familyId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<Balance> {
    const rows: Array<{ earned: string; settled: string; pending: string }> = await manager.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'earn'), 0) AS earned,
         COALESCE(SUM(amount) FILTER (WHERE type = 'settlement' AND status = 'confirmed'), 0) AS settled,
         COALESCE(SUM(amount) FILTER (WHERE type = 'settlement' AND status = 'pending'), 0) AS pending
       FROM ledger_entries WHERE family_id = $1`,
      [familyId],
    );
    const cents = (value: string) => Math.round(Number(value) * 100);
    const earned = cents(rows[0].earned);
    const settled = cents(rows[0].settled);
    return {
      earnedTotal: fromCents(earned),
      settledTotal: fromCents(settled),
      pendingTotal: fromCents(cents(rows[0].pending)),
      owed: fromCents(earned - settled),
    };
  }

  /**
   * Реальні гроші сім'ї на рахунку платформи (Stripe): успішні оплати фонду мінус виплати батькові через Stripe
   * (у т.ч. ще не завершені). Виплатити через Stripe можна не більше цієї суми — облікові поповнення не рахуються.
   */
  async getHeldFunds(
    familyId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<number> {
    const rows: Array<{ paid: string; out: string }> = await manager.query(
      `SELECT
         (SELECT COALESCE(SUM(amount), 0) FROM fund_deposits
           WHERE family_id = $1 AND provider = 'stripe' AND status = 'succeeded') AS paid,
         (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries
           WHERE family_id = $1 AND type = 'settlement' AND method = 'stripe'
             AND status IN ('pending', 'confirmed')) AS out`,
      [familyId],
    );
    const cents = (value: string | undefined) => Math.round(Number(value ?? 0) * 100);
    return fromCents(Math.max(0, cents(rows[0]?.paid) - cents(rows[0]?.out)));
  }

  /** «Фонд»: один SQL — сума поповнень і нарахування, зроблені після першого поповнення */
  async getFund(
    familyId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<FundBalance> {
    const rows: Array<{ deposited: string; spent: string }> = await manager.query(
      `WITH d AS (
         SELECT COALESCE(SUM(amount), 0) AS deposited, MIN(created_at) AS first_at
           FROM fund_deposits WHERE family_id = $1 AND status = 'succeeded'
       )
       SELECT d.deposited,
              COALESCE((SELECT SUM(l.amount) FROM ledger_entries l
                         WHERE l.family_id = $1 AND l.type = 'earn' AND d.first_at IS NOT NULL
                           AND l.created_at >= d.first_at), 0) AS spent
         FROM d`,
      [familyId],
    );
    const cents = (value: string | undefined) => Math.round(Number(value ?? 0) * 100);
    const deposited = cents(rows[0]?.deposited);
    const spent = cents(rows[0]?.spent);
    return {
      fundDeposited: fromCents(deposited),
      fundBalance: fromCents(Math.max(0, deposited - spent)),
    };
  }
}
