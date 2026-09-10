// @akili-spec docs/specs/changes/my-pi-delegates — T-01
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `pi_delegates` table as the relational source of truth for
 * PI delegation (R-PID-001, R-PID-006). A STORED GENERATED column
 * `active_delegate_key` carries the unique-active constraint that prevents
 * duplicate active delegations per (project, delegate) while allowing
 * revoked rows to coexist (design decision DD-F — MySQL has no filtered
 * unique index). Inactive rows carry NULL in `active_delegate_key`, and
 * MySQL's unique-index semantics do not consider NULLs as duplicates.
 *
 * Charset: the table is pinned to utf8mb3 / utf8mb3_general_ci so that
 * `project_id` matches `agresso_contracts.agreement_id` (that legacy column is
 * utf8mb3 in the target schema). Without this the column would inherit the
 * server default (utf8mb4) and the `FK_pi_delegates_project_id` FK would fail
 * with MySQL errno 3780 (referencing/referenced charset mismatch). Confirmed
 * by applying against the real schema — a plain `ENGINE=InnoDB` fails the FK.
 */
export class CreatePiDelegates1787600000000 implements MigrationInterface {
  name = 'CreatePiDelegates1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`pi_delegates\` (` +
        `\`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
        `\`created_by\` bigint NULL, ` +
        `\`updated_at\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ` +
        `\`updated_by\` bigint NULL, ` +
        `\`is_active\` tinyint NOT NULL DEFAULT 1, ` +
        `\`deleted_at\` timestamp NULL, ` +
        `\`pi_delegate_id\` bigint NOT NULL AUTO_INCREMENT, ` +
        `\`project_id\` varchar(36) NOT NULL, ` +
        `\`pi_user_id\` bigint NOT NULL, ` +
        `\`delegate_user_id\` bigint NOT NULL, ` +
        `\`active_delegate_key\` varchar(80) GENERATED ALWAYS AS (IF(\`is_active\` = 1, CONCAT(\`project_id\`, ':', \`delegate_user_id\`), NULL)) STORED, ` +
        `PRIMARY KEY (\`pi_delegate_id\`)` +
        `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` ADD UNIQUE INDEX \`uq_pi_delegates_active_delegate_key\` (\`active_delegate_key\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` ADD CONSTRAINT \`FK_pi_delegates_project_id\` FOREIGN KEY (\`project_id\`) REFERENCES \`agresso_contracts\`(\`agreement_id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` ADD CONSTRAINT \`FK_pi_delegates_pi_user_id\` FOREIGN KEY (\`pi_user_id\`) REFERENCES \`sec_users\`(\`sec_user_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` ADD CONSTRAINT \`FK_pi_delegates_delegate_user_id\` FOREIGN KEY (\`delegate_user_id\`) REFERENCES \`sec_users\`(\`sec_user_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` DROP FOREIGN KEY \`FK_pi_delegates_delegate_user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` DROP FOREIGN KEY \`FK_pi_delegates_pi_user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`pi_delegates\` DROP FOREIGN KEY \`FK_pi_delegates_project_id\``,
    );
    await queryRunner.query(`DROP TABLE \`pi_delegates\``);
  }
}
