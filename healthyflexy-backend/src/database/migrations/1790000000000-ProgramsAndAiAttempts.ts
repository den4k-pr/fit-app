import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Гериатричний модуль: програми тренувань (замість глобального довідника вправ як джерела «дня»)
 * + журнал AI-спроб (`exercise_attempt_logs`). `exercises` отримує опис/інструкцію безпеки/критерії
 * для AI (nullable — старі записи довідника лишаються валідними) та 2 нові категорії.
 */
export class ProgramsAndAiAttempts1790000000000 implements MigrationInterface {
  name = 'ProgramsAndAiAttempts1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."exercise_category" ADD VALUE IF NOT EXISTS 'joint_mobility'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."exercise_category" ADD VALUE IF NOT EXISTS 'stretch'`,
    );
    await queryRunner.query(`ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "description" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "safety_instructions" jsonb`,
    );
    await queryRunner.query(`ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "ai_criteria" text`);

    await queryRunner.query(
      `CREATE TYPE "public"."program_duration_type" AS ENUM('week', 'month')`,
    );
    await queryRunner.query(
      `CREATE TABLE "programs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "slug" character varying(100), "name" jsonb NOT NULL, "description" jsonb, "duration_type" "public"."program_duration_type" NOT NULL, "is_preset" boolean NOT NULL DEFAULT false, "created_by_id" uuid, CONSTRAINT "PK_programs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_programs_preset" ON "programs" ("is_preset") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_programs_created_by" ON "programs" ("created_by_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_programs_slug" ON "programs" ("slug") WHERE "slug" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "program_exercises" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "program_id" uuid NOT NULL, "exercise_id" uuid NOT NULL, "sort_order" integer NOT NULL, "target_reps" integer, "target_seconds" integer, "plan_days" smallint array NOT NULL DEFAULT '{1,2,3,4,5,6,7}', CONSTRAINT "UQ_program_exercises_program_sort" UNIQUE ("program_id", "sort_order"), CONSTRAINT "PK_program_exercises" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_program_exercises_program" ON "program_exercises" ("program_id") `,
    );

    await queryRunner.query(
      `CREATE TABLE "user_program_assignments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "family_id" uuid NOT NULL, "program_id" uuid NOT NULL, "assigned_by_id" uuid NOT NULL, "start_date" date NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_user_program_assignments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_program_assignments_family" ON "user_program_assignments" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_program_assignments_family_active" ON "user_program_assignments" ("family_id") WHERE "is_active" = true`,
    );

    await queryRunner.query(
      `CREATE TABLE "exercise_attempt_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "exercise_id" uuid NOT NULL, "photo_keys" text array NOT NULL, "is_correct" boolean NOT NULL, "score" integer NOT NULL, "feedback" text NOT NULL, "recommendations" text NOT NULL, "exercise_record_id" uuid, "analyzed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_exercise_attempt_logs_score_range" CHECK ("score" >= 0 AND "score" <= 100), CONSTRAINT "PK_exercise_attempt_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_attempt_logs_session_exercise" ON "exercise_attempt_logs" ("session_id", "exercise_id") `,
    );

    await queryRunner.query(
      `ALTER TABLE "programs" ADD CONSTRAINT "FK_programs_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "program_exercises" ADD CONSTRAINT "FK_program_exercises_program" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "program_exercises" ADD CONSTRAINT "FK_program_exercises_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" ADD CONSTRAINT "FK_user_program_assignments_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" ADD CONSTRAINT "FK_user_program_assignments_program" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" ADD CONSTRAINT "FK_user_program_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" ADD CONSTRAINT "FK_exercise_attempt_logs_session" FOREIGN KEY ("session_id") REFERENCES "day_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" ADD CONSTRAINT "FK_exercise_attempt_logs_exercise" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" ADD CONSTRAINT "FK_exercise_attempt_logs_record" FOREIGN KEY ("exercise_record_id") REFERENCES "exercise_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" DROP CONSTRAINT "FK_exercise_attempt_logs_record"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" DROP CONSTRAINT "FK_exercise_attempt_logs_exercise"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_attempt_logs" DROP CONSTRAINT "FK_exercise_attempt_logs_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" DROP CONSTRAINT "FK_user_program_assignments_assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" DROP CONSTRAINT "FK_user_program_assignments_program"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" DROP CONSTRAINT "FK_user_program_assignments_family"`,
    );
    await queryRunner.query(
      `ALTER TABLE "program_exercises" DROP CONSTRAINT "FK_program_exercises_exercise"`,
    );
    await queryRunner.query(
      `ALTER TABLE "program_exercises" DROP CONSTRAINT "FK_program_exercises_program"`,
    );
    await queryRunner.query(`ALTER TABLE "programs" DROP CONSTRAINT "FK_programs_created_by"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_exercise_attempt_logs_session_exercise"`);
    await queryRunner.query(`DROP TABLE "exercise_attempt_logs"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_user_program_assignments_family_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_program_assignments_family"`);
    await queryRunner.query(`DROP TABLE "user_program_assignments"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_program_exercises_program"`);
    await queryRunner.query(`DROP TABLE "program_exercises"`);

    await queryRunner.query(`DROP INDEX "public"."UQ_programs_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_programs_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_programs_preset"`);
    await queryRunner.query(`DROP TABLE "programs"`);
    await queryRunner.query(`DROP TYPE "public"."program_duration_type"`);

    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN IF EXISTS "ai_criteria"`);
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN IF EXISTS "safety_instructions"`);
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN IF EXISTS "description"`);
    // Postgres не підтримує видалення значення enum — новий тип лишається розширеним, це безпечно.
  }
}
