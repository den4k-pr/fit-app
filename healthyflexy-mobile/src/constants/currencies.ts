import { Currency } from '@/types';

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  [Currency.Eur]: '€',
  [Currency.Pln]: 'zł',
};

/** Символ ставиться перед сумою для EUR (€5) і після для PLN (5 zł) */
export const CURRENCY_SYMBOL_POSITION: Record<Currency, 'prefix' | 'suffix'> = {
  [Currency.Eur]: 'prefix',
  [Currency.Pln]: 'suffix',
};

export const CURRENCIES: readonly Currency[] = [Currency.Eur, Currency.Pln];
