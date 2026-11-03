import { QueryRunner } from 'typeorm';
import { AddPlatformCodeToPrmsSyncTables1792673320363 } from '../migrations/1792673320363-addPlatformCodeToPrmsSyncTables';

/**
 * Statement order and backfill shape for
 * `1792673320363-addPlatformCodeToPrmsSyncTables`.
 * The SQL is not executed here. The disposable TEST run is the execution gate.
 */
describe('addPlatformCodeToPrmsSyncTables migration', () => {
  const migration = new AddPlatformCodeToPrmsSyncTables1792673320363();

  const statements = async (direction: 'up' | 'down'): Promise<string[]> => {
    const query = jest.fn().mockResolvedValue(undefined);
    await migration[direction]({ query } as unknown as QueryRunner);
    return query.mock.calls.map((call) => {
      expect(call[1]).toBeUndefined();
      const sql = String(call[0]);
      expect(sql).not.toMatch(/\?|:[a-zA-Z]/);
      return sql;
    });
  };

  const at = (sqls: string[], pattern: RegExp): number =>
    sqls.findIndex((sql) => pattern.test(sql));

  it('pre-checks collisions, then adds nullable columns, backfills, sets NOT NULL, and swaps indexes', async () => {
    const sqls = await statements('up');

    const collision = at(
      sqls,
      /HAVING COUNT\(DISTINCT chosen\.source_reference\) > 1/,
    );
    const addLog = at(
      sqls,
      /ALTER TABLE `result_prms_sync_log` ADD `platform_code` varchar\(50\) NULL/,
    );
    const addHistory = at(
      sqls,
      /ALTER TABLE `result_prms_sync_history` ADD `platform_code` varchar\(50\) NULL/,
    );
    const updateLog = at(sqls, /UPDATE `result_prms_sync_log`/);
    const updateHistory = at(sqls, /UPDATE `result_prms_sync_history`/);
    const notNull = at(
      sqls,
      /ALTER TABLE `result_prms_sync_log` MODIFY `platform_code` varchar\(50\) NOT NULL/,
    );
    const dropLog = at(sqls, /DROP INDEX `idx_result_prms_sync_log_code_year`/);
    const dropHistory = at(
      sqls,
      /DROP INDEX `idx_result_prms_sync_history_code_year`/,
    );
    const createLog = at(
      sqls,
      /CREATE INDEX `idx_result_prms_sync_log_code_year` ON `result_prms_sync_log` \(`platform_code`, `external_reference`, `result_year`\)/,
    );
    const createHistory = at(
      sqls,
      /CREATE INDEX `idx_result_prms_sync_history_code_year` ON `result_prms_sync_history` \(`platform_code`, `result_official_code`, `result_year`\)/,
    );

    expect(collision).toBeLessThan(addLog);
    expect(addLog).toBeLessThan(addHistory);
    expect(addHistory).toBeLessThan(updateLog);
    expect(updateLog).toBeLessThan(updateHistory);
    expect(Math.max(updateLog, updateHistory)).toBeLessThan(notNull);
    expect(notNull).toBeLessThan(dropLog);
    expect(dropLog).toBeLessThan(dropHistory);
    expect(dropHistory).toBeLessThan(createLog);
    expect(createLog).toBeLessThan(createHistory);
    expect(collision).toBe(0);
    expect(sqls[collision]).not.toMatch(
      /\b(ALTER|UPDATE|INSERT|DELETE|CREATE|DROP|CALL|SIGNAL)\b/,
    );
  });

  it('tags a STAR match as STAR and leaves the reference bare', async () => {
    const sql = (await statements('up')).find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_log`'),
    );

    expect(sql).toContain(
      "r.platform_code = 'STAR' OR r.platform_code IS NULL",
    );
    expect(sql).toContain("THEN 'STAR'");
    expect(sql).toContain(
      "WHEN picked.platform_code = 'STAR' THEN picked.source_reference",
    );
  });

  it('tags a TIP-only match as TIP and rewrites the reference to TIP-<code>', async () => {
    const sql = (await statements('up')).find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_log`'),
    );

    expect(sql).toContain(
      'WHEN COUNT(DISTINCT r.platform_code) = 1 THEN MIN(r.platform_code)',
    );
    expect(sql).toContain(
      "CONCAT(picked.platform_code, '-', picked.source_reference)",
    );
  });

  it('tags a log row with no matching result as STAR', async () => {
    const sql = (await statements('up')).find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_log`'),
    );

    expect(sql).toContain("WHEN COUNT(r.result_id) = 0 THEN 'STAR'");
  });

  it('raises from the collision pre-check and issues no DDL', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ new_reference: 'TIP-123', result_year: 2026 }]);

    await expect(
      migration.up({ query } as unknown as QueryRunner),
    ).rejects.toThrow('Rewritten sync-log key collides with an existing row');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('backfills history: correlated and canonical STAR rows to STAR, otherwise NULL', async () => {
    const sql = (await statements('up')).find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_history`'),
    );

    expect(sql).toContain(
      "WHEN `correlation_outcome` = 'CORRELATED' THEN 'STAR'",
    );
    expect(sql).toContain("WHEN `event_source` = 'STAR'");
    expect(sql).toContain("REGEXP '^[1-9][0-9]{0,15}$'");
    expect(sql).toContain('ELSE NULL');
  });

  it('down drops the new indexes, restores the old ones, undoes rewritten references, then drops the columns', async () => {
    const sqls = await statements('down');

    const dropLog = at(sqls, /DROP INDEX `idx_result_prms_sync_log_code_year`/);
    const dropHistory = at(
      sqls,
      /DROP INDEX `idx_result_prms_sync_history_code_year`/,
    );
    const createLog = at(
      sqls,
      /CREATE INDEX `idx_result_prms_sync_log_code_year` ON `result_prms_sync_log` \(`external_reference`, `result_year`\)/,
    );
    const createHistory = at(
      sqls,
      /CREATE INDEX `idx_result_prms_sync_history_code_year` ON `result_prms_sync_history` \(`result_official_code`, `result_year`\)/,
    );
    const restore = at(
      sqls,
      /SET `external_reference` = SUBSTRING\(`external_reference`, CHAR_LENGTH\(`platform_code`\) \+ 2\)/,
    );
    const dropColumn = at(sqls, /DROP COLUMN `platform_code`/);

    expect(dropLog).toBeLessThan(dropHistory);
    expect(dropHistory).toBeLessThan(createLog);
    expect(createLog).toBeLessThan(createHistory);
    expect(createHistory).toBeLessThan(restore);
    expect(restore).toBeLessThan(dropColumn);
    expect(sqls[restore]).toContain("`platform_code` <> 'STAR'");
  });

  it('preserves updated_at on every backfill and restore UPDATE', async () => {
    const up = await statements('up');
    const down = await statements('down');
    const logBackfill = up.find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_log`'),
    );
    const historyBackfill = up.find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_history`'),
    );
    const restore = down.find((statement) =>
      statement.startsWith('UPDATE `result_prms_sync_log`'),
    );

    expect(logBackfill).toContain('l.updated_at = l.updated_at');
    expect(historyBackfill).toContain('`updated_at` = `updated_at`');
    expect(restore).toContain('`updated_at` = `updated_at`');
  });
});
