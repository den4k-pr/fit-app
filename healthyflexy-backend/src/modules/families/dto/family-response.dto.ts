import {
  Currency,
  ExerciseMode,
  RelationshipType,
  UserRole,
  WorkoutType,
} from '../../../common/enums';

/** Друга сторона сім'ї (телефон не віддаємо) */
export class FamilyMemberDto {
  id: string;
  name: string | null;
  role: UserRole;

  /** Підписане посилання на фото-аватар; null — емодзі за роллю/спорідненістю */
  avatarUrl: string | null;
}

/** GET /families/current */
export class FamilyResponseDto {
  id: string;
  relationship: RelationshipType;

  /** Як дитина називає батька/матір у перемикачі («Мама»); null — ім'я з профілю */
  parentLabel: string | null;

  /** Ставка за день, напр. 5 або 7.5 */
  rate: number;
  currency: Currency;

  /** ISO-дні занять: 1 = Пн … 7 = Нд */
  planDays: number[];

  /** 'HH:mm' */
  reminderTime: string;

  /** «Види навантаження», що входять у день */
  workoutTypes: WorkoutType[];

  /** «Час тренування», хв (без урахування ходьби) */
  workoutMinutes: number;

  /** «Автоускладнення» */
  autoProgression: boolean;
  progressionPct: number;

  /** Підбір вправ: ШІ або відмічені спонсором */
  exerciseMode: ExerciseMode;

  /** Відмічені спонсором вправи (режим `manual`) */
  selectedExerciseIds: string[];

  /** Рівень 1–5 (за досягнутим множником автоускладнення) */
  level: number;

  /** Роль того, хто робить запит */
  myRole: UserRole;

  /** Друга сторона */
  counterpart: FamilyMemberDto;
  createdAt: Date;
}
