import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Єдиний стандарт локалізації динамічних даних: `ru` стає СПРАВЖНЬОЮ мовою бекенду
 * (раніше клієнт мовчки підміняв російську на українську перед відправкою на сервер —
 * `SERVER_LANGUAGE` у мобільному застосунку, — тому будь-який серверний контент, включно
 * з назвами/описами програм, завжди показувався українською для ru-користувачів).
 */
export class AddRussianLanguage1790200000000 implements MigrationInterface {
  name = 'AddRussianLanguage1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."app_language" ADD VALUE IF NOT EXISTS 'ru'`);
  }

  public async down(): Promise<void> {
    // Postgres не підтримує видалення значення enum — тип лишається розширеним, це безпечно.
  }
}
