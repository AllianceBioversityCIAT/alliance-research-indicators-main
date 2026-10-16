import { dataSource } from '../../../src/db/config/mysql/orm.test.config';

/**
 * T-12 (`docs/specs/innovation-use/data-model-and-catalog`) — R-IU-001 AC.3
 * integration round trip: insert a `result_innovation_use` row and read it
 * back, on the REAL scratch schema (§6.5 harness), asserting both business
 * columns and the audit columns survive the round trip.
 *
 * `AuditableEntity`'s `created_by`/`updated_by` are populated by the
 * application layer from `request.user` (chunk 2's write endpoint, out of
 * scope here per requirements.md R-IU-001 "Out of scope"). This fixture has
 * no HTTP context, so it sets them explicitly on the INSERT exactly as that
 * endpoint would, then proves the persistence layer preserves them — the
 * clause this task can prove without the endpoint.
 *
 * Reserves report year 2097, distinct from the other fixture files in this
 * directory, so it cannot collide with their cleanup.
 */
describe('result_innovation_use detail-row round trip (T-12, R-IU-001 AC.3)', () => {
  const uniqueSuffix = Date.now();
  const reportYear = 2097;
  const actingUserId = 4242;

  let platformSeeded = false;
  let reportYearSeeded = false;
  let resultId: number | undefined;

  beforeAll(async () => {
    await dataSource.initialize();

    const [existingPlatform] = await dataSource.query(
      `SELECT platform_code FROM reporting_platforms WHERE platform_code = 'T12RT1'`,
    );
    if (!existingPlatform) {
      await dataSource.query(
        `INSERT INTO reporting_platforms (platform_code, platform_name) VALUES ('T12RT1', 'T-12 round-trip fixture platform')`,
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

    const officialCode = 900_300_000_000_000 + uniqueSuffix;
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'T12RT1', ?, 0, NULL)`,
      [officialCode, reportYear],
    );
    resultId = result.insertId;
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    if (resultId !== undefined) {
      await dataSource.query(
        `DELETE FROM result_innovation_use WHERE result_id = ?`,
        [resultId],
      );
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
        `DELETE FROM reporting_platforms WHERE platform_code = 'T12RT1'`,
      );
    }

    await dataSource.destroy();
  });

  it('persists innovation_use_level_id, innovation_use_level_explanation, and the audit columns, retrievable by result_id', async () => {
    expect(resultId).toBeDefined();

    await dataSource.query(
      `INSERT INTO result_innovation_use (result_id, innovation_use_level_id, innovation_use_level_explanation, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        resultId,
        7,
        'Round-trip fixture explanation for level 6.',
        actingUserId,
        actingUserId,
      ],
    );

    const [row] = await dataSource.query(
      `SELECT result_id, innovation_use_level_id, innovation_use_level_explanation,
              is_active, deleted_at, created_by, updated_by
       FROM result_innovation_use WHERE result_id = ?`,
      [resultId],
    );

    expect(row).toBeDefined();
    expect(row.result_id).toBe(resultId);
    expect(row.innovation_use_level_id).toBe(7);
    expect(row.innovation_use_level_explanation).toBe(
      'Round-trip fixture explanation for level 6.',
    );
    // AC.4 — is_active defaults to 1, deleted_at to NULL.
    expect(Number(row.is_active)).toBe(1);
    expect(row.deleted_at).toBeNull();
    // Audit columns populated from the acting user, and retrievable.
    expect(Number(row.created_by)).toBe(actingUserId);
    expect(Number(row.updated_by)).toBe(actingUserId);
  });
});
