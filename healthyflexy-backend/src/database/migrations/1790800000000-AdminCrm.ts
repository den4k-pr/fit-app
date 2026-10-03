import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CRM: налаштування застосунку (палітра, тексти, ліміти), блокування користувачів,
 * позначка «змінено в адмінці» (seed більше не перезаписує такі вправи/пресети), архів пресетів.
 */
export class AdminCrm1790800000000 implements MigrationInterface {
  name = 'AdminCrm1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_config" (
        "id" integer NOT NULL,
        "theme" jsonb,
        "content" jsonb NOT NULL DEFAULT '{}',
        "limits" jsonb NOT NULL DEFAULT '{}',
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_config" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_app_config_single" CHECK ("id" = 1)
      )`);
    await queryRunner.query(`ALTER TABLE "users" ADD "blocked_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD "managed_by_admin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "programs" ADD "managed_by_admin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "programs" ADD "archived_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programs" DROP COLUMN "archived_at"`);
    await queryRunner.query(`ALTER TABLE "programs" DROP COLUMN "managed_by_admin"`);
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN "managed_by_admin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blocked_at"`);
    await queryRunner.query(`DROP TABLE "app_config"`);
  }
}
