import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec docs/specs/bugfix/pool-funding-sp-picker-empty — T-05 / R-PSP-005 (D-PSP-10)
//
// Adds nullable `clarisa_external_code` column + `idx_bpm_clarisa_external_code`
// to `bilateral_project_mapping`. Schema migration only — no data written here.
//
// NULLABLE BY DESIGN (D-PSP-10)
// -----------------------------
// Existing rows remain NULL until the separate backfill migration (T-07)
// runs. A NOT NULL constraint would fail against existing data and force
// the backfill into the schema step, which template Section 5 forbids.
//
// UNTOUCHED (D-PI-9)
// ------------------
// The MySQL generated column `active_agreement_id` and unique index
// `uk_bpm_active_agreement` are untouched.
//
// PLACEHOLDER TRAP (dispatch-pr2.md Section 1)
// ---------------------------------------------
// These queries pass NO parameters, so nothing in their SQL may look like a
// bind placeholder, not even inside a SQL comment. orm.config.ts sets
// extra.namedPlaceholders true; the named-placeholders pattern matches a
// bare question mark exactly as it matches a colon-word, and it has no
// notion of SQL comments. Both query strings below carry no comments at
// all, so there is nothing to trip. This comment block is TypeScript source,
// never sent to the driver, and keeps the normal form throughout.
export class AddClarisaExternalCodeToBilateralProjectMapping1787253483598
  implements MigrationInterface
{
  name = 'AddClarisaExternalCodeToBilateralProjectMapping1787253483598';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD COLUMN \`clarisa_external_code\` varchar(100) NULL COMMENT 'Normalized CLARISA external_code; feed-stable resolution key'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         ADD INDEX \`idx_bpm_clarisa_external_code\` (\`clarisa_external_code\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP INDEX \`idx_bpm_clarisa_external_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bilateral_project_mapping\`
         DROP COLUMN \`clarisa_external_code\``,
    );
  }
}
