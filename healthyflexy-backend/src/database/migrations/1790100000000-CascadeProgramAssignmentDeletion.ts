import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `FK_user_program_assignments_assigned_by` був RESTRICT: видалення акаунта дитини, яка колись
 * призначала програму, падало 500-кою (QueryFailedError) на DELETE /users/me — рядок і так зникає
 * разом із сім'єю через `family_id` CASCADE, RESTRICT лише блокував саме видалення users.
 */
export class CascadeProgramAssignmentDeletion1790100000000 implements MigrationInterface {
  name = 'CascadeProgramAssignmentDeletion1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" DROP CONSTRAINT IF EXISTS "FK_user_program_assignments_assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" ADD CONSTRAINT "FK_user_program_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" DROP CONSTRAINT IF EXISTS "FK_user_program_assignments_assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_program_assignments" ADD CONSTRAINT "FK_user_program_assignments_assigned_by" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
