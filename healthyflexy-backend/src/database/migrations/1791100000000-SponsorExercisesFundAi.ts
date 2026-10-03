import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Правки після тестування (жовтень 2026):
 *  • «Підбір вправ ШІ» / власний список вправ спонсора: `families.exercise_mode` ('ai' | 'manual', за замовчуванням ai —
 *    і для вже наявних сімей) та `families.selected_exercise_ids`; час тренування за замовчуванням — 15 хв;
 *  • темп автоускладнення — до 100 % на тиждень (було 1–15);
 *  • пропуск вправи без оплати: `exercise_records.skipped`;
 *  • «Фонд»: поповнення фонду спонсором — окрема таблиця `fund_deposits` (облік, як і ledger; реальні гроші не рухаються);
 *  • літера «ё» прибирається з текстів у БД (вправи, програми, тексти екранів із CRM): «ё» → «е», «Ё» → «Е».
 */

/** jsonb-колонки з текстами для користувача */
const TEXT_COLUMNS: Array<[table: string, column: string]> = [
  ['exercises', 'name'],
  ['exercises', 'benefit'],
  ['exercises', 'description'],
  ['exercises', 'safety_instructions'],
  ['exercises', 'muscles'],
  ['programs', 'name'],
  ['programs', 'description'],
  ['programs', 'highlights'],
  ['app_config', 'content'],
];
export class SponsorExercisesFundAi1791100000000 implements MigrationInterface {
  name = 'SponsorExercisesFundAi1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "families" ADD "exercise_mode" varchar(10) NOT NULL DEFAULT 'ai'`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "CHK_families_exercise_mode" CHECK ("exercise_mode" IN ('ai', 'manual'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD "selected_exercise_ids" uuid array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "families" ALTER COLUMN "workout_minutes" SET DEFAULT 15`);
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT IF EXISTS "CHK_families_progression_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "CHK_families_progression_pct" CHECK ("progression_pct" BETWEEN 1 AND 100)`,
    );

    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD "skipped" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      CREATE TABLE "fund_deposits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "family_id" uuid NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" "currency_code" NOT NULL,
        "created_by_id" uuid,
        CONSTRAINT "PK_fund_deposits" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_fund_deposits_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_fund_deposits_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fund_deposits_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_fund_deposits_family_created" ON "fund_deposits" ("family_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fund_deposits_created_by" ON "fund_deposits" ("created_by_id")`,
    );

    // «ё» → «е» у всіх текстах (jsonb::text у PostgreSQL виводить кирилицю як є, без \u-екранування)
    for (const [table, column] of TEXT_COLUMNS) {
      await queryRunner.query(
        `UPDATE "${table}" SET "${column}" = replace(replace("${column}"::text, 'ё', 'е'), 'Ё', 'Е')::jsonb
          WHERE "${column}" IS NOT NULL AND "${column}"::text ~ '[ёЁ]'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "fund_deposits"`);
    await queryRunner.query(`ALTER TABLE "exercise_records" DROP COLUMN "skipped"`);
    await queryRunner.query(
      `UPDATE "families" SET "progression_pct" = LEAST("progression_pct", 15)`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT IF EXISTS "CHK_families_progression_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "CHK_families_progression_pct" CHECK ("progression_pct" BETWEEN 1 AND 15)`,
    );
    await queryRunner.query(`ALTER TABLE "families" ALTER COLUMN "workout_minutes" SET DEFAULT 20`);
    await queryRunner.query(`ALTER TABLE "families" DROP COLUMN "selected_exercise_ids"`);
    await queryRunner.query(`ALTER TABLE "families" DROP CONSTRAINT "CHK_families_exercise_mode"`);
    await queryRunner.query(`ALTER TABLE "families" DROP COLUMN "exercise_mode"`);
  }
}
