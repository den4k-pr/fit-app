import { MigrationInterface, QueryRunner } from 'typeorm';

/** Розкадровка: до 24 кадрів на вправу (AI бачить їх у сітках і оцінює рух відрізками часу). */
export class StoryboardFrames1790700000000 implements MigrationInterface {
  name = 'StoryboardFrames1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 24)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT IF EXISTS "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 12) NOT VALID`,
    );
  }
}
