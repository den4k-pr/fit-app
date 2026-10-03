import { Check, Column, Entity, Index } from 'typeorm';
import { ExerciseCategory, VoicePattern, WorkoutType } from '../../../common/enums';
import { BodyImpact, LocalizedText } from '../../../common/types';
import { UpdatableEntity } from '../../../database/base.entity';

/**
 * Довідник вправ (розділ 10). Змінюється seed-ом (при старті) і в CRM (після цього seed рядок не чіпає).
 * День = усі активні вправи за `sortOrder`; алгоритму добору у v1 немає.
 */
@Entity({ name: 'exercises' })
@Index('UQ_exercises_slug', ['slug'], { unique: true })
@Index('IDX_exercises_active_order', ['isActive', 'sortOrder'])
@Check(
  'CHK_exercises_target',
  `"target_reps" IS NOT NULL OR "target_seconds" IS NOT NULL OR "target_steps" IS NOT NULL`,
)
@Check('CHK_exercises_record_max', `"record_max_sec" >= 5 AND "record_max_sec" <= 120`)
export class Exercise extends UpdatableEntity {
  /** Стабільний ключ, напр. 'chair-squat' */
  @Column({ type: 'varchar', length: 50 })
  slug: string;

  @Column({ type: 'int' })
  sortOrder: number;

  @Column({ type: 'enum', enum: ExerciseCategory, enumName: 'exercise_category' })
  category: ExerciseCategory;

  /** { uk, pl, en } */
  @Column({ type: 'jsonb' })
  name: LocalizedText;

  /** Кількість повторень (або null, якщо вправа на час) */
  @Column({ type: 'int', nullable: true })
  targetReps: number | null;

  /** Тривалість у секундах (або null, якщо вправа на повторення) */
  @Column({ type: 'int', nullable: true })
  targetSeconds: number | null;

  /** Кількість кроків (вправа на крокомір; фото не робляться) або null */
  @Column({ type: 'int', nullable: true })
  targetSteps: number | null;

  /** Ліміт відеозапису: 30 або 60 с */
  @Column({ type: 'int', default: 30 })
  recordMaxSec: number;

  /** URL демо-відео (публічний bucket/CDN). null → у застосунку заглушка */
  @Column({ type: 'varchar', length: 500, nullable: true })
  demoVideoUrl: string | null;

  /** Короткий текст «⚡ Користь»: { uk, pl, en } */
  @Column({ type: 'jsonb' })
  benefit: LocalizedText;

  /** Детальний опис вправи: { uk, pl, en }. null для старих записів довідника. */
  @Column({ type: 'jsonb', nullable: true })
  description: LocalizedText | null;

  /** Інструкція безпеки, показується перед стартом вправи: { uk, pl, en } */
  @Column({ type: 'jsonb', name: 'safety_instructions', nullable: true })
  safetyInstructions: LocalizedText | null;

  /** Нелокалізований опис критеріїв правильної форми — йде в промпт AI-аналізу, користувачу не показується */
  @Column({ type: 'text', name: 'ai_criteria', nullable: true })
  aiCriteria: string | null;

  /** Джерело (англійською, мова оригіналу) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceTitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;

  /** Види навантаження (фільтр «План → Види навантаження»); порожньо = вправа входить завжди */
  @Column({ type: 'text', array: true, name: 'workout_types', default: () => `'{}'` })
  workoutTypes: WorkoutType[];

  /** Орієнтовна тривалість, хв (бюджет «Час тренування»; вправи на кроки в бюджет не входять) */
  @Column({ type: 'smallint', name: 'duration_min', default: 3 })
  durationMin: number;

  /** «Вплив на організм» 0–100 за системами; null — не показується */
  @Column({ type: 'jsonb', name: 'body_impact', nullable: true })
  bodyImpact: BodyImpact | null;

  /** Задіяні м'язи: [{ uk, pl, en, ru }, …] */
  @Column({ type: 'jsonb', nullable: true })
  muscles: LocalizedText[] | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Група різновидів (напр. 'squat'): на місці такої вправи в програмі день у день чергуються активні вправи
   * тієї ж групи — присідання → сумо → присідання з підйомом на носки. null — вправа не чергується.
   */
  @Column({ type: 'varchar', length: 40, name: 'variant_group', nullable: true })
  variantGroup: string | null;

  /** Ритм голосового супроводу (фази руху, рахунок); null — застосунок вибирає за категорією */
  @Column({ type: 'varchar', length: 20, name: 'voice_pattern', nullable: true })
  voicePattern: VoicePattern | null;

  /** Змінено в CRM: seed при старті більше не перезаписує цей рядок */
  @Column({ type: 'boolean', name: 'managed_by_admin', default: false })
  managedByAdmin: boolean;
}
