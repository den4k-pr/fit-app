import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Підтвердження пошти: `users.email_verified_at`. Усі наявні акаунти з поштою входили лише через код із листа
 * (тестові адреси з фіксованим кодом — `@example.com`, на них лист не приходив), тож їм ставимо дату підтвердження
 * = дату створення; тестовим `@example.com` — ні.
 */
export class EmailVerification1791200000000 implements MigrationInterface {
  name = 'EmailVerification1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" timestamptz`);
    await queryRunner.query(
      `UPDATE "users" SET "email_verified_at" = "created_at"
        WHERE "email" IS NOT NULL AND "email" NOT LIKE '%@example.com'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
  }
}
