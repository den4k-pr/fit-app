/** Стан клітинки календаря: completed ✓, missed ✗, in_progress, pending (сьогодні ще не виконано), planned (майбутній запланований), rest (день відпочинку). */
export enum CalendarDayStatus {
  COMPLETED = 'completed',
  MISSED = 'missed',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  PLANNED = 'planned',
  REST = 'rest',
}
