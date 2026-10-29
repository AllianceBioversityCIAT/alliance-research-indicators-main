import { MigrationInterface, QueryRunner } from 'typeorm';
import { LoggerUtil } from '../../domain/shared/utils/logger.util';

// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-01 / R-APM-001
// DD-1. Design §4.1 (up) and §4.2 (down).
//
// up
// --
// 1. Survey (logged, never fatal): row count, created_at range, agreements
//    with more than one row.
// 2. Abort only when an agreement has more than one active row. This runs
//    before any DDL. MySQL DDL auto-commits, so a later failure cannot undo
//    an earlier ALTER. The pre-check is what keeps a corrupt table unchanged.
// 3. Create bilateral_project_mapping_history. For each agreement with more
//    than one row, keep one row: the active one when present, otherwise the
//    most recently updated one. Ties on updated_at keep the greater id.
//    Move the rest with archive_reason superseded-duplicate, then delete them.
// 4. Add reporting_year nullable, backfill the literal 2026, then NOT NULL.
//    The year is written in the SQL. It is not an imported TypeScript constant.
//    updated_at is assigned to itself so ON UPDATE CURRENT_TIMESTAMP does not
//    rewrite audit fields.
// 5. Drop uk_bpm_active_agreement, drop generated active_agreement_id, add
//    uk_bpm_agreement_year on (agresso_agreement_id, reporting_year).
//
// down
// ----
// 1. Refuse when any agreement has rows in more than one reporting_year.
//    Collapsing those years would break the old active-only key.
// 2. Drop uk_bpm_agreement_year before the column, restore the generated
//    column and uk_bpm_active_agreement, then drop reporting_year.
// 3. Insert history rows back with original_id as id, then drop the history
//    table.
//
// PLACEHOLDER TRAP
// ----------------
// These queries pass NO parameters, so nothing in their SQL may look like a
// bind placeholder, not even inside a SQL comment. orm.config.ts sets
// extra.namedPlaceholders true. The named-placeholders pattern matches a
// bare question mark exactly as it matches a colon-word, and it has no
// notion of SQL comments. Every query string below is comment-free. This
// block is TypeScript and is never sent to the driver.

const MIGRATION_LOG = 'AnnualizeBilateralProjectMapping1792200000000';

function asRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    throw new Error(`${MIGRATION_LOG}: query did not return a row array.`);
  }
  return value as Array<Record<string, unknown>>;
}

