import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Індекси на зовнішні ключі, які їх не мали. Без них кожне каскадне видалення/SET NULL (видалення акаунта,
 * вправи, програми, запису) сканує дочірню таблицю цілком — з ростом даних видалення акаунта сповільнюється.
 */
export class ForeignKeyIndexes1791000000000 implements MigrationInterface {
  name = 'ForeignKeyIndexes1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_used_by" ON "invites" ("used_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_created_by" ON "ledger_entries" ("created_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ledger_entries_session" ON "ledger_entries" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_exercise_records_exercise" ON "exercise_records" ("exercise_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_program_exercises_exercise" ON "program_exercises" ("exercise_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_program_assignments_assigned_by" ON "user_program_assignments" ("assigned_by_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_program_assignments_program" ON "user_program_assignments" ("program_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_exercise_attempt_logs_exercise" ON "exercise_attempt_logs" ("exercise_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_exercise_attempt_logs_record" ON "exercise_attempt_logs" ("exercise_record_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invites_used_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ledger_entries_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ledger_entries_session"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercise_records_exercise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_program_exercises_exercise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_program_assignments_assigned_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_program_assignments_program"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercise_attempt_logs_exercise"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercise_attempt_logs_record"`);
  }
}
