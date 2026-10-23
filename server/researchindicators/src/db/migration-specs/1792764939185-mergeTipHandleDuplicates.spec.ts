import { QueryRunner } from 'typeorm';
import { MergeTipHandleDuplicates1792764939185 } from '../migrations/1792764939185-mergeTipHandleDuplicates';

/**
 * Statement order for `1792764939185-mergeTipHandleDuplicates`.
 * The SQL is not executed here. The disposable TEST run is the execution gate.
 */
describe('mergeTipHandleDuplicates migration', () => {
  const migration = new MergeTipHandleDuplicates1792764939185();

  type Fixture = {
    sync?: unknown[];
    live?: unknown[];
    links?: unknown[];
    snapshots?: unknown[];
    logged?: unknown[];
    error?: string;
  };

  const capture = async (
    direction: 'up' | 'down',
    fixture: Fixture = {},
  ): Promise<string[]> => {
    const query = jest.fn(async (...args: unknown[]) => {
      expect(args[1]).toBeUndefined();
      const sql = String(args[0]);
      expect(sql).not.toMatch(/\?|:[a-zA-Z]/);
      if (sql.includes('result_prms_sync_log')) return fixture.sync ?? [];
      if (sql.includes('group_anchor')) return fixture.live ?? [];
      if (sql.startsWith('SELECT') && sql.includes('link_result_id')) {
        return fixture.links ?? [];
      }
      if (sql.startsWith('SELECT') && sql.includes('is_snapshot` = 1')) {
        return fixture.snapshots ?? [];
      }
      if (sql.startsWith('SELECT') && sql.includes('tip_handle_merge_log')) {
        return fixture.logged ?? [];
      }
      return undefined;
    });

    const run = migration[direction]({ query } as unknown as QueryRunner);
    if (fixture.error) {
      await expect(run).rejects.toThrow(fixture.error);
    } else {
      await run;
    }

    return query.mock.calls.map((call) => String(call[0]));
  };

  const at = (sqls: string[], pattern: RegExp): number =>
    sqls.findIndex((sql) => pattern.test(sql));

  const live = (
    resultId: number,
    code: number,
    year: number,
    anchor: number,
    prms: number | null = null,
    synced = 0,
  ) => ({
    result_id: resultId,
    result_official_code: code,
    report_year_id: year,
    prms_result_code: prms,
    is_synced_to_prms: synced,
    is_snapshot: 0,
    group_anchor: anchor,
  });

  const link = (
    linkId: number,
    resultId: number,
    otherId: number,
    roleId: number,
  ) => ({
    link_result_id: linkId,
    result_id: resultId,
    other_result_id: otherId,
    link_result_role_id: roleId,
  });

  const noLinkPair = {
    live: [live(10, 21370, 2025, 10), live(11, 28469, 2026, 10)],
  };

  const bothLinked = {
    live: [live(20, 100, 2025, 20), live(21, 200, 2026, 20)],
    links: [link(501, 50, 20, 1), link(502, 60, 21, 1)],
  };

  it('keeps placeholders out of every statement on the happy path and on down', async () => {
    await capture('up', {
      ...noLinkPair,
      ...bothLinked,
      live: [...noLinkPair.live, ...bothLinked.live],
      links: bothLinked.links,
    });
    await capture('down');
  });

  it('runs the read-only prechecks before creating the log table', async () => {
    const sqls = await capture('up', noLinkPair);
    const sync = at(sqls, /FROM `result_prms_sync_log`/);
    const groups = at(sqls, /AS group_anchor/);
    const links = at(sqls, /SELECT[\s\S]*link_result_id/);
    const snapshots = at(sqls, /SELECT[\s\S]*`is_snapshot` = 1/);
    const create = at(
      sqls,
      /CREATE TABLE IF NOT EXISTS `tip_handle_merge_log`/,
    );

    expect(sync).toBeGreaterThanOrEqual(0);
    expect(groups).toBeGreaterThan(sync);
    expect(links).toBeGreaterThan(groups);
    expect(snapshots).toBeGreaterThan(links);
    expect(create).toBeGreaterThan(snapshots);
  });

  it('preserves updated_at on every results and link_results update', async () => {
    const up = await capture('up', bothLinked);
    const down = await capture('down');
    const updates = [...up, ...down].filter(
      (sql) =>
        sql.startsWith('UPDATE `results`') ||
        sql.startsWith('UPDATE `link_results`'),
    );

    expect(updates.length).toBeGreaterThan(0);
    for (const sql of updates) {
      expect(sql).toMatch(/`updated_at` = (?:[a-z]+\.)?`updated_at`/);
    }
  });

  it('writes links before the demoted row, and finishes one group before the next', async () => {
    const sqls = await capture('up', {
      live: [...noLinkPair.live, ...bothLinked.live],
      links: bothLinked.links,
    });
    const demoteFirst = at(sqls, /UPDATE `results` SET[\s\S]*`result_id` = 10/);
    const repoint = at(
      sqls,
      /UPDATE `link_results` SET `other_result_id` = 21[\s\S]*`link_result_id` = 501/,
    );
    const demoteSecond = at(
      sqls,
      /UPDATE `results` SET[\s\S]*`result_id` = 20/,
    );

    expect(demoteFirst).toBeGreaterThanOrEqual(0);
    expect(repoint).toBeGreaterThan(demoteFirst);
    expect(demoteSecond).toBeGreaterThan(repoint);
  });

  it('keeps the higher year live when neither row is linked, and records the demoted code', async () => {
    const sqls = await capture('up', noLinkPair);
    const demote = sqls.find(
      (sql) =>
        sql.startsWith('UPDATE `results`') && sql.includes('`result_id` = 10'),
    );
    const recorded = sqls.find((sql) =>
      sql.includes("VALUES ('result', 10, 21370, 0, NULL, 1, 11)"),
    );

    expect(demote).toContain('`is_snapshot` = 1');
    expect(demote).toContain('`result_official_code` = 28469');
    expect(
      sqls.some(
        (sql) => sql.includes('`result_id` = 11') && sql.startsWith('UPDATE'),
      ),
    ).toBe(false);
    expect(recorded).toBeDefined();
  });

  it('keeps the linked older row live and demotes the newer row onto its code', async () => {
    const sqls = await capture('up', {
      live: [live(10, 111, 2025, 10), live(11, 222, 2026, 10)],
      links: [link(7, 50, 10, 3)],
    });
    const demote = sqls.find(
      (sql) =>
        sql.startsWith('UPDATE `results`') && sql.includes('`result_id` = 11'),
    );

    expect(demote).toContain('`result_official_code` = 111');
    expect(demote).toContain('`is_snapshot` = 1');
    expect(
      sqls.some(
        (sql) =>
          sql.startsWith('UPDATE `results`') &&
          sql.includes('`result_id` = 10'),
      ),
    ).toBe(false);
    expect(sqls.some((sql) => sql.startsWith('UPDATE `link_results`'))).toBe(
      false,
    );
  });

  it('deactivates a duplicate active link instead of pointing two roles at the survivor', async () => {
    const sqls = await capture('up', {
      live: [live(10, 111, 2025, 10), live(11, 222, 2026, 10)],
      links: [link(1, 50, 10, 7), link(2, 50, 11, 7)],
    });
    const deactivate = sqls.find(
      (sql) =>
        sql.startsWith('UPDATE `link_results`') &&
        sql.includes('`link_result_id` = 1'),
    );

    expect(deactivate).toContain('`is_active` = 0');
    expect(deactivate).not.toContain('`other_result_id`');
    expect(sqls.some((sql) => sql.includes('`other_result_id` = 11'))).toBe(
      false,
    );
  });

  it('deactivates a link owned by the survivor instead of pointing the survivor at itself', async () => {
    const sqls = await capture('up', {
      live: [live(10, 111, 2025, 10), live(11, 222, 2026, 10)],
      links: [link(8, 50, 11, 4), link(9, 11, 10, 5)],
    });
    const selfLink = sqls.find(
      (sql) =>
        sql.startsWith('UPDATE `link_results`') &&
        sql.includes('`link_result_id` = 9'),
    );

    expect(selfLink).toContain('`is_active` = 0');
    expect(selfLink).not.toContain('`other_result_id`');
    expect(sqls.some((sql) => sql.includes('`other_result_id` = 11'))).toBe(
      false,
    );
    expect(
      sqls.some((sql) =>
        sql.includes("VALUES ('link', 9, NULL, NULL, 10, 1, 11)"),
      ),
    ).toBe(true);
  });

  it('records a skipped synced group and does not update its rows', async () => {
    const sqls = await capture('up', {
      live: [live(30, 1, 2024, 30, 9), live(31, 2, 2025, 30)],
    });
    const marker = sqls.find((sql) =>
      sql.includes("VALUES ('result', 30, 1, 0, NULL, 1, 30)"),
    );

    expect(marker).toBeDefined();
    expect(sqls.some((sql) => sql.startsWith('UPDATE `results`'))).toBe(false);
    expect(
      at(sqls, /CREATE TABLE IF NOT EXISTS `tip_handle_merge_log`/),
    ).toBeGreaterThanOrEqual(0);
  });

  it('still demotes a live row that already has a log record', async () => {
    const sqls = await capture('up', {
      ...noLinkPair,
      logged: [{ kind: 'result', row_id: 10 }],
    });

    expect(sqls.some((sql) => sql.includes("VALUES ('result', 10,"))).toBe(
      false,
    );
    expect(
      sqls.some(
        (sql) =>
          sql.startsWith('UPDATE `results`') &&
          sql.includes('`result_id` = 10'),
      ),
    ).toBe(true);
  });

  it('aborts on a TIP sync-log row before creating the log table', async () => {
    const sqls = await capture('up', {
      sync: [{ id: 1 }],
      error: 'TIP rows exist in result_prms_sync_log',
    });

    expect(sqls.some((sql) => sql.includes('CREATE TABLE'))).toBe(false);
  });

  it('aborts when a group has more than two live rows', async () => {
    const sqls = await capture('up', {
      live: [live(1, 1, 2024, 1), live(2, 2, 2025, 1), live(3, 3, 2026, 1)],
      error: 'more than two live rows',
    });

    expect(sqls.some((sql) => sql.includes('CREATE TABLE'))).toBe(false);
  });

  it('aborts when a group has two rows in the same year', async () => {
    const sqls = await capture('up', {
      live: [live(1, 1, 2025, 1), live(2, 2, 2025, 1)],
      error: 'same year',
    });

    expect(sqls.some((sql) => sql.includes('CREATE TABLE'))).toBe(false);
  });

  it('aborts when the demoted target version already exists', async () => {
    const sqls = await capture('up', {
      ...noLinkPair,
      snapshots: [
        { result_id: 99, result_official_code: 28469, report_year_id: 2025 },
      ],
      error: 'collide with an existing version',
    });

    expect(sqls.some((sql) => sql.includes('CREATE TABLE'))).toBe(false);
  });

  it('down restores links, then results, then drops the log', async () => {
    const sqls = await capture('down');
    const links = at(sqls, /UPDATE `link_results`/);
    const results = at(sqls, /UPDATE `results`/);
    const drop = at(sqls, /DROP TABLE IF EXISTS `tip_handle_merge_log`/);

    expect(links).toBeGreaterThanOrEqual(0);
    expect(results).toBeGreaterThan(links);
    expect(drop).toBeGreaterThan(results);
    expect(sqls[links]).toMatch(/`updated_at` = (?:[a-z]+\.)?`updated_at`/);
    expect(sqls[results]).toMatch(/`updated_at` = (?:[a-z]+\.)?`updated_at`/);
  });
});
