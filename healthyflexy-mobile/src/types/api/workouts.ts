import type {
  CalendarDayStatus,
  Currency,
  ExerciseCategory,
  ExerciseMode,
  ExerciseState,
  SessionStatus,
  VoicePattern,
  WorkoutType,
} from '../enums';
import type { ISODate, ISODateTime, Money, YearMonth } from '../common';

export interface DaySession {
  id: string;
  date: ISODate;
  status: SessionStatus;
  exercisesTotal: number;
  exercisesDone: number;
  /** ставка, зафіксована на момент створення дня */
  rate: Money;
  /** = rate для completed, інакше 0 */
  earned: Money;
  completedAt: ISODateTime | null;
}

export interface TodayExercise {
  exerciseId: string;
  slug: string;
  sortOrder: number;
  category: ExerciseCategory;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  /** Вправа на кроки (крокомір): ціль у кроках; null — вправа з камерою */
  targetSteps: number | null;
  recordMaxSec: number;
  demoVideoUrl: string | null;
  benefit: string;
  /** Як виконувати (техніка); null — опису немає */
  description: string | null;
  /** Ритм голосового супроводу; null — за категорією */
  voicePattern: VoicePattern | null;
  /** Показати перед стартом вправи (гериатричний модуль); null — без інструкції безпеки */
  safetyInstructions: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  /** done ✓ / skipped (без оплати) / current «Старт» (будь-яка невиконана — порядок не важливий) / locked 🔒 (день закрито) */
  state: ExerciseState;
  recordId: string | null;
  /** «Вплив на організм», м'язи, тривалість */
  info: ExerciseInfo;
}

/** GET /workouts/today (лише батько/мати) */
export interface Today {
  localDate: ISODate;
  /** true → день відпочинку: session = null, exercises = [] */
  restDay: boolean;
  nextPlanDate: ISODate | null;
  session: DaySession | null;
  exercises: TodayExercise[];
  streak: number;
  owed: Money;
  currency: Currency;
  rate: Money;
  /** false → дитина ще не призначила сім'ї жодної програми (порожній «Сьогодні» ≠ помилка) */
  hasActiveProgram: boolean;
  programName: string | null;
  /** Як складено день: підбір ШІ чи відмічені спонсором вправи / програма */
  exerciseMode?: ExerciseMode;
}

/** Один кадр, який клієнт збирається завантажити (стиснений JPEG ~150 КБ) */
export interface PhotoFrame {
  /** image/jpeg */
  contentType: string;
  sizeBytes: number;
}

/** POST /workouts/uploads: підписані URL для 1–24 кадрів (порядок = порядок кадрів) */
export interface CreateUploadUrlRequest {
  sessionId: string;
  exerciseId: string;
  frames: PhotoFrame[];
}

