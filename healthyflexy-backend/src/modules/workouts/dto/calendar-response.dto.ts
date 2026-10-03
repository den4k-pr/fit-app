import { CalendarDayStatus } from '../../../common/enums';

export class CalendarDayDto {
  /** YYYY-MM-DD */
  date: string;
  status: CalendarDayStatus;
  exercisesDone: number;
  exercisesTotal: number;
}

/** GET /workouts/calendar: обидві ролі (сторінка «Історія» / календар дашборда) */
export class CalendarResponseDto {
  /** YYYY-MM */
  month: string;

  /** Сьогодні за часовим поясом батька/матері, YYYY-MM-DD (для виділення клітинки) */
  todayDate: string;

  /** Усі дні місяця по порядку */
  days: CalendarDayDto[];
}
