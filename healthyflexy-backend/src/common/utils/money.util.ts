/** Уся арифметика грошей — в центах (цілі числа), щоб уникнути похибок float. Суми в БД — numeric(_, 2). */
export const toCents = (amount: number): number => Math.round(amount * 100);
export const fromCents = (cents: number): number => cents / 100;
export const roundMoney = (amount: number): number => fromCents(toCents(amount));
