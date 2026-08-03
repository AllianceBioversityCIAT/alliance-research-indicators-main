import { MigrationInterface, QueryRunner } from 'typeorm';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.17
//
// Fixes a pre-existing partial-unique emulation bug on
// `result_pool_funding_alignment` surfaced during T-15.1 / T-15.3 live
// smokes. The original index from migration 1779190000006 was a plain
// UNIQUE on (result_id, is_active), which semantically reads as "at most
// one row per (result, active-state)". That fails the moment a result
// has two deactivated rows — the second deactivation collides on
// duplicate `(result_id, 0)`.
//
// The intended semantic is "at most one ACTIVE row per result" — exactly
// what `bilateral_project_mapping` does via design decision D-PI-9.
// Re-using that pattern: add a STORED GENERATED column that's only
// non-NULL while the row is active, then UNIQUE on the generated column.
// Inactive rows have NULL there, and NULLs don't collide in MySQL's
// unique-index semantics.
export class FixResultPoolFundingAlignmentPartialUnique1779190000014
  implements MigrationInterface
{
  name = 'FixResultPoolFundingAlignmentPartialUnique1779190000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         DROP INDEX \`uq_result_pool_funding_alignment_result_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         ADD COLUMN \`active_result_id\` bigint
           GENERATED ALWAYS AS (IF(\`is_active\` = 1, \`result_id\`, NULL)) STORED`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         ADD UNIQUE INDEX \`uq_rpfa_active_result\` (\`active_result_id\`)`,
    );
  }

  // DOWN is best-effort and only safe to run **immediately after UP, before
  // any deactivate+re-create operator activity**. The old plain-unique on
  // (result_id, is_active) cannot coexist with the data shape the new
  // partial-unique permits — at most one deactivated row per result. Once
  // the table accumulates ≥ 2 deactivated rows for any single result, the
  // `ADD UNIQUE INDEX` below throws 1062 inside the migration transaction,
  // which then rolls back; the new index + generated column remain in place
  // and the migration ledger stays at "applied". This is the correct safety
  // posture: rolling back would otherwise require silently picking which
  // deactivated row to delete.
  //
  // To actually downgrade a populated environment, an operator must first
  // delete redundant deactivated rows (`DELETE FROM result_pool_funding_alignment
  // WHERE is_active = 0` is the safest approach if history isn't needed).
  // Do not attempt a blind `migration:revert` in production.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         DROP INDEX \`uq_rpfa_active_result\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         DROP COLUMN \`active_result_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_pool_funding_alignment\`
         ADD UNIQUE INDEX \`uq_result_pool_funding_alignment_result_active\` (\`result_id\`, \`is_active\`)`,
    );
  }
}
