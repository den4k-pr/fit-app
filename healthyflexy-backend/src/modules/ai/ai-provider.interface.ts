import type { AppLanguage } from '../../common/enums';
import type { StoryboardSheet, TimeWindow } from './storyboard';

export interface AiExerciseInput {
  /** Ім'я вправи (англійською — стабільний контекст для моделі незалежно від мови UI) */
  exerciseName: string;
  exerciseDescription: string | null;
  safetyInstructions: string | null;
  /** Критерії правильної форми (Exercise.aiCriteria) */
  criteria: string | null;
  /**
   * Чи мусить поза помітно змінюватися між кадрами. false — для статичних вправ (дихання),
   * де людина спокійно сидить/стоїть; true — для всіх рухових вправ.
   */
  requiresMovement: boolean;
  /** Розкадровка: кадри, складені в сітки (див. storyboard.ts) */
  sheets: StoryboardSheet[];
  /** Скільки кадрів загалом */
  frameCount: number;
  /** Відрізки часу, які модель оцінює цілком */
  windows: TimeWindow[];
  /** Мова відгуку, порад і причин відмови — мова того, хто виконує вправу */
  language: AppLanguage;
}

/** Відрізок вправи, де щось виконано неправильно: «з 8-ї по 12-ту секунду — не видно ніг» */
export interface AttemptIssue {
  fromSec: number;
  toSec: number;
  reason: string;
}

export interface AiAnalysisResult {
  isCorrect: boolean;
  /** 0-100 */
  score: number;
  feedback: string;
  recommendations: string;
  /** Скільки кадрів модель переглянула */
  framesAnalyzed: number;
  /** Відрізків, у яких рух вправи справді був, і всього відрізків */
  windowsPerformed: number;
  windowsTotal: number;
  /** У скількох кадрах чітко видно людину */
  personVisibleFrames: number;
  /** Поза людини помітно змінюється між кадрами (є рух, а не одне й те саме фото) */
  movementDetected: boolean;
  /** Те, що видно на кадрах, — саме ця вправа (а не інша дія / порожня кімната) */
  matchesExercise: boolean;
  /** Проблеми за часом (сусідні «погані» кадри з однією причиною склеєно в один відрізок) */
  issues: AttemptIssue[];
}

/** Порт для vision-аналізу: реалізації — OpenAI Vision (справжній аналіз) та Stub (dev/тести без ключа). */
export interface AiVisionProvider {
  analyzeExercisePhotos(input: AiExerciseInput): Promise<AiAnalysisResult>;
}
