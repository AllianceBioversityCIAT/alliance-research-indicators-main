import { QueryRunner } from 'typeorm';
import { ConvertPrmsSyncTablesCollation1792681023849 } from '../migrations/1792681023849-convertPrmsSyncTablesCollation';

/**
 * Statement text for `1792681023849-convertPrmsSyncTablesCollation`.
 * The SQL is not executed here. The disposable TEST run is the execution gate.
 */
describe('convertPrmsSyncTablesCollation migration', () => {
  const migration = new ConvertPrmsSyncTablesCollation1792681023849();

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

  it('converts both sync tables to utf8mb4_0900_ai_ci', async () => {
    const sqls = await statements('up');

    expect(sqls).toContain(
      'ALTER TABLE `result_prms_sync_log` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
    );
    expect(sqls).toContain(
      'ALTER TABLE `result_prms_sync_history` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
    );
  });

  it('converts both sync tables back to utf8mb4_unicode_520_ci', async () => {
    const sqls = await statements('down');

    expect(sqls).toContain(
      'ALTER TABLE `result_prms_sync_log` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci',
    );
    expect(sqls).toContain(
      'ALTER TABLE `result_prms_sync_history` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci',
    );
  });
});
