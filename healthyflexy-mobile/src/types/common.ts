import type { AppLanguage } from './enums';

/** UUID v4 */
export type Uuid = string;

/** ISO-8601 з часом і зсувом: `2026-09-19T08:30:00.000Z` */
export type ISODateTime = string;

/** Локальна дата без часу: `2026-09-19` (день рахується за таймзоною батька/матері) */
export type ISODate = string;

/** Час доби `HH:mm` (24 год) */
export type TimeHHmm = string;

/** Місяць календаря `YYYY-MM` */
export type YearMonth = string;

/** Сума в основних одиницях валюти (5, 7.5). Підсумки рахує сервер — клієнт лише показує. */
export type Money = number;

/** ISO-день тижня: 1 = Пн … 7 = Нд */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Текст усіма мовами (на клієнті приходить уже локалізований рядок; тип для констант) */
export type LocalizedText = Record<AppLanguage, string>;

/** E.164, напр. `+48501234567` */
export type PhoneE164 = string;
