import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Каталог застосунку = ЛИШЕ вправи з демо-роликами (`mobile/assets/video`). У продакшн-БД могли лишитися
 * активними старі вправи (дихання, розтяжка тощо) із seed-наборів, що існували до впровадження
 * «відео-каталогу» (`ExercisesSeeder`/`ALL_EXERCISES_SEED`). Ця міграція детерміновано вимикає їх
 * незалежно від стану БД і перераховує сьогоднішні незавершені дні (знімок `day_sessions.exercise_ids`
 * інакше лишив би «неправильні» вправи на цілий день).
 */
const VIDEO_SLUGS = [
  'squat',
  'push-up',
  'forward-lunge',
  'wall-sit',
  'plank',
  'crunch',
  'mountain-climber',
  'jumping-jacks',
  'high-knees',
  'burpee',
] as const;

const IN_LIST = VIDEO_SLUGS.map((s) => `'${s}'`).join(', ');

export class VideoOnlyCatalog1791400000000 implements MigrationInterface {
  name = 'VideoOnlyCatalog1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) каталог — лише відео-вправи
    await queryRunner.query(
      `UPDATE "exercises" SET "is_active" = false WHERE "slug" NOT IN (${IN_LIST})`,
    );
    await queryRunner.query(
      `UPDATE "exercises" SET "is_active" = true WHERE "slug" IN (${IN_LIST})`,
    );
    // 2) сьогоднішні/майбутні НЕзавершені дні скидаємо, щоб вони перерахувалися з виправленим каталогом.
    //    `ledger_entries` і `exercise_records` каскадно видаляються (onDelete CASCADE) — гроші не «зависають».
    await queryRunner.query(
      `DELETE FROM "day_sessions" WHERE "date" >= CURRENT_DATE AND "status" IN ('pending', 'in_progress')`,
    );
  }

  public async down(): Promise<void> {
    // Необоротно: вимкнені вправи не повертаємо (каталог свідомо лишається «відео-лише»).
  }
}
