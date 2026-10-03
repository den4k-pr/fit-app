import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Реальні гроші (ТЗ §20.1, макет замовника):
 *  • поповнення фонду через Stripe (картка, Apple Pay, Google Pay, BLIK, PayPal) — `fund_deposits` отримує
 *    провайдера, статус і id PaymentIntent; ручні (облікові) поповнення лишаються `provider = 'manual'`;
 *  • виплата батькові через Stripe Connect Express — переказ (`ledger_entries` settlement) отримує `method` і id Transfer;
 *  • `payment_accounts` — Stripe Customer (спонсор) і Connect-акаунт (батько/мати);
 *  • `auto_topups` — автопоповнення фонду збереженою карткою (щотижня / щомісяця);
 *  • `payment_webhook_events` — ідемпотентність вебхуків (Stripe може надіслати подію кілька разів);
 *  • `subscriptions` — підписка через App Store / Google Play (лише монетизація, не гроші сім'ї).
 */
export class Payments1791300000000 implements MigrationInterface {
  name = 'Payments1791300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "fund_deposits"
      ADD "provider" varchar(20) NOT NULL DEFAULT 'manual',
      ADD "status" varchar(20) NOT NULL DEFAULT 'succeeded',
      ADD "provider_payment_id" varchar(255),
      ADD "method" varchar(30),
      ADD "failure_reason" text,
      ADD "auto" boolean NOT NULL DEFAULT false,
      ADD "updated_at" timestamptz NOT NULL DEFAULT now()`);
    await q.query(
      `ALTER TABLE "fund_deposits" ADD CONSTRAINT "CHK_fund_deposits_status" CHECK ("status" IN ('pending','succeeded','failed','canceled','refunded','disputed'))`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "UQ_fund_deposits_provider_payment" ON "fund_deposits" ("provider_payment_id") WHERE "provider_payment_id" IS NOT NULL`,
    );

    await q.query(`ALTER TABLE "ledger_entries"
      ADD "method" varchar(20) NOT NULL DEFAULT 'manual',
      ADD "provider_transfer_id" varchar(255)`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_ledger_entries_provider_transfer" ON "ledger_entries" ("provider_transfer_id") WHERE "provider_transfer_id" IS NOT NULL`,
    );

    await q.query(`CREATE TABLE "payment_accounts" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "user_id" uuid NOT NULL,
      "stripe_customer_id" varchar(255),
      "stripe_account_id" varchar(255),
      "payouts_enabled" boolean NOT NULL DEFAULT false,
      "details_submitted" boolean NOT NULL DEFAULT false,
      "default_payment_method_id" varchar(255),
      "card_brand" varchar(30),
      "card_last4" varchar(4),
      CONSTRAINT "PK_payment_accounts" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_payment_accounts_user" UNIQUE ("user_id"),
      CONSTRAINT "UQ_payment_accounts_customer" UNIQUE ("stripe_customer_id"),
      CONSTRAINT "UQ_payment_accounts_account" UNIQUE ("stripe_account_id"),
      CONSTRAINT "FK_payment_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE "auto_topups" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "family_id" uuid NOT NULL,
      "created_by_id" uuid NOT NULL,
      "amount" numeric(10,2) NOT NULL,
      "interval" varchar(10) NOT NULL,
      "next_run_at" timestamptz NOT NULL,
      "active" boolean NOT NULL DEFAULT true,
      "failures" smallint NOT NULL DEFAULT 0,
      "last_error" text,
      CONSTRAINT "PK_auto_topups" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_auto_topups_family" UNIQUE ("family_id"),
      CONSTRAINT "CHK_auto_topups_amount" CHECK ("amount" > 0),
      CONSTRAINT "CHK_auto_topups_interval" CHECK ("interval" IN ('week','month')),
      CONSTRAINT "FK_auto_topups_family" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_auto_topups_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await q.query(
      `CREATE INDEX "IDX_auto_topups_due" ON "auto_topups" ("next_run_at") WHERE "active"`,
    );
    await q.query(`CREATE INDEX "IDX_auto_topups_created_by" ON "auto_topups" ("created_by_id")`);

    await q.query(`CREATE TABLE "payment_webhook_events" (
      "id" varchar(255) NOT NULL,
      "provider" varchar(20) NOT NULL,
      "type" varchar(120) NOT NULL,
      "received_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_payment_webhook_events" PRIMARY KEY ("id")
    )`);

    await q.query(`CREATE TABLE "subscriptions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "user_id" uuid NOT NULL,
      "platform" varchar(10) NOT NULL,
      "product_id" varchar(200) NOT NULL,
      "external_id" varchar(512) NOT NULL,
      "status" varchar(20) NOT NULL,
      "expires_at" timestamptz,
      "auto_renew" boolean NOT NULL DEFAULT true,
      "environment" varchar(20),
      "raw" jsonb,
      CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_subscriptions_external" UNIQUE ("platform", "external_id"),
      CONSTRAINT "CHK_subscriptions_platform" CHECK ("platform" IN ('ios','android')),
      CONSTRAINT "CHK_subscriptions_status" CHECK ("status" IN ('active','grace','on_hold','paused','canceled','expired','revoked','pending')),
      CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE INDEX "IDX_subscriptions_user" ON "subscriptions" ("user_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "subscriptions"`);
    await q.query(`DROP TABLE "payment_webhook_events"`);
    await q.query(`DROP TABLE "auto_topups"`);
    await q.query(`DROP TABLE "payment_accounts"`);
    await q.query(`DROP INDEX "UQ_ledger_entries_provider_transfer"`);
    await q.query(
      `ALTER TABLE "ledger_entries" DROP COLUMN "provider_transfer_id", DROP COLUMN "method"`,
    );
    await q.query(`DROP INDEX "UQ_fund_deposits_provider_payment"`);
    await q.query(`ALTER TABLE "fund_deposits" DROP CONSTRAINT "CHK_fund_deposits_status"`);
    await q.query(`ALTER TABLE "fund_deposits"
      DROP COLUMN "updated_at", DROP COLUMN "auto", DROP COLUMN "failure_reason",
      DROP COLUMN "method", DROP COLUMN "provider_payment_id", DROP COLUMN "status", DROP COLUMN "provider"`);
  }
}
