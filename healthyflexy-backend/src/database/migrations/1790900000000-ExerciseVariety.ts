import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Різновиди вправ: група (`variant_group`) — вправи однієї групи чергуються день у день на тому ж місці
 * програми; ритм голосового супроводу (`voice_pattern`).
 */
export class ExerciseVariety1790900000000 implements MigrationInterface {
  name = 'ExerciseVariety1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exercises" ADD "variant_group" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "exercises" ADD "voice_pattern" varchar(20)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_exercises_variant_group" ON "exercises" ("variant_group") WHERE "variant_group" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_exercises_variant_group"`);
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN "voice_pattern"`);
    await queryRunner.query(`ALTER TABLE "exercises" DROP COLUMN "variant_group"`);
  }
}
