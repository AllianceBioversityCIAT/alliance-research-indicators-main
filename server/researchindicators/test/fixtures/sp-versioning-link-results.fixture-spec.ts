import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * Regression fixture for T-01 / T-02,
 * `docs/specs/bugfix/sp-versioning-link-results`.
 *
 * Calls the REAL `SP_versioning` and `SP_delete_result_version` stored
 * procedures against the scratch MySQL schema — never asserts on emitted
 * SQL strings (KZ-001), the same stance `sp-versioning-objective-blocks`
 * established for this exact procedure.
 *
 * `result_official_code` band (FP-45): `904_000` — the highest band
 * claimed by any sibling `*.fixture-spec.ts` header at the time of writing
 * was `903_0xx` (`innovation-dev-card-facts` /
 * `innovation-use-linked-dev-validation`), so `904_000` is unused. Report
 * year `2116` — every sibling file's own claimed year runs from `2094`
 * through `2115`; `2116` is unused.
 *
 * This file seeds its own `link_result_roles` row rather than reusing
 * `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` (id 5, seeded by
 * `1789000000000-insertInnovationUseLinkedDevRole.ts`) so it stays
 * independent of that migration's content — R-SPL-001 requires the copy
 * to work for "any `link_result_role_id`", not specifically role 5.
 *
 * ## Case 1 — copy (`it('copies the active link_results row...')`)
 *
 * RED (current `main`, `SP_versioning` has no `link_results` block):
 * `CALL SP_versioning(...)` succeeds (it does not touch `link_results` at
 * all), but the assertion that a `link_results` row now exists on the new
 * snapshot's `result_id` fails — `copiedLink` is `undefined`. This is the
 * required red (R-SPL-001 main scenario): the missing-copy assertion, not
 * a setup error.
 *
 * GREEN (after the migration adding the block): the row is copied, its
 * `other_result_id` and `link_result_role_id` are preserved, it receives a
 * fresh `link_result_id`, and the source row is left untouched.
 *
 * ## Case 2 — inactive row not copied
 * ## Case 3 — target-only (`other_result_id`) row not copied
 *
 * Both negative clauses of R-SPL-001 (DD-2). Neither depends on the fix:
 * they pass identically before and after T-02, because in both scenarios
 * `SP_versioning` copies nothing today, and after the fix the added
 * block's `WHERE lr.is_active = TRUE AND lr.result_id = temp_result_id`
 * still excludes them. They exist to prove the fix does NOT overcopy,
 * once T-02 lands — the `sp-versioning-objective-blocks` file makes the
 * same choice for its own negative coverage.
 *
 * ## Case 4 — delete round-trip (`it('re-versions a result...')`)
 *
 * The `sp-versioning-roles-id` T-02b sequence: version → delete-version →
 * version again. Also passes both before and after T-02 today — nothing is
 * ever copied onto the snapshot yet, so there is nothing for
 * `SP_delete_result_version`'s existing `link_results` cleanup
 * (`WHERE result_id = temp_result_id OR other_result_id = temp_result_id`,
 * `1787083305648-AmendLifecycleRoutinesForInnovationUse.ts:1137-1139`) to
 * trip over. It is a forward-looking regression guard: once T-02 starts
 * copying rows onto the snapshot, this proves they do not block the
 * physical delete with a foreign-key failure (MySQL 1451).
 */
