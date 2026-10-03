import { MigrationInterface, QueryRunner } from 'typeorm';

/** Відео → кадри: `exercise_records.video_*` замінюється на `photo_keys[]` + строки зберігання. */
export class PhotosInsteadOfVideo1789900000000 implements MigrationInterface {
  name = 'PhotosInsteadOfVideo1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_exercise_records_video_expiry"`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "CHK_exercise_records_video_size"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "CHK_exercise_records_video_expiry"`,
    );
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "video_key"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "video_size_bytes"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "video_content_type"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "video_expires_at"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "video_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "photo_keys" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "photos_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "photos_deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_max" CHECK (cardinality("photo_keys") <= 3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_photos_expiry" CHECK (cardinality("photo_keys") = 0 OR "photos_expires_at" IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_records_photos_expiry" ON "exercise_records" ("photos_expires_at") WHERE "photos_deleted_at" IS NULL AND cardinality("photo_keys") > 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_exercise_records_photos_expiry"`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "CHK_exercise_records_photos_expiry"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "CHK_exercise_records_photos_max"`,
    );
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "photos_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "photos_expires_at"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "photo_keys"`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "video_deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "video_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "video_content_type" character varying(50)`,
    );
    await queryRunner.query(`ALTER TABLE "exercise_records" ADD "video_size_bytes" integer`);
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "video_key" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_video_expiry" CHECK ("video_key" IS NULL OR "video_expires_at" IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "CHK_exercise_records_video_size" CHECK ("video_size_bytes" IS NULL OR "video_size_bytes" > 0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_records_video_expiry" ON "exercise_records" ("video_expires_at") WHERE "video_deleted_at" IS NULL AND "video_key" IS NOT NULL`,
    );
  }
}
