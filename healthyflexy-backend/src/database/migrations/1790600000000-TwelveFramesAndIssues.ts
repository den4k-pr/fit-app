import { MigrationInterface, QueryRunner } from 'typeorm';

/** До 12 кадрів на вправу; у спробі — перелік проблем за часом («на 8–12 с не видно ніг»). */
export class TwelveFramesAndIssues1790600000000 implements MigrationInterface {
  name = 'TwelveFramesAndIssues1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 12)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" ADD COLUMN IF NOT EXISTS "issues" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exercise_attempt_logs" DROP COLUMN IF EXISTS "issues"`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 6) NOT VALID`,
    );
  }
}
