import type { ActivityPeriod, LedgerListQuery, YearMonth, ISODate } from '@/types';

/** Фабрика ключів TanStack Query. Інвалідація за префіксом: `queryKeys.family.all`. */
export const queryKeys = {
  me: ['me'] as const,
  family: {
    all: ['family'] as const,
    current: () => ['family', 'current'] as const,
    /** Усі сім'ї (перемикач батьків) — НЕ залежить від обраної сім'ї */
    list: () => ['families-list'] as const,
    stats: () => ['family', 'stats'] as const,
    parentStatus: () => ['family', 'parent-status'] as const,
    activeInvite: () => ['family', 'active-invite'] as const,
  },
  exercises: { all: ['exercises'] as const },
  payments: {
    all: ['payments'] as const,
    config: () => ['payments', 'config'] as const,
    autoTopup: () => ['payments', 'auto-topup'] as const,
    payouts: () => ['payments', 'payouts'] as const,
  },
  workouts: {
    all: ['workouts'] as const,
    today: () => ['workouts', 'today'] as const,
    calendar: (month: YearMonth) => ['workouts', 'calendar', month] as const,
    day: (date: ISODate) => ['workouts', 'day', date] as const,
    plan: (date: ISODate) => ['workouts', 'plan', date] as const,
    photos: (recordId: string) => ['workouts', 'photos', recordId] as const,
    weekPhotos: (today: ISODate) => ['workouts', 'week-photos', today] as const,
  },
  ledger: {
    all: ['ledger'] as const,
    list: (query?: Omit<LedgerListQuery, 'cursor'>) => ['ledger', 'list', query ?? {}] as const,
  },
  activity: (period: ActivityPeriod) => ['activity', period] as const,
  programs: {
    all: ['programs'] as const,
    presets: () => ['programs', 'presets'] as const,
    mine: () => ['programs', 'mine'] as const,
    assignment: () => ['programs', 'assignment'] as const,
  },
} as const;
