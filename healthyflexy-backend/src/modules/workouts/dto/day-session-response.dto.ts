import { SessionStatus } from '../../../common/enums';

export class DaySessionResponseDto {
  id: string;

  /** Локальна дата батька/матері, YYYY-MM-DD */
  date: string;
  status: SessionStatus;
  exercisesTotal: number;
  exercisesDone: number;

  /** Ставка, зафіксована на момент створення дня */
  rate: number;

  /** = rate для completed, інакше 0 */
  earned: number;
  completedAt: Date | null;
}
