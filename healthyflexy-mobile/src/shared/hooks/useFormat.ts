import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatLongDate,
  formatMonthTitle,
  formatShortDate,
  formatTime,
  formatWeekday,
  formatWhen,
  intlLocale,
  weekdayNames,
} from '@/lib/format-date';
import { formatAmount, formatMoney } from '@/lib/format-money';
import { AppLanguage, type Currency, type ISODate, type ISODateTime, type Money, type YearMonth } from '@/types';

/** Форматувальники грошей і дат мовою інтерфейсу. Компоненти не викликають Intl/date-fns напряму. */
export function useFormat() {
  const { i18n, t } = useTranslation();
  const language = (i18n.language as AppLanguage) ?? AppLanguage.Uk;
  return useMemo(
    () => ({
      language,
      /** «€5» / «7,5 zł» */
      money: (amount: Money, currency: Currency) => formatMoney(amount, currency, intlLocale(language)),
      /** «7,5» без символу валюти */
      amount: (amount: Money) => formatAmount(amount, intlLocale(language)),
      /** «4 214» — ціле число з розділювачем тисяч (кроки) */
      number: (value: number) => new Intl.NumberFormat(intlLocale(language), { maximumFractionDigits: 0 }).format(value),
      longDate: (date: ISODate) => formatLongDate(date, language),
      shortDate: (date: ISODate) => formatShortDate(date, language),
      weekday: (date: ISODate) => formatWeekday(date, language),
      monthTitle: (month: YearMonth) => formatMonthTitle(month, language),
      time: (iso: ISODateTime) => formatTime(iso),
      when: (iso: ISODateTime, today: ISODate) =>
        formatWhen(iso, today, language, { today: t('common.today'), yesterday: t('common.yesterday') }),
      weekdayNames: (style: 'short' | 'long') => weekdayNames(language, style),
    }),
    [language, t],
  );
}
