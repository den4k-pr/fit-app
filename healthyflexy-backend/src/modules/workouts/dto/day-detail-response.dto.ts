import { DaySessionResponseDto } from './day-session-response.dto';
import { ExerciseRecordResponseDto } from './exercise-record-response.dto';

/**
 * GET /workouts/days/:date: обидві ролі (дитина — з кадрами, батько/мати — деталі запису журналу).
 * `session: null` — на цю дату ще не було жодного запису (новий акаунт, день поза планом
 * тощо) — нормальний стан, а не помилка; завжди 200, ніколи 404.
 */
export class DayDetailResponseDto {
  session: DaySessionResponseDto | null;
  records: ExerciseRecordResponseDto[];
}