export class AnnualizeBilateralProjectMapping1792200000000
  implements MigrationInterface
{
  name = 'AnnualizeBilateralProjectMapping1792200000000';

  private readonly logger = new LoggerUtil({ name: MIGRATION_LOG });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.logSurvey(queryRunner);
    await this.abortIfMultipleActive(queryRunner);
    await this.archiveSupersededDuplicates(queryRunner);
    await this.addReportingYear(queryRunner);
    await this.swapUniqueKey(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.abortIfMultipleYears(queryRunner);
    await this.restoreActiveAgreementKey(queryRunner);
    await this.restoreHistory(queryRunner);
  }

  private async logSurvey(queryRunner: QueryRunner): Promise<void> {
    const summary = asRows(
      await queryRunner.query(
        `SELECT COUNT(*) AS row_count,
                MIN(\`created_at\`) AS created_min,
                MAX(\`created_at\`) AS created_max
           FROM \`bilateral_project_mapping\``,
      ),
    );
    const duplicates = asRows(
      await queryRunner.query(
        `SELECT \`agresso_agreement_id\` AS agreement_id,
                COUNT(*) AS row_count
           FROM \`bilateral_project_mapping\`
          GROUP BY \`agresso_agreement_id\`
         HAVING COUNT(*) > 1`,
      ),
    );
    this.logger._log(
      `survey summary=${JSON.stringify(summary)} duplicate_agreements=${JSON.stringify(duplicates)}`,
    );
  }

  private async abortIfMultipleActive(queryRunner: QueryRunner): Promise<void> {
    const collisions = asRows(
      await queryRunner.query(
        `SELECT \`agresso_agreement_id\` AS agreement_id,
                COUNT(*) AS active_count
           FROM \`bilateral_project_mapping\`
          WHERE \`is_active\` = 1
          GROUP BY \`agresso_agreement_id\`
         HAVING COUNT(*) > 1`,
      ),
    );
    if (collisions.length === 0) {
      return;
    }
    const listed = collisions
      .map((row) => `${row.agreement_id}(${row.active_count})`)
      .join(', ');
    throw new Error(
      `${MIGRATION_LOG} up refused. More than one active row for: ${listed}. No schema change was applied.`,
    );
  }

  private async archiveSupersededDuplicates(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`bilateral_project_mapping_history\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`original_id\` bigint NOT NULL,
        \`created_at\` timestamp(6) NOT NULL,
        \`created_by\` bigint NULL,
        \`updated_at\` timestamp(6) NULL,
        \`updated_by\` bigint NULL,
        \`is_active\` tinyint NOT NULL,
        \`deleted_at\` timestamp NULL,
        \`agresso_agreement_id\` varchar(50) NOT NULL,
        \`clarisa_project_id\` int NOT NULL,
        \`clarisa_project_short_name\` varchar(500) NULL,
        \`clarisa_external_code\` varchar(100) NULL,
        \`source\` enum('MANUAL','AI_SUGGESTED','AI_AUTO','DERIVED') NOT NULL,
        \`confidence_score\` float NULL,
        \`notes\` text NULL,
        \`reporting_year\` int NOT NULL,
        \`archived_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`archive_reason\` varchar(64) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci`,
    );

    await queryRunner.query(
      `INSERT INTO \`bilateral_project_mapping_history\` (
         \`original_id\`,
         \`created_at\`,
         \`created_by\`,
         \`updated_at\`,
         \`updated_by\`,
         \`is_active\`,
         \`deleted_at\`,
         \`agresso_agreement_id\`,
         \`clarisa_project_id\`,
         \`clarisa_project_short_name\`,
         \`clarisa_external_code\`,
         \`source\`,
         \`confidence_score\`,
         \`notes\`,
         \`reporting_year\`,
         \`archived_at\`,
         \`archive_reason\`
       )
       SELECT \`ranked\`.\`id\`,
              \`ranked\`.\`created_at\`,
              \`ranked\`.\`created_by\`,
              \`ranked\`.\`updated_at\`,
              \`ranked\`.\`updated_by\`,
              \`ranked\`.\`is_active\`,
              \`ranked\`.\`deleted_at\`,
              \`ranked\`.\`agresso_agreement_id\`,
              \`ranked\`.\`clarisa_project_id\`,
              \`ranked\`.\`clarisa_project_short_name\`,
              \`ranked\`.\`clarisa_external_code\`,
              \`ranked\`.\`source\`,
              \`ranked\`.\`confidence_score\`,
              \`ranked\`.\`notes\`,
              2026,
              CURRENT_TIMESTAMP(6),
              'superseded-duplicate'
         FROM (
           SELECT \`bpm\`.\`id\` AS \`id\`,
                  \`bpm\`.\`created_at\` AS \`created_at\`,
                  \`bpm\`.\`created_by\` AS \`created_by\`,
                  \`bpm\`.\`updated_at\` AS \`updated_at\`,
                  \`bpm\`.\`updated_by\` AS \`updated_by\`,
                  \`bpm\`.\`is_active\` AS \`is_active\`,
                  \`bpm\`.\`deleted_at\` AS \`deleted_at\`,
                  \`bpm\`.\`agresso_agreement_id\` AS \`agresso_agreement_id\`,
                  \`bpm\`.\`clarisa_project_id\` AS \`clarisa_project_id\`,
                  \`bpm\`.\`clarisa_project_short_name\` AS \`clarisa_project_short_name\`,
                  \`bpm\`.\`clarisa_external_code\` AS \`clarisa_external_code\`,
                  \`bpm\`.\`source\` AS \`source\`,
                  \`bpm\`.\`confidence_score\` AS \`confidence_score\`,
                  \`bpm\`.\`notes\` AS \`notes\`,
                  ROW_NUMBER() OVER (
                    PARTITION BY \`bpm\`.\`agresso_agreement_id\`
                    ORDER BY (\`bpm\`.\`is_active\` = 1) DESC,
                             \`bpm\`.\`updated_at\` DESC,
                             \`bpm\`.\`id\` DESC
                  ) AS \`keep_rank\`,
                  COUNT(*) OVER (
                    PARTITION BY \`bpm\`.\`agresso_agreement_id\`
                  ) AS \`agreement_rows\`
             FROM \`bilateral_project_mapping\` \`bpm\`
         ) \`ranked\`
        WHERE \`ranked\`.\`agreement_rows\` > 1
          AND \`ranked\`.\`keep_rank\` > 1`,
    );

    const archived = asRows(
      await queryRunner.query(
        `SELECT COUNT(*) AS archived_count
           FROM \`bilateral_project_mapping_history\``,
      ),
    );
    this.logger._log(
      `archived superseded duplicates=${JSON.stringify(archived)}`,
    );

    await queryRunner.query(
      `DELETE \`bpm\`
         FROM \`bilateral_project_mapping\` \`bpm\`
         INNER JOIN \`bilateral_project_mapping_history\` \`hist\`
           ON \`hist\`.\`original_id\` = \`bpm\`.\`id\``,
    );
  }

  private async addReportingYear(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`reporting_year\` int NULL`,
    );
    await queryRunner.query(
      `UPDATE \`bilateral_project_mapping\`
          SET \`reporting_year\` = 2026,
              \`updated_at\` = \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         MODIFY COLUMN \`reporting_year\` int NOT NULL`,
    );
  }

  private async swapUniqueKey(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP INDEX \`uk_bpm_active_agreement\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`active_agreement_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD UNIQUE INDEX \`uk_bpm_agreement_year\` (\`agresso_agreement_id\`, \`reporting_year\`)`,
    );
  }

  private async abortIfMultipleYears(queryRunner: QueryRunner): Promise<void> {
    const collisions = asRows(
      await queryRunner.query(
        `SELECT \`agresso_agreement_id\` AS agreement_id,
                COUNT(DISTINCT \`reporting_year\`) AS year_count
           FROM \`bilateral_project_mapping\`
          GROUP BY \`agresso_agreement_id\`
         HAVING COUNT(DISTINCT \`reporting_year\`) > 1`,
      ),
    );
    if (collisions.length === 0) {
      return;
    }
    const listed = collisions
      .map((row) => `${row.agreement_id}(${row.year_count})`)
      .join(', ');
    throw new Error(
      `${MIGRATION_LOG} down refused. Agreements span more than one reporting year: ${listed}. No schema change was applied.`,
    );
  }

  private async restoreActiveAgreementKey(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP INDEX \`uk_bpm_agreement_year\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`active_agreement_id\` varchar(50)
           GENERATED ALWAYS AS (IF(\`is_active\` = 1, \`agresso_agreement_id\`, NULL)) STORED
           COMMENT 'D-PI-9: emulates partial-unique on agresso_agreement_id WHERE is_active = 1'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD UNIQUE INDEX \`uk_bpm_active_agreement\` (\`active_agreement_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`reporting_year\``,
    );
  }

  private async restoreHistory(queryRunner: QueryRunner): Promise<void> {
    const pending = asRows(
      await queryRunner.query(
        `SELECT COUNT(*) AS restore_count
           FROM \`bilateral_project_mapping_history\``,
      ),
    );
    this.logger._log(`restoring history rows=${JSON.stringify(pending)}`);

    await queryRunner.query(
      `INSERT INTO \`bilateral_project_mapping\` (
         \`id\`,
         \`created_at\`,
         \`created_by\`,
         \`updated_at\`,
         \`updated_by\`,
         \`is_active\`,
         \`deleted_at\`,
         \`agresso_agreement_id\`,
         \`clarisa_project_id\`,
         \`clarisa_project_short_name\`,
         \`clarisa_external_code\`,
         \`source\`,
         \`confidence_score\`,
         \`notes\`
       )
       SELECT \`original_id\`,
              \`created_at\`,
              \`created_by\`,
              \`updated_at\`,
              \`updated_by\`,
              \`is_active\`,
              \`deleted_at\`,
              \`agresso_agreement_id\`,
              \`clarisa_project_id\`,
              \`clarisa_project_short_name\`,
              \`clarisa_external_code\`,
              \`source\`,
              \`confidence_score\`,
              \`notes\`
         FROM \`bilateral_project_mapping_history\``,
    );
    await queryRunner.query(`DROP TABLE \`bilateral_project_mapping_history\``);
  }
}
