import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Посилена перевірка вправ: до 6 кадрів замість 3; вправи на кроки (крокомір) —
 * `target_steps` у довіднику й програмах, `steps` у виконаному записі.
 */
export class StepsAndMoreFrames1790400000000 implements MigrationInterface {
  name = 'StepsAndMoreFrames1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "target_steps" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercises" DROP CONSTRAINT IF EXISTS "CHK_exercises_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD CONSTRAINT "CHK_exercises_target" CHECK ("target_reps" IS NOT NULL OR "target_seconds" IS NOT NULL OR "target_steps" IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "program_exercises" ADD COLUMN IF NOT EXISTS "target_steps" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD COLUMN IF NOT EXISTS "steps" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 6)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 3) NOT VALID`,
    );
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN IF EXISTS "steps"`);
    await queryRunner.query(`ALTER TABLE "program_exercises" DROP COLUMN IF EXISTS "target_steps"`);
    await queryRunner.query(
      `ALTER TABLE "exercises" DROP CONSTRAINT IF EXISTS "CHK_exercises_target"`,
    );
    // вправи на кроки лишаються в таблиці (на них посилаються записи) — старе обмеження лише для нових рядків
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD CONSTRAINT "CHK_exercises_target" CHECK ("target_reps" IS NOT NULL OR "target_seconds" IS NOT NULL) NOT VALID`,
    );
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN IF EXISTS "target_steps"`);
  }
}
