/**
 * Стан вправи у списку «Сьогодні». Вправи можна виконувати в БУДЬ-ЯКОМУ порядку: усі невиконані — `current`.
 * Невдалу вправу можна пропустити (`skipped`): вона вважається пройденою, але без оплати.
 */
export enum ExerciseState {
  DONE = 'done',
  SKIPPED = 'skipped',
  CURRENT = 'current',
  LOCKED = 'locked',
}