describe('SP_versioning link_results regression fixture (T-01)', () => {
  const uniqueSuffix = Date.now();
  const officialCodeBase = 904_000_000_000_000 + uniqueSuffix;
  // Case 1 — copy
  const officialCodeCopySource = officialCodeBase + 0;
  const officialCodeCopyTarget = officialCodeBase + 1;
  // Case 2 — inactive row not copied
  const officialCodeInactiveSource = officialCodeBase + 2;
  const officialCodeInactiveTarget = officialCodeBase + 3;
  // Case 3 — target-only row not copied
  const officialCodeTargetOnlyVersioned = officialCodeBase + 4;
  const officialCodeTargetOnlyOwner = officialCodeBase + 5;
  // Case 4 — delete round-trip
  const officialCodeCycleSource = officialCodeBase + 6;
  const officialCodeCycleTarget = officialCodeBase + 7;

  // Reserved for this fixture; every sibling file's own claimed year runs
  // 2094-2115.
  const reportYear = 2116;

  let reportYearSeeded = false;
  let roleId: number;

  let copySourceResultId: number;
  let copyTargetResultId: number;
  let sourceLinkId: number;

  let inactiveSourceResultId: number;
  let inactiveTargetResultId: number;

  let targetOnlyVersionedResultId: number;
  let targetOnlyOwnerResultId: number;

  let cycleSourceResultId: number;
  let cycleTargetResultId: number;

  const allOfficialCodes = [
    officialCodeCopySource,
    officialCodeCopyTarget,
    officialCodeInactiveSource,
    officialCodeInactiveTarget,
    officialCodeTargetOnlyVersioned,
    officialCodeTargetOnlyOwner,
    officialCodeCycleSource,
    officialCodeCycleTarget,
  ];

  async function insertResult(officialCode: number): Promise<number> {
    const result = await dataSource.query(
      // result_status_id has a non-NULL DEFAULT ('4') plus an FK to
      // result_status, which the baseline seeds with no rows — set it
      // explicitly to NULL (a valid, FK-exempt value) rather than letting
      // the column default apply. Mirrors
      // `sp-versioning-objective-blocks.fixture-spec.ts`.
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, 'STAR', ?, 0, NULL)`,
      [officialCode, reportYear],
    );
    return result.insertId;
  }

  beforeAll(async () => {
    await dataSource.initialize();

    // `STAR` is seeded unconditionally by `test/fixtures/global-setup.ts`
    // before any worker starts — this file does not create it.
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

    const roleResult = await dataSource.query(
      `INSERT INTO link_result_roles (name) VALUES (?)`,
      ['T-01 fixture link role'],
    );
    roleId = roleResult.insertId;

    // Case 1 — copy: an active source result + an active target result +
    // one active link_results row the source owns.
    copySourceResultId = await insertResult(officialCodeCopySource);
    copyTargetResultId = await insertResult(officialCodeCopyTarget);
    const linkResult = await dataSource.query(
      `INSERT INTO link_results (is_active, result_id, other_result_id, link_result_role_id)
       VALUES (1, ?, ?, ?)`,
      [copySourceResultId, copyTargetResultId, roleId],
    );
    sourceLinkId = linkResult.insertId;

    // Case 2 — an inactive link_results row owned by the versioned result.
    inactiveSourceResultId = await insertResult(officialCodeInactiveSource);
    inactiveTargetResultId = await insertResult(officialCodeInactiveTarget);
    await dataSource.query(
      `INSERT INTO link_results (is_active, result_id, other_result_id, link_result_role_id)
       VALUES (0, ?, ?, ?)`,
      [inactiveSourceResultId, inactiveTargetResultId, roleId],
    );

    // Case 3 — the versioned result is only the link's other_result_id
    // (target), never its result_id (owner).
    targetOnlyVersionedResultId = await insertResult(
      officialCodeTargetOnlyVersioned,
    );
    targetOnlyOwnerResultId = await insertResult(officialCodeTargetOnlyOwner);
    await dataSource.query(
      `INSERT INTO link_results (is_active, result_id, other_result_id, link_result_role_id)
       VALUES (1, ?, ?, ?)`,
      [targetOnlyOwnerResultId, targetOnlyVersionedResultId, roleId],
    );

    // Case 4 — delete round-trip: an active link_results row owned by the
    // result that will be versioned, delete-versioned, then re-versioned.
    cycleSourceResultId = await insertResult(officialCodeCycleSource);
    cycleTargetResultId = await insertResult(officialCodeCycleTarget);
    await dataSource.query(
      `INSERT INTO link_results (is_active, result_id, other_result_id, link_result_role_id)
       VALUES (1, ?, ?, ?)`,
      [cycleSourceResultId, cycleTargetResultId, roleId],
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    const resultRows: { result_id: number }[] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code IN (${allOfficialCodes.join(',')})`,
    );
    const resultIds = resultRows.map((r) => r.result_id);
    if (resultIds.length) {
      await dataSource.query(
        `DELETE FROM link_results WHERE result_id IN (${resultIds.join(',')}) OR other_result_id IN (${resultIds.join(',')})`,
      );
      await dataSource.query(
        `DELETE FROM results WHERE result_id IN (${resultIds.join(',')})`,
      );
    }

    await dataSource.query(
      `DELETE FROM link_result_roles WHERE link_result_role_id = ?`,
      [roleId],
    );

    if (reportYearSeeded) {
      await dataSource.query(`DELETE FROM report_years WHERE report_year = ?`, [
        reportYear,
      ]);
    }
    // `STAR` is NEVER created or torn down here — `global-setup.ts` owns it
    // exclusively.

    await dataSource.destroy();
  });

  it('copies the active link_results row the result owns onto the new snapshot, preserving other_result_id and link_result_role_id, with a fresh link_result_id, and leaves the source row untouched', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeCopySource]);

    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCodeCopySource],
    );
    expect(snapshot).toBeDefined();
    const newResultId = snapshot.result_id;
    expect(newResultId).not.toBe(copySourceResultId);

    // This is the missing-copy assertion: RED on current `main` because
    // SP_versioning has no link_results block, so no row exists here.
    const [copiedLink] = await dataSource.query(
      `SELECT link_result_id, other_result_id, link_result_role_id FROM link_results WHERE result_id = ?`,
      [newResultId],
    );
    expect(copiedLink).toBeDefined();
    expect(copiedLink.other_result_id).toBe(copyTargetResultId);
    expect(copiedLink.link_result_role_id).toBe(roleId);
    expect(copiedLink.link_result_id).not.toBe(sourceLinkId);

    // AND IT MUST leave the source row untouched.
    const [sourceLinkAfter] = await dataSource.query(
      `SELECT result_id, other_result_id, link_result_role_id, is_active FROM link_results WHERE link_result_id = ?`,
      [sourceLinkId],
    );
    expect(sourceLinkAfter).toBeDefined();
    expect(sourceLinkAfter.result_id).toBe(copySourceResultId);
    expect(sourceLinkAfter.other_result_id).toBe(copyTargetResultId);
    expect(sourceLinkAfter.link_result_role_id).toBe(roleId);
    expect(Number(sourceLinkAfter.is_active)).toBe(1);
  }, 30000);

  it('does not copy an is_active = FALSE link_results row', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [
      officialCodeInactiveSource,
    ]);

    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCodeInactiveSource],
    );
    expect(snapshot).toBeDefined();

    const copiedRows = await dataSource.query(
      `SELECT link_result_id FROM link_results WHERE result_id = ?`,
      [snapshot.result_id],
    );
    expect(copiedRows).toHaveLength(0);
  }, 30000);

  it('does not copy a link_results row where the versioned result is only the target (other_result_id)', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [
      officialCodeTargetOnlyVersioned,
    ]);

    const [snapshot] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCodeTargetOnlyVersioned],
    );
    expect(snapshot).toBeDefined();

    const copiedRows = await dataSource.query(
      `SELECT link_result_id FROM link_results WHERE result_id = ?`,
      [snapshot.result_id],
    );
    expect(copiedRows).toHaveLength(0);
  }, 30000);

  it('re-versions a result whose existing snapshot carries a link_results row, without losing the new snapshot to a foreign-key failure (T-02b sequence)', async () => {
    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeCycleSource]);

    const [snapshot1] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCodeCycleSource],
    );
    expect(snapshot1).toBeDefined();
    const snapshot1Id = snapshot1.result_id;
    expect(snapshot1Id).not.toBe(cycleSourceResultId);

    // The application's re-version sequence: delete the existing
    // snapshot, then version again (green-checks.repository.ts:294→307).
    await dataSource.query(`CALL SP_delete_result_version(?, ?)`, [
      officialCodeCycleSource,
      reportYear,
    ]);

    const remainingSnapshot1 = await dataSource.query(
      `SELECT result_id FROM results WHERE result_id = ?`,
      [snapshot1Id],
    );
    expect(remainingSnapshot1).toHaveLength(0);

    await dataSource.query(`CALL SP_versioning(?)`, [officialCodeCycleSource]);

    const [snapshot2] = await dataSource.query(
      `SELECT result_id FROM results WHERE result_official_code = ? AND is_snapshot = TRUE`,
      [officialCodeCycleSource],
    );
    expect(snapshot2).toBeDefined();
    expect(snapshot2.result_id).not.toBe(snapshot1Id);
    expect(snapshot2.result_id).not.toBe(cycleSourceResultId);
  }, 30000);
});
