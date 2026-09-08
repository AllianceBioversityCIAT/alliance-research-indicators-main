import { MigrationInterface, QueryRunner } from 'typeorm';

// @akili-spec docs/specs/bugfix/pool-funding-sp-picker-empty — T-07 / R-PSP-006 (D-PSP-10)
//
// Backfills `clarisa_external_code` in `bilateral_project_mapping` from
// `agresso_agreement_id` for all active rows where `clarisa_external_code` is NULL.
//
// IDEMPOTENCY AND INTEGRITY
// -------------------------
// - Scoped to `WHERE clarisa_external_code IS NULL AND is_active = 1`.
// - Normalizes via `TRIM(UPPER(agresso_agreement_id))` to ensure consistent format.
// - Explicitly specifies `updated_at = updated_at` so MySQL ON UPDATE CURRENT_TIMESTAMP(6)
//   does not mutate audit timestamps.
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
export class BackfillClarisaExternalCodeInBilateralProjectMapping1787253483599
  implements MigrationInterface
{
  name = 'BackfillClarisaExternalCodeInBilateralProjectMapping1787253483599';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`bilateral_project_mapping\`
         SET \`clarisa_external_code\` = TRIM(UPPER(\`agresso_agreement_id\`)),
             \`updated_at\` = \`updated_at\`
       WHERE \`clarisa_external_code\` IS NULL
         AND \`is_active\` = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`bilateral_project_mapping\`
         SET \`clarisa_external_code\` = NULL,
             \`updated_at\` = \`updated_at\`
       WHERE \`clarisa_external_code\` IS NOT NULL`,
    );
  }
}
