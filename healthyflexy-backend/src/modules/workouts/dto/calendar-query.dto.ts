import { Matches } from 'class-validator';
import { YEAR_MONTH_REGEX } from '../../../common/constants';

/** GET /workouts/calendar?month=2026-09 */
export class CalendarQueryDto {
  @Matches(YEAR_MONTH_REGEX, { message: 'month must be YYYY-MM' })
  month: string;
}
