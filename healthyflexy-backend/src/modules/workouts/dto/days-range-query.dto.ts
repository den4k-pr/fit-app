import { Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** GET /workouts/days?from=2026-09-24&to=2026-09-30 (до 31 дня) */
export class DaysRangeQueryDto {
  @Matches(ISO_DATE, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @Matches(ISO_DATE, { message: 'to must be YYYY-MM-DD' })
  to: string;
}
