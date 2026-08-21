import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * Regression fixture for T-02 / T-02b, `docs/specs/bugfix/sp-versioning-roles-id`.
 *
 * Calls the REAL `SP_versioning` and `SP_delete_result_version` stored
 * procedures against the scratch MySQL schema — never asserts on emitted
 * SQL strings (KZ-001). The baseline snapshot carries no business data
 * (design.md §4.1), so this fixture seeds its own minimal, self-contained
 * chains: a reporting platform + report year (shared), and — per test —
 * a portfolio with one impact outcome / one strategic objective and their
 * role lookups, an active non-snapshot `results` row, and one row each in
 * `result_impact_outcomes` / `result_strategic_objectives`. Every seeded
 * row is removed in `afterAll` so reruns leave the scratch schema exactly
 * as they found it.
 *
 * ## T-02 — single version (`it('copies result_impact_outcomes...')`)
 *
 * RED (current `main`, migration `repairSpVersioningObjectiveBlocks` not
 * yet applied): `CALL SP_versioning(...)` fails with MySQL 1054, Unknown
 * column 'roles_id' — the procedure still names a column
 * `1783022620616` dropped from both tables.
 *
 * GREEN (after the migration): the call succeeds; both tables' rows are
 * copied onto the new snapshot's `result_id`, `role_id` is preserved, and
 * each copied row receives a fresh `id` (the source row's id is not
 * reused) — R-SPV-001 AC.1–AC.3.
 *
 * ## T-02b — version → delete-version → re-version (`it('re-versions...')`)
 *
 * A fixture that versions only once structurally cannot see the T-02b
 * defect — it needs a *pre-existing snapshot* for the delete routine to
 * trip over (tasks.md T-02b disqualifier). This case therefore versions
 * its own seeded source twice, with a `CALL SP_delete_result_version`
 * in between, exactly mirroring the application's re-version sequence
 * (`green-checks.repository.ts:294→307`).
 *
 * RED (migration `repairSpDeleteResultVersionObjectiveTables` not yet
 * applied, `repairSpVersioningObjectiveBlocks` applied): the first
 * `CALL SP_versioning(...)` succeeds and creates a snapshot carrying its
 * own `result_impact_outcomes` / `result_strategic_objectives` rows.
 * `CALL SP_delete_result_version(...)` then fails with MySQL 1451 —
 * `SP_delete_result_version` never deletes those two tables, and both
 * hold RESTRICT FKs to `results`, so its final `DELETE FROM results`
 * cannot proceed.
 *
 * GREEN (after the migration): the delete completes, that snapshot's
 * objective rows and its `results` row are gone, and the second
 * `CALL SP_versioning(...)` produces a new snapshot carrying its own,
 * distinct objective rows — R-SPV-002 AC.1–AC.2.
 */
