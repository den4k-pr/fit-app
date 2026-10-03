import { ParentDayState } from '../../../common/enums';

/** GET /families/current/parent-status: лише role=child. Оновлюється в реальному часі (Realtime). */
export class ParentStatusResponseDto {
  state: ParentDayState;
  parentName: string | null;

  /** Як дитина називає батька/матір (null — ім'я з профілю) */
  parentLabel: string | null;

  /** Підписане посилання на фото-аватар батька/матері */
  parentAvatarUrl: string | null;

  /** Локальна дата батька/матері (YYYY-MM-DD) */
  localDate: string;
  exercisesDone: number;
  exercisesTotal: number;

  /** Остання дата зі статусом completed → «Останнє тренування: вчора» */
  lastCompletedDate: string | null;

  /** false, якщо день виконано / день відпочинку / ще діє ліміт */
  canRemind: boolean;

  /** Коли можна нагадати знову (null — вже можна або не застосовується) */
  nextReminderAllowedAt: Date | null;
}