export interface PhotoUploadTarget {
  /** передати в complete у photoKeys (в тому ж порядку) */
  photoKey: string;
  /** підписаний PUT-URL: локальне сховище сервера або S3/R2 напряму; клієнту різниці немає */
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface UploadUrlResponse {
  uploads: PhotoUploadTarget[];
  expiresInSeconds: number;
  maxBytes: number;
}

/** POST /workouts/:sessionId/exercises/:exerciseId/complete */
export interface CompleteExerciseRequest {
  /** ключі завантажених кадрів (4–6 для вправи з камерою); порожньо — вправа на кроки */
  photoKeys: string[];
  /** секунда вправи кожного кадру (для пояснення відмови за часом) */
  frameTimes?: number[];
  /** лише для вправ на кроки: скільки кроків нарахував крокомір */
  steps?: number;
}

export interface ExerciseRecord {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseSlug: string;
  exerciseName: string;
  /** 0 → вправа на кроки */
  photoCount: number;
  /** вправа на кроки: скільки нарахував крокомір; null — вправа з камерою */
  steps: number | null;
  photosExpiresAt: ISODateTime | null;
  /** true → «Фото видалено» (спливли 7 днів) */
  photosDeleted: boolean;
  completedAt: ISODateTime;
  /** true → вправу пропущено (без оплати) */
  skipped?: boolean;
  /** лише в деталях дня: оцінка AI 0–100 («Якість виконання») */
  aiScore?: number | null;
  /** лише в деталях дня */
  info?: ExerciseInfo;
}

/** Відрізок вправи, де щось було не так: «з 8-ї по 12-ту секунду — ноги не піднімалися» */
export interface AttemptIssue {
  fromSec: number;
  toSec: number;
  reason: string;
}

export interface AttemptResult {
  /** проблеми за часом виконання (порожньо, якщо все добре) */
  issues?: AttemptIssue[];
  /** 0-100 */
  score: number;
  isCorrect: boolean;
  feedback: string;
  recommendations: string;
}

export interface AcceptedCompletion {
  accepted: true;
  record: ExerciseRecord;
  session: DaySession;
  /** true → це була остання вправа, день зараховано */
  dayCompleted: boolean;
  /** нараховано цим викликом: частка денної ставки за цю вправу */
  earned: Money;
  /** Результат AI-аналізу цієї спроби (відсутній, коли AI не аналізував: без фото або повторна ідемпотентна відправка) */
  attempt?: AttemptResult;
}

/** AI (гериатричний модуль) відхилив спробу: вправу НЕ зараховано, є лише фідбек AI */
export interface RejectedCompletion {
  accepted: false;
  attempt: AttemptResult;
}

export type CompleteExerciseResponse = AcceptedCompletion | RejectedCompletion;

/** GET /workouts/calendar?month=YYYY-MM */
export interface CalendarQuery {
  month: YearMonth;
}
export interface CalendarDay {
  date: ISODate;
  status: CalendarDayStatus;
  exercisesDone: number;
  exercisesTotal: number;
}
export interface Calendar {
  month: YearMonth;
  /** «сьогодні» за таймзоною батька/матері */
  todayDate: ISODate;
  days: CalendarDay[];
}

/** GET /workouts/days/:date (обидві ролі). session: null — на цю дату ще немає запису (завжди 200, не 404) */
export interface DayDetail {
  session: DaySession | null;
  records: ExerciseRecord[];
}

/** GET /workouts/records/:recordId/photos (лише дитина; 410 PHOTOS_DELETED, 404 PHOTOS_NOT_AVAILABLE) */
export interface PhotoView {
  /** 1–3 */
  index: number;
  /** підписаний GET-URL, діє 1 годину */
  url: string;
}

export interface AttemptSummary {
  score: number;
  feedback: string;
  recommendations: string;
}

export interface PhotosResponse {
  photos: PhotoView[];
  expiresInSeconds: number;
  /** Результат AI-аналізу цієї спроби (null — зараховано без фото, до AI-модуля, або AI вимкнено) */
  attempt: AttemptSummary | null;
}

/** 0–100 за системами («Вплив на організм») */
export interface BodyImpact {
  muscles: number;
  heart: number;
  brain: number;
  bones: number;
  energy: number;
}

/** Довідкові дані вправи для карток макета */
export interface ExerciseInfo {
  category: ExerciseCategory;
  workoutTypes: WorkoutType[];
  durationMin: number;
  bodyImpact: BodyImpact | null;
  muscles: string[];
  sourceTitle: string | null;
  sourceUrl: string | null;
  /** «Користь» мовою користувача */
  benefit: string;
  /** Як виконувати (техніка); null — опису немає */
  description: string | null;
  voicePattern: VoicePattern | null;
  /** Група різновидів: вправи групи чергуються по днях */
  variantGroup: string | null;
}

export interface PlannedExercise {
  exerciseId: string;
  slug: string;
  name: string;
  targetReps: number | null;
  targetSeconds: number | null;
  targetSteps: number | null;
  info: ExerciseInfo;
}

/** GET /workouts/plan/:date — склад дня з «Програми тренувань» */
export interface PlannedDay {
  date: ISODate;
  planned: boolean;
  exercises: PlannedExercise[];
}

export type ActivityPeriod = '7' | '30' | '90' | '180' | '365' | 'all';

export interface ActivityBucket {
  from: ISODate;
  to: ISODate;
  /** середня кількість кроків за день */
  steps: number;
  /** виконаних днів тренувань */
  workouts: number;
  /** запланованих днів тренувань */
  planned: number;
}

/** GET /activity?period= */
export interface Activity {
  period: ActivityPeriod;
  granularity: 'day' | 'week' | 'month';
  buckets: ActivityBucket[];
}