describe('SP_versioning objective-blocks regression fixture (T-02)', () => {
  const uniqueSuffix = Date.now();
  // Comfortably inside JS safe-integer range; astronomically unlikely to
  // collide with anything else that might exist in the schema.
  const resultOfficialCode = 900_000_000_000_000 + uniqueSuffix;
  // T-02b's own official code, distinct from T-02's, so the two `it`s
  // never contend over the same `results` rows.
  const cycleResultOfficialCode = 900_000_000_000_001 + uniqueSuffix;
  // The baseline carries no `report_years` rows; this fixed, far-future
  // year is reserved for this fixture and cleaned up when seeded by it.
  const reportYear = 2094;

  let reportYearSeeded = false;
  let portfolioId: number;
  let impactOutcomeId: number;
  let impactOutcomeRoleId: number;
  let strategicObjectiveId: number;
  let strategicObjectiveRoleId: number;
  let sourceResultId: number;
  let sourceRioId: number;
  let sourceRsoId: number;
  // T-02b's own source `results` row — reuses the portfolio / impact
  // outcome / strategic objective / role lookups seeded above (plain
  // reference data), but is a distinct row so its version → delete →
  // re-version cycle cannot collide with T-02's single-version case.
  let cycleSourceResultId: number;

  beforeAll(async () => {
    await dataSource.initialize();

    // `STAR` is seeded unconditionally by `test/fixtures/global-setup.ts`
    // before any worker starts (T-13 C-4 cleanup, 2026-08-19) — this file no
    // longer creates it itself (removed: the `platformSeeded`-guarded
    // check-then-insert, structurally always a no-op once global-setup runs
    // first).
    const [existingYear] = await dataSource.query(
      `SELECT report_year FROM report_years WHERE report_year = ?`,
      [reportYear],
    );
    if (!existingYear) {
      await dataSource.query(
        `INSERT INTO report_years (report_year) VALUES (?)`,
        [reportYear],
      );
      reportYearSeeded = true;
    }

    let result = await dataSource.query(
      `INSERT INTO portfolios (name, description, start_year, end_year) VALUES (?, ?, ?, ?)`,
      [
        'T-02 fixture portfolio',
        'sp-versioning-roles-id regression fixture',
        reportYear,
        reportYear,
      ],
    );
    portfolioId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO impact_outcomes (name, portfolio_id) VALUES (?, ?)`,
      ['T-02 fixture impact outcome', portfolioId],
    );
    impactOutcomeId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO result_impact_outcome_roles (name) VALUES (?)`,
      ['T-02 fixture impact-outcome role'],
    );
    impactOutcomeRoleId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO strategic_objectives (name, portfolio_id) VALUES (?, ?)`,
      ['T-02 fixture strategic objective', portfolioId],
    );
    strategicObjectiveId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO result_strategic_objective_roles (name) VALUES (?)`,
      ['T-02 fixture strategic-objective role'],
    );
    strategicObjectiveRoleId = result.insertId;

    result = await dataSource.query(
      // result_status_id has a non-NULL DEFAULT ('4') plus an FK to
      // result_status, which the baseline seeds with no rows — set it
      // explicitly to NULL (a valid, FK-exempt value) rather than letting
      // the column default apply.
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'STAR', ?, 0, NULL)`,
      [resultOfficialCode, reportYear],
    );
    sourceResultId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO result_impact_outcomes (is_active, result_id, impact_outcome_id, role_id)
       VALUES (1, ?, ?, ?)`,
      [sourceResultId, impactOutcomeId, impactOutcomeRoleId],
    );
    sourceRioId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO result_strategic_objectives (is_active, result_id, strategic_objective_id, role_id)
       VALUES (1, ?, ?, ?)`,
      [sourceResultId, strategicObjectiveId, strategicObjectiveRoleId],
    );
    sourceRsoId = result.insertId;

    result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'STAR', ?, 0, NULL)`,
      [cycleResultOfficialCode, reportYear],
    );
    cycleSourceResultId = result.insertId;

    await dataSource.query(
      `INSERT INTO result_impact_outcomes (is_active, result_id, impact_outcome_id, role_id)
       VALUES (1, ?, ?, ?)`,
      [cycleSourceResultId, impactOutcomeId, impactOutcomeRoleId],
    );

    await dataSource.query(
      `INSERT INTO result_strategic_objectives (is_active, result_id, strategic_objective_id, role_id)
       VALUES (1, ?, ?, ?)`,
      [cycleSourceResultId, strategicObjectiveId, strategicObjectiveRoleId],
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const officialCode of [resultOfficialCode, cycleResultOfficialCode]) {
      const resultRows: { result_id: number }[] = await dataSource.query(
        `SELECT result_id FROM results WHERE result_official_code = ?`,
        [officialCode],
      );
      const resultIds = resultRows.map((r) => r.result_id);
      if (resultIds.length) {
        await dataSource.query(
          `DELETE FROM result_impact_outcomes WHERE result_id IN (${resultIds.join(',')})`,
        );
        await dataSource.query(
          `DELETE FROM result_strategic_objectives WHERE result_id IN (${resultIds.join(',')})`,
        );
        await dataSource.query(
          `DELETE FROM results WHERE result_official_code = ?`,
          [officialCode],
        );
      }
    }

    await dataSource.query(`DELETE FROM impact_outcomes WHERE id = ?`, [
      impactOutcomeId,
    ]);
    await dataSource.query(
      `DELETE FROM result_impact_outcome_roles WHERE id = ?`,
      [impactOutcomeRoleId],
    );
    await dataSource.query(`DELETE FROM strategic_objectives WHERE id = ?`, [
      strategicObjectiveId,
    ]);
    await dataSource.query(
      `DELETE FROM result_strategic_objective_roles WHERE id = ?`,
      [strategicObjectiveRoleId],
    );
    await dataSource.query(`DELETE FROM portfolios WHERE id = ?`, [
      portfolioId,
    ]);

    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }
    // `STAR` is NEVER created or torn down here — `global-setup.ts` owns it
    // exclusively (see this file's `beforeAll`). The `platformSeeded` guard
    // that used to gate this delete was removed at T-13 (C-4 cleanup): the
    // row it guarded is one `global-setup.ts` seeds unconditionally before
    // any worker starts, so the guard was structurally always `false`.

    await dataSource.destroy();
  });

  it('copies result_impact_outcomes and result_strategic_objectives into the new snapshot with role_id preserved and a fresh id', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [resultOfficialCode]);

    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [resultOfficialCode],
    );
    expect(snapshot).toBeDefined();
    const newResultId = snapshot.result_id;
    expect(newResultId).not.toBe(sourceResultId);

    const [copiedRio] = await dataSource.query(
      `SELECT id, role_id FROM result_impact_outcomes WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedRio).toBeDefined();
    expect(copiedRio.role_id).toBe(impactOutcomeRoleId);
    expect(copiedRio.id).not.toBe(sourceRioId);

    const [copiedRso] = await dataSource.query(
      `SELECT id, role_id FROM result_strategic_objectives WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedRso).toBeDefined();
    expect(copiedRso.role_id).toBe(strategicObjectiveRoleId);
    expect(copiedRso.id).not.toBe(sourceRsoId);
  }, 30000);

  it('re-versions a result whose existing snapshot carries objective rows, without losing the new snapshot to a foreign-key failure (T-02b)', async () => {
    // First version: creates snapshot1, which owns its own copies of the
    // two objective-table rows (this is the "pre-existing snapshot" the
    // T-02b disqualifier requires — a fixture that versions only once
    // cannot see the defect).
    await dataSource.query(`CALL SP_versioning(?)`, [cycleResultOfficialCode]);

    const [snapshot1] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [cycleResultOfficialCode],
    );
    expect(snapshot1).toBeDefined();
    const snapshot1Id = snapshot1.result_id;
    expect(snapshot1Id).not.toBe(cycleSourceResultId);

    const [snapshot1Rio] = await dataSource.query(
      `SELECT id FROM result_impact_outcomes WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(snapshot1Rio).toBeDefined();
    const [snapshot1Rso] = await dataSource.query(
      `SELECT id FROM result_strategic_objectives WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(snapshot1Rso).toBeDefined();

    // The application's re-version sequence: delete the existing
    // snapshot, then version again (green-checks.repository.ts:294→307).
    // Before `repairSpDeleteResultVersionObjectiveTables`, this call
    // raises MySQL 1451 — snapshot1's own objective rows are never
    // deleted by `SP_delete_result_version`, and both tables hold
    // RESTRICT FKs to `results`, so its final `DELETE FROM results`
    // cannot proceed.
    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      cycleResultOfficialCode,
      reportYear,
    ]);

    const remainingSnapshot1Rows = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(remainingSnapshot1Rows).toHaveLength(0);

    const remainingSnapshot1Rio = await dataSource.query(
      `SELECT id FROM result_impact_outcomes WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(remainingSnapshot1Rio).toHaveLength(0);

    const remainingSnapshot1Rso = await dataSource.query(
      `SELECT id FROM result_strategic_objectives WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(remainingSnapshot1Rso).toHaveLength(0);

    // Second version: the source row (untouched by either the versioning
    // or the delete routine) produces a fresh snapshot carrying its own,
    // distinct objective rows.
    await dataSource.query(`CALL SP_versioning(?)`, [cycleResultOfficialCode]);

    const [snapshot2] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [cycleResultOfficialCode],
    );
    expect(snapshot2).toBeDefined();
    const snapshot2Id = snapshot2.result_id;
    expect(snapshot2Id).not.toBe(snapshot1Id);
    expect(snapshot2Id).not.toBe(cycleSourceResultId);

    const [snapshot2Rio] = await dataSource.query(
      `SELECT id, role_id FROM result_impact_outcomes WHERE result_id = ?`,
      [snapshot2Id],
    );
    expect(snapshot2Rio).toBeDefined();
    expect(snapshot2Rio.role_id).toBe(impactOutcomeRoleId);

    const [snapshot2Rso] = await dataSource.query(
      `SELECT id, role_id FROM result_strategic_objectives WHERE result_id = ?`,
      [snapshot2Id],
    );
    expect(snapshot2Rso).toBeDefined();
    expect(snapshot2Rso.role_id).toBe(strategicObjectiveRoleId);
  }, 30000);
});
