import { DataSource, QueryRunner } from 'typeorm';
import { CreateResultPoolFundingAlignment1779190000006 } from '../../src/db/migrations/1779190000006-createResultPoolFundingAlignment';
import { CreateResultPoolFundingAlignmentSp1779190000007 } from '../../src/db/migrations/1779190000007-createResultPoolFundingAlignmentSp';
import { RenameLeverCodeToSpCodeOnAlignmentSp1779190000013 } from '../../src/db/migrations/1779190000013-renameLeverCodeToSpCodeOnAlignmentSp';
import { FixResultPoolFundingAlignmentPartialUnique1779190000014 } from '../../src/db/migrations/1779190000014-fixResultPoolFundingAlignmentPartialUnique';
import { CreateResultReviewHistory1779190000009 } from '../../src/db/migrations/1779190000009-createResultReviewHistory';
import { AddSpRoleToAlignmentSp1786636994078 } from '../../src/db/migrations/1786636994078-addSpRoleToAlignmentSp';

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-13
//
// Builds a REAL schema for the isolated T13 container by invoking the
// project's own migration classes' `up(queryRunner)` — never `synchronize:
// true`, never hand-written DDL for the columns this task actually tests.
//
// Route (b) from the task instructions (Route (a), the full 306-migration
// chain, was tried first and fails on a data-seed migration —
// `InsertTemplates1751474908040` — unrelated to this feature; see the task
// report for the reproduction). Route (b) as specified says "create the
// minimum prerequisite tables by hand, then invoke the T-02 migration's own
// up()". This implementation goes one step further than the letter of that
// instruction: instead of hand-writing DDL for `result_pool_funding_alignment`
// / `result_pool_funding_alignment_sp` / `result_review_history`, it invokes
// THEIR OWN migration classes' `up()` too (1779190000006, 1779190000007,
// 1779190000013, 1779190000014, 1779190000009) — the only genuinely
// hand-written DDL is a minimal `results` stub table (`result_id` PK only).
//
// `results` IS created by a migration —
// `CreatedResultEntities1726504510058` (`src/db/migrations/1726504510058-
// createdResultEntities.ts:29`, confirmed by
// `grep -rn 'CREATE TABLE \`results\`' src/db/migrations/`, one hit). That
// migration's own `up()` cannot be invoked here the way the five
// bilateral-schema migrations above are, because in the same method it also
// adds `ALTER TABLE result_contracts ... FOREIGN KEY (contract_id)
// REFERENCES agresso_contracts(agreement_id)` (`:38`) against a table
// (`agresso_contracts`) that migration does not create and this file never
// builds — invoking it would fail on that FK, not succeed. The hand-written
// stub is therefore a deliberate, justified deviation from "invoke the
// migration's own up()", not a forced one — there is no earlier,
// undocumented migration to fall back on instead; `results` is fully
// accounted for in the migration history, just not invokable here.
//
// The stub deliberately diverges from the real `results` DDL in two ways:
// it omits `result_official_code bigint NOT NULL` (the real table's second
// column), and it omits the six `AuditableEntity` columns (`created_at`,
// `created_by`, `updated_at`, `updated_by`, `is_active`) that every other
// table in this file gets from its migration. Neither is read by anything
// T-13 asserts on. Consequently the fixture's `INSERT INTO results
// (result_id) VALUES (?)` calls are stub-specific — they would fail against
// a `results` table built by the real migration, which requires
// `result_official_code`.
//
// This reduces DDL-drift risk versus hand-transcribing the CREATE TABLE
// statements for the five bilateral-schema tables, while still satisfying
// the instruction's actual intent: every column this task's assertions
// depend on (`sp_role`, `active_primary_alignment`,
// `idx_rpfas_active_primary`) is created by the migration's own code, never
// by hand and never by `synchronize: true`.
export const RESULTS_STUB_DDL = `
  CREATE TABLE \`results\` (
    \`result_id\` bigint NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (\`result_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
`;

export interface SchemaProvenance {
  route: 'b';
  engineVersion: string;
  generationExpression: string;
}

async function dropAll(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
  await queryRunner.query(
    'DROP TABLE IF EXISTS `result_pool_funding_alignment_sp`',
  );
  await queryRunner.query('DROP TABLE IF EXISTS `result_review_history`');
  await queryRunner.query(
    'DROP TABLE IF EXISTS `result_pool_funding_alignment`',
  );
  await queryRunner.query('DROP TABLE IF EXISTS `results`');
  await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Resets the T13 schema to empty, then rebuilds it via the real migration
 * chain (route (b) — see module doc above). Returns provenance evidence:
 * the live MySQL engine version and the `information_schema` generation
 * expression actually present on `active_primary_alignment`, so "the
 * migration ran" is a queried fact rather than a claim.
 */
export async function resetAndBuildT13Schema(
  dataSource: DataSource,
): Promise<SchemaProvenance> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await dropAll(queryRunner);
    await queryRunner.query(RESULTS_STUB_DDL);

    await new CreateResultPoolFundingAlignment1779190000006().up(queryRunner);
    await new CreateResultPoolFundingAlignmentSp1779190000007().up(queryRunner);
    await new RenameLeverCodeToSpCodeOnAlignmentSp1779190000013().up(
      queryRunner,
    );
    await new FixResultPoolFundingAlignmentPartialUnique1779190000014().up(
      queryRunner,
    );
    await new CreateResultReviewHistory1779190000009().up(queryRunner);

    // The migration under test (T-02) — the artifact this whole file exists
    // to prove ran for real.
    await new AddSpRoleToAlignmentSp1786636994078().up(queryRunner);

    const [{ version }] = (await queryRunner.query(
      'SELECT VERSION() AS version',
    )) as { version: string }[];

    const rows = (await queryRunner.query(
      `SELECT GENERATION_EXPRESSION AS expr FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'result_pool_funding_alignment_sp'
         AND column_name = 'active_primary_alignment'`,
    )) as { expr: string }[];

    if (!rows.length) {
      throw new Error(
        'active_primary_alignment column not found after running the T-02 migration — schema was not built by the migration.',
      );
    }

    return {
      route: 'b',
      engineVersion: version,
      generationExpression: rows[0].expr,
    };
  } finally {
    await queryRunner.release();
  }
}

/** Drops every table this file created, for a clean teardown. */
export async function dropT13Schema(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    await dropAll(queryRunner);
  } finally {
    await queryRunner.release();
  }
}
