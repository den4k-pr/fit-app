import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Вхід за поштою: `users.email`, `users.phone` стає необов'язковим; `otp_codes.phone` → `target` (номер або пошта).
 *
 * ІДЕМПОТЕНТНА: кожен крок перевіряє, чи він уже виконаний. Тому міграція безпечно проходить на базі в будь-якому
 * частковому стані (наприклад, після ручного SQL, що виконався не повністю).
 */
export class EmailAuth1789950000000 implements MigrationInterface {
  name = 'EmailAuth1789950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" character varying(254)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_users_contact' AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "CHK_users_contact" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_otp_codes_phone_created"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'otp_codes' AND column_name = 'phone'
        ) THEN
          ALTER TABLE "otp_codes" RENAME COLUMN "phone" TO "target";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "otp_codes" ALTER COLUMN "target" TYPE character varying(254)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_codes_target_created" ON "otp_codes" ("target", "created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_otp_codes_target_created"`);
    await queryRunner.query(`DELETE FROM "otp_codes" WHERE length("target") > 20`);
    await queryRunner.query(
      `ALTER TABLE "otp_codes" ALTER COLUMN "target" TYPE character varying(20)`,
    );
    await queryRunner.query(`ALTER TABLE "otp_codes" RENAME COLUMN "target" TO "phone"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_otp_codes_phone_created" ON "otp_codes" ("phone", "created_at") `,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "CHK_users_contact"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_users_email"`);
    await queryRunner.query(`DELETE FROM "users" WHERE "phone" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL`);
  }
}
