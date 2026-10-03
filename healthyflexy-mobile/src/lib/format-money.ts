import { CURRENCY_SYMBOL, CURRENCY_SYMBOL_POSITION } from '@/constants/currencies';
import type { Currency, Money } from '@/types';

/** 5 → «5», 7.5 → «7,5» (за локаллю), 87.3 → «87,3». Без зайвих нулів. */
export function formatAmount(amount: Money, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
}

/** €5 / 7,5 zł. Символ ліворуч для EUR, праворуч для PLN. */
export function formatMoney(amount: Money, currency: Currency, locale: string): string {
  const value = formatAmount(amount, locale);
  const symbol = CURRENCY_SYMBOL[currency];
  return CURRENCY_SYMBOL_POSITION[currency] === 'prefix' ? `${symbol}${value}` : `${value} ${symbol}`;
}

/** +€5 / −€30 для журналу */
export function formatSignedMoney(amount: Money, currency: Currency, locale: string, sign: '+' | '−'): string {
  return `${sign}${formatMoney(amount, currency, locale)}`;
}
