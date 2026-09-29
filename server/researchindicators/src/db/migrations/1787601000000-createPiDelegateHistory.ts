// @akili-spec docs/specs/changes/my-pi-delegates — T-15
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `pi_delegate_history` append-only movement log (R-PID-012,
 * design §11.1). Every assign and revoke on `pi_delegates` writes one row
 * here in the same transaction, giving a full audit trail without touching
 * the main `pi_delegates` table (DD-N).
 *
 * Design decisions carried over from `pi_delegates` migration:
 * - No foreign keys on any column (DD-O: history is decoupled/immutable from
 *   the mutable `pi_delegates` row; `pi_delegate_id` is a plain column).
 * - No unique index, no generated column (multiple movements per relationship
 *   are valid; uniqueness is enforced only on `pi_delegates`).
 * - Table charset utf8mb3 to match the rest of the legacy schema and avoid
 *   collation mismatches on `project_id` (design §11.1 note).
 */
export class CreatePiDelegateHistory1787601000000
  implements MigrationInterface
{
  name = 'CreatePiDelegateHistory1787601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`pi_delegate_history\` (` +
        `\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
        `\`created_by\` bigint NULL, ` +
        `\`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ` +
        `\`updated_by\` bigint NULL, ` +
        `\`is_active\` tinyint NOT NULL DEFAULT 1, ` +
        `\`deleted_at\` timestamp NULL, ` +
        `\`pi_delegate_history_id\` bigint NOT NULL AUTO_INCREMENT, ` +
        `\`pi_delegate_id\` bigint NOT NULL, ` +
        `\`project_id\` varchar(36) NOT NULL, ` +
        `\`delegate_user_id\` bigint NOT NULL, ` +
        `\`action\` varchar(10) NOT NULL, ` +
        `PRIMARY KEY (\`pi_delegate_history_id\`)` +
        `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`pi_delegate_history\``);
  }
}
