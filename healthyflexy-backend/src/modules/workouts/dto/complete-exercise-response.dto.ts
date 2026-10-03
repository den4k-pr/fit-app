import { DaySessionResponseDto } from './day-session-response.dto';
import { ExerciseRecordResponseDto } from './exercise-record-response.dto';

export class AttemptIssueDto {
  /** Відрізок вправи в секундах */
  fromSec: number;
  toSec: number;
  /** Що саме було не так (українською, без згадки про кадри) */
  reason: string;
}

export class AttemptResultDto {
  score: number;
  isCorrect: boolean;
  feedback: string;
  recommendations: string;
  /** Проблеми за часом виконання (порожньо, якщо все добре) */
  issues: AttemptIssueDto[];
}

/**
 * `accepted: false` — AI відхилив спробу (isCorrect=false або score нижче порогу): вправу НЕ зараховано,
 * `record`/`session`/`dayCompleted`/`earned` відсутні, клієнт показує `attempt` і пропонує повторити.
 */
export class CompleteExerciseResponseDto {
  accepted: boolean;

  record?: ExerciseRecordResponseDto;
  session?: DaySessionResponseDto;

  /** true, якщо це була остання вправа й день зараховано */
  dayCompleted?: boolean;

  /** Нараховано цим викликом: частка денної ставки за цю вправу (сума за день = ставка) */
  earned?: number;

  /** Результат AI-аналізу (присутній, коли AI реально аналізував фото цієї спроби) */
  attempt?: AttemptResultDto;
}
