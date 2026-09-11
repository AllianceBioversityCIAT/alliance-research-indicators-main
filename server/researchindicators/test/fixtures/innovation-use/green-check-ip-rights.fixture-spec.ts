import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — F10, §6.5.
 *
 * Backs R-IU-007 (via F10) / design.md §6.2: T-11 added
 * `IndicatorsEnum.INNOVATION_USE` to the array `green-checks.repository.ts`
 * appends `intellectual_property_validation(...) as ip_rights` for, which
 * means an Innovation Use result with no `result_ip_rights` row cannot
 * submit. This fixture calls the REAL `intellectual_property_validation`
 * stored function directly (never asserts on emitted SQL — KZ-001) against
 * a result with no `result_ip_rights` row and confirms it returns `0`.
 *
 * `results.indicator_id` has an FK to the (empty, in this scratch schema)
 * `indicators` catalog table and is nullable; rather than build out that
 * catalog row's own FK chain (`indicator_types`, etc.) for a fact the
 * function itself does not depend on — `intellectual_property_validation`
 * only special-cases `indicatorId = 2` (Innovation Dev) and takes the
 * general path for every other value, NULL included — this fixture leaves
 * `indicator_id` NULL. That is behaviorally identical to indicator 6 for
 * this function and is recorded here rather than asserted silently.
 *
 * Reserves report year 2098, distinct from the other fixture files in this
 * directory.
 */
describe('intellectual_property_validation over an Innovation-Use-shaped result with no result_ip_rights row (T-12, F10)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2098;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let resultId: number | undefined;

  beforeAll(async () => {
    await dataSource.initialize();

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = 'T12F10'`,
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES ('T12F10', 'T-12 F10 fixture platform')`,
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

    const officialCode = 900_400_000_000_000 + uniqueSuffix;
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id)
       VALUES (1, ?, 'T12F10', ?, 0, NULL, NULL)`,
      [officialCode, reportYear],
    );
    resultId = result.insertId;
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    if (resultId !== undefined) {
      await dataSource.query(`DELETE FROM results WHERE result_id = ?`, [
        resultId,
      ]);
    }

    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }
    if (platformSeeded) {
      await dataSource.query(
        `DELETE FROM reporting_platforms WHERE platform_code = 'T12F10'`,
      );
    }

    await dataSource.destroy();
  });

  it('returns 0 (ip_rights not green) when no result_ip_rights row exists', async () => {
    expect(resultId).toBeDefined();

    const [existingIpRights] = await dataSource.query(
      `SELECT result_ip_rights_id FROM result_ip_rights WHERE result_ip_rights_id = ?`,
      [resultId],
    );
    expect(existingIpRights).toBeUndefined();

    const [row] = await dataSource.query(
      'SELECT intellectual_property_validation(?) AS ip_rights',
      [resultId],
    );

    expect(Number(row.ip_rights)).toBe(0);
  });
});
