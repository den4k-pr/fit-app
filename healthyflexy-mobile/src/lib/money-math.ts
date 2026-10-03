import type { Money } from '@/types';

/** Лише для підказок в UI («доступно для переказу»). Справжній баланс і межі перевіряє сервер. */
export const subMoney = (a: Money, b: Money): Money => Math.round((a - b) * 100) / 100;
