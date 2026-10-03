import { MigrationInterface, QueryRunner } from 'typeorm';

/** Деталізація плану (п.2): список переваг/вмісту програми для екрана деталей. */
export class ProgramHighlights1790300000000 implements MigrationInterface {
  name = 'ProgramHighlights1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "highlights" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programs" DROP COLUMN IF EXISTS "highlights"`);
  }
}
