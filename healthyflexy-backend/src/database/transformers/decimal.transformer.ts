import { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric` драйвер `pg` повертає рядком ("5.00"), щоб не втратити точність.
 * Для сум ≤ 99 999.99 `number` достатньо, але ПІДСУМОВУВАТИ гроші треба в SQL (SUM),
 * а не складанням float у JS. Для проміжних обчислень використовуйте `src/common/utils/money.util.ts`.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number.parseFloat(value),
};
