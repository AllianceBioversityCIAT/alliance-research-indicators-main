import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * Regression fixture for T-02, `docs/specs/bugfix/sp-versioning-roles-id`.
 *
 * Calls the REAL `SP_versioning` stored procedure against the scratch
 * MySQL schema — never asserts on emitted SQL strings (KZ-001). The
 * baseline snapshot carries no business data (design.md §4.1), so this
 * fixture seeds its own minimal, self-contained chain: a reporting
 * platform + report year, a portfolio with one impact outcome / one
 * strategic objective and their role lookups, an active non-snapshot
 * `results` row, and one row each in `result_impact_outcomes` /
 * `result_strategic_objectives`. Every seeded row is removed in
 * `afterAll` so reruns leave the scratch schema exactly as they found it.
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
 */
describe('SP_versioning objective-blocks regression fixture (T-02)', () => {
  const uniqueSuffix = Date.now();
  // Comfortably inside JS safe-integer range; astronomically unlikely to
  // collide with anything else that might exist in the schema.
  const resultOfficialCode = 900_000_000_000_000 + uniqueSuffix;
  // The baseline carries no `report_years` rows; this fixed, far-future
  // year is reserved for this fixture and cleaned up when seeded by it.
  const reportYear = 2094;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let portfolioId: number;
  let impactOutcomeId: number;
  let impactOutcomeRoleId: number;
  let strategicObjectiveId: number;
  let strategicObjectiveRoleId: number;
  let sourceResultId: number;
  let sourceRioId: number;
  let sourceRsoId: number;

  beforeAll(async () => {
    await dataSource.initialize();

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = 'STAR'`,
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES ('STAR', 'T-02 fixture platform')`,
      );
      platformSeeded = true;
    }

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
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    const resultRows: { result_id: number }[] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ?`,
      [resultOfficialCode],
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
        [resultOfficialCode],
      );
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
    if (platformSeeded) {
      await dataSource.query(
        `DELETE FROM reporting_platforms WHERE platform_code = 'STAR'`,
      );
    }

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
});
