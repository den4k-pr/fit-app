import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1789812970940 implements MigrationInterface {
  name = 'InitSchema1789812970940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."exercise_category" AS ENUM('strength', 'cardio', 'balance', 'breathing')`,
    );
    await queryRunner.query(
      `CREATE TABLE "exercises" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "slug" character varying(50) NOT NULL, "sort_order" integer NOT NULL, "category" "public"."exercise_category" NOT NULL, "name" jsonb NOT NULL, "target_reps" integer, "target_seconds" integer, "record_max_sec" integer NOT NULL DEFAULT '30', "demo_video_url" character varying(500), "benefit" jsonb NOT NULL, "source_title" character varying(255), "source_url" character varying(500), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "CHK_exercises_record_max" CHECK ("record_max_sec" >= 5 AND "record_max_sec" <= 120), CONSTRAINT "CHK_exercises_target" CHECK ("target_reps" IS NOT NULL OR "target_seconds" IS NOT NULL), CONSTRAINT "PK_c4c46f5fa89a58ba7c2d894e3c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercises_active_order" ON "exercises" ("is_active", "sort_order") `,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_exercises_slug" ON "exercises" ("slug") `);
    await queryRunner.query(`CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android')`);
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "device_id" character varying(100), "platform" "public"."device_platform", "app_version" character varying(20), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_token_id" uuid, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_refresh_tokens_hash" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."relationship_type" AS ENUM('mom', 'dad', 'grandma', 'grandpa', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "child_id" uuid NOT NULL, "code" character varying(6) NOT NULL, "relationship" "public"."relationship_type" NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_by_id" uuid, "used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_invites_code_format" CHECK ("code" ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'), CONSTRAINT "PK_aa52e96b44a714372f4dd31a0af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_invites_child" ON "invites" ("child_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invites_code" ON "invites" ("code") `);
    await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('parent', 'child')`);
    await queryRunner.query(`CREATE TYPE "public"."app_language" AS ENUM('uk', 'pl', 'en')`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "phone" character varying(20) NOT NULL, "name" character varying(100), "age" integer, "role" "public"."user_role", "language" "public"."app_language" NOT NULL DEFAULT 'uk', "timezone" character varying(64) NOT NULL DEFAULT 'Europe/Warsaw', "push_token" character varying(255), "push_enabled" boolean NOT NULL DEFAULT true, "gdpr_consent_at" TIMESTAMP WITH TIME ZONE, "disclaimer_seen_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_users_age" CHECK ("age" IS NULL OR ("age" >= 16 AND "age" <= 120)), CONSTRAINT "CHK_users_phone_e164" CHECK ("phone" ~ '^\\+[1-9][0-9]{6,14}$'), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_phone" ON "users" ("phone") `);
    await queryRunner.query(`CREATE TYPE "public"."ledger_type" AS ENUM('earn', 'settlement')`);
    await queryRunner.query(`CREATE TYPE "public"."currency_code" AS ENUM('EUR', 'PLN')`);
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_status" AS ENUM('confirmed', 'pending', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "family_id" uuid NOT NULL, "type" "public"."ledger_type" NOT NULL, "amount" numeric(8,2) NOT NULL, "currency" "public"."currency_code" NOT NULL, "status" "public"."ledger_status" NOT NULL, "session_id" uuid, "created_by_id" uuid, "resolved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_ledger_entries_resolved_at" CHECK ("type" = 'earn' OR ("status" = 'pending' AND "resolved_at" IS NULL) OR ("status" IN ('confirmed','rejected') AND "resolved_at" IS NOT NULL)), CONSTRAINT "CHK_ledger_entries_earn_shape" CHECK ("type" = 'settlement' OR ("session_id" IS NOT NULL AND "status" = 'confirmed')), CONSTRAINT "CHK_ledger_entries_amount" CHECK ("amount" > 0), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_entries_one_earn_per_session" ON "ledger_entries" ("session_id") WHERE "type" = 'earn'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_entries_family_type_status" ON "ledger_entries" ("family_id", "type", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_entries_family_created" ON "ledger_entries" ("family_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "families" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "child_id" uuid NOT NULL, "parent_id" uuid NOT NULL, "relationship" "public"."relationship_type" NOT NULL DEFAULT 'mom', "rate" numeric(6,2) NOT NULL DEFAULT '5', "currency" "public"."currency_code" NOT NULL DEFAULT 'EUR', "plan_days" smallint array NOT NULL DEFAULT '{1,2,4,5}', "reminder_time" TIME NOT NULL DEFAULT '10:00:00', "last_reminder_sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "REL_5c47a2823ac81bb3a18f06150e" UNIQUE ("parent_id"), CONSTRAINT "CHK_families_plan_days" CHECK (cardinality("plan_days") BETWEEN 1 AND 7 AND "plan_days" <@ ARRAY[1,2,3,4,5,6,7]::smallint[]), CONSTRAINT "CHK_families_rate_step" CHECK (MOD("rate" * 2, 1) = 0), CONSTRAINT "CHK_families_rate_range" CHECK ("rate" >= 1 AND "rate" <= 20), CONSTRAINT "CHK_families_distinct_members" CHECK ("child_id" <> "parent_id"), CONSTRAINT "PK_70414ac0c8f45664cf71324b9bb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_families_child" ON "families" ("child_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_families_parent" ON "families" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."session_status" AS ENUM('pending', 'in_progress', 'completed', 'missed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "day_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "family_id" uuid NOT NULL, "date" date NOT NULL, "status" "public"."session_status" NOT NULL DEFAULT 'pending', "exercises_total" integer NOT NULL, "exercises_done" integer NOT NULL DEFAULT '0', "rate" numeric(6,2) NOT NULL, "earned" numeric(6,2) NOT NULL DEFAULT '0', "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_day_sessions_completed_at" CHECK ("status" <> 'completed' OR ("completed_at" IS NOT NULL AND "exercises_done" = "exercises_total")), CONSTRAINT "CHK_day_sessions_earned" CHECK ("earned" >= 0), CONSTRAINT "CHK_day_sessions_done_range" CHECK ("exercises_done" >= 0 AND "exercises_done" <= "exercises_total"), CONSTRAINT "PK_5fb92255336ebb23e8c3737c402" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_day_sessions_family_status_date" ON "day_sessions" ("family_id", "status", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_day_sessions_family_date" ON "day_sessions" ("family_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exercise_records" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "session_id" uuid NOT NULL, "exercise_id" uuid NOT NULL, "video_key" character varying(255), "video_size_bytes" integer, "video_content_type" character varying(50), "video_expires_at" TIMESTAMP WITH TIME ZONE, "video_deleted_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_exercise_records_video_size" CHECK ("video_size_bytes" IS NULL OR "video_size_bytes" > 0), CONSTRAINT "CHK_exercise_records_video_expiry" CHECK ("video_key" IS NULL OR "video_expires_at" IS NOT NULL), CONSTRAINT "PK_b9684215c946799382f8052ff0a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exercise_records_video_expiry" ON "exercise_records" ("video_expires_at") WHERE "video_deleted_at" IS NULL AND "video_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exercise_records_session_exercise" ON "exercise_records" ("session_id", "exercise_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "phone" character varying(20) NOT NULL, "code_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "request_ip" character varying(45), CONSTRAINT "CHK_otp_codes_attempts" CHECK ("attempts" >= 0), CONSTRAINT "PK_9d0487965ac1837d57fec4d6a26" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_otp_codes_expires_at" ON "otp_codes" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_otp_codes_phone_created" ON "otp_codes" ("phone", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_196eebd65c1a8557f8f1fb9416b" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_51bac8e59ded3fda54dec66526b" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_87408af533378f025b2c0434f36" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_faaeac2bc34f51d80a0f1f950fb" FOREIGN KEY ("session_id") REFERENCES "day_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_fda2c465f56e2496f69c76d7111" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "FK_240096d7ee1dbe0e45b04a51225" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" ADD CONSTRAINT "FK_5c47a2823ac81bb3a18f06150ee" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "day_sessions" ADD CONSTRAINT "FK_963ef700ba804bc5a1ce8cc1da3" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "FK_4d94d794c47e183938ccd633bb9" FOREIGN KEY ("session_id") REFERENCES "day_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" ADD CONSTRAINT "FK_2af2c6e74033ffc93b78acf42c8" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "FK_2af2c6e74033ffc93b78acf42c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise_records" DROP CONSTRAINT "FK_4d94d794c47e183938ccd633bb9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "day_sessions" DROP CONSTRAINT "FK_963ef700ba804bc5a1ce8cc1da3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT "FK_5c47a2823ac81bb3a18f06150ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "families" DROP CONSTRAINT "FK_240096d7ee1dbe0e45b04a51225"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_fda2c465f56e2496f69c76d7111"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_faaeac2bc34f51d80a0f1f950fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_87408af533378f025b2c0434f36"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_51bac8e59ded3fda54dec66526b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_196eebd65c1a8557f8f1fb9416b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_otp_codes_phone_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_otp_codes_expires_at"`);
    await queryRunner.query(`DROP TABLE "otp_codes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_exercise_records_session_exercise"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exercise_records_video_expiry"`);
    await queryRunner.query(`DROP TABLE "exercise_records"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_day_sessions_family_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_day_sessions_family_status_date"`);
    await queryRunner.query(`DROP TABLE "day_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."session_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_families_parent"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_families_child"`);
    await queryRunner.query(`DROP TABLE "families"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entries_family_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entries_family_type_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledger_entries_one_earn_per_session"`);
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(`DROP TYPE "public"."ledger_status"`);
    await queryRunner.query(`DROP TYPE "public"."currency_code"`);
    await queryRunner.query(`DROP TYPE "public"."ledger_type"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_phone"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."app_language"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_invites_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invites_child"`);
    await queryRunner.query(`DROP TABLE "invites"`);
    await queryRunner.query(`DROP TYPE "public"."relationship_type"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_refresh_tokens_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."device_platform"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_exercises_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exercises_active_order"`);
    await queryRunner.query(`DROP TABLE "exercises"`);
    await queryRunner.query(`DROP TYPE "public"."exercise_category"`);
  }
}
