import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Відповідність макету «index.html»:
 *  • каталог вправ: види навантаження, тривалість, «вплив на організм», м'язи;
 *  • сім'я: підпис батька/матері (кілька батьків у дитини), види навантаження, час тренування, автоускладнення;
 *  • запрошення: стартова ставка й підпис;
 *  • день: знімок складу вправ;
 *  • нарахування за КОЖНУ вправу (earn прив'язаний до exercise_record);
 *  • фото-аватари; кроки за день (графік активності).
 */
export class MockupParity1790500000000 implements MigrationInterface {
  name = 'MockupParity1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── каталог вправ ──
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "workout_types" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "duration_min" smallint NOT NULL DEFAULT 3`,
    );
    await queryRunner.query(`ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "body_impact" jsonb`);
    await queryRunner.query(`ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "muscles" jsonb`);

    // ── сім'я ──
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "parent_label" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "workout_types" text array NOT NULL DEFAULT '{strength,cardio,morning,stretch,warmup,breathing,walking,meditation,coordination}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "workout_minutes" smallint NOT NULL DEFAULT 20`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "auto_progression" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "progression_pct" smallint NOT NULL DEFAULT 5`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "progression_start_date" date`,
    );
    // наявні сім'ї: без обмеження часу (60 хв), щоб їхній склад дня не змінився непомітно; нові — 20 хв
    await queryRunner.query(`UPDATE "families" SET "workout_minutes" = 60`);
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "CHK_families_workout_minutes" CHECK ("workout_minutes" BETWEEN 5 AND 60)`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "CHK_families_progression_pct" CHECK ("progression_pct" BETWEEN 1 AND 15)`,
    );

    // ── запрошення ──
    await queryRunner.query(`ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "rate" numeric(6,2)`);
    await queryRunner.query(
      `ALTER TABLE "invites" ADD COLUMN IF NOT EXISTS "parent_label" character varying(40)`,
    );

    // ── день: знімок складу ──
    await queryRunner.query(
      `ALTER TABLE "day_sessions" ADD COLUMN IF NOT EXISTS "exercise_ids" uuid array`,
    );

    // ── нарахування за вправу ──
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD COLUMN IF NOT EXISTS "exercise_record_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_ledger_entries_exercise_record" FOREIGN KEY ("exercise_record_id") REFERENCES "exercise_records"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_ledger_entries_one_earn_per_session"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_entries_one_earn_per_record" ON "ledger_entries" ("exercise_record_id") WHERE "type" = 'earn' AND "exercise_record_id" IS NOT NULL`,
    );

    // ── фото-аватар ──
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_key" character varying(200)`,
    );

    // ── кроки за день ──
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "daily_steps" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "date" date NOT NULL, "steps" integer NOT NULL, CONSTRAINT "CHK_daily_steps_range" CHECK ("steps" >= 0 AND "steps" <= 200000), CONSTRAINT "PK_daily_steps" PRIMARY KEY ("id"), CONSTRAINT "FK_daily_steps_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_steps_user_date" ON "daily_steps" ("user_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_steps"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_ledger_entries_one_earn_per_record"`);
    // повернути «один earn на день» можна лише якщо в журналі ще немає нарахувань за окремі вправи
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ledger_entries_one_earn_per_session" ON "ledger_entries" ("session_id") WHERE "type" = 'earn'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT IF EXISTS "FK_ledger_entries_exercise_record"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP COLUMN IF EXISTS "exercise_record_id"`,
    );
    await queryRunner.query(`ALTER TABLE "day_sessions" DROP COLUMN IF EXISTS "exercise_ids"`);
    await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN IF EXISTS "parent_label"`);
    await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN IF EXISTS "rate"`);
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT IF EXISTS "CHK_families_progression_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT IF EXISTS "CHK_families_workout_minutes"`,
    );
    for (const column of [
      'progression_start_date',
      'progression_pct',
      'auto_progression',
      'workout_minutes',
      'workout_types',
      'parent_label',
    ]) {
      await queryRunner.query(`ALTER TABLE "families" DROP COLUMN IF EXISTS "${column}"`);
    }
    for (const column of ['muscles', 'body_impact', 'duration_min', 'workout_types']) {
      await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}
