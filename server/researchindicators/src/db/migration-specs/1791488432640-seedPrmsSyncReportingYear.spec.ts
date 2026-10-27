import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { AppConfigKey } from '../../domain/entities/app-config/enum/app-config-key.enum';
import { SeedPrmsSyncReportingYear1791488432640 } from '../migrations/1791488432640-seedPrmsSyncReportingYear';

/**
 * Structural spec for the ARI_PRMS_SYNC seed (T-01, R-PRY-001, D-11).
 *
 * Asserts SQL text only. It does not open MySQL. A re-run keeping an
 * existing simple_value such as 2030 is the INSERT IGNORE statement
 * itself: the captured SQL must not assign simple_value on conflict.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1791488432640-seedPrmsSyncReportingYear.ts',
);

const DESCRIPTION =
  'Reporting year: PRMS sync, Pool Funding editing, ToC year, CLARISA projects phase';

function recordingRunner(): {
  runner: QueryRunner;
  calls: { sql: string; params: unknown[] }[];
} {
  const calls: { sql: string; params: unknown[] }[] = [];
  const runner = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params: params ?? [] });
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

describe('SeedPrmsSyncReportingYear1791488432640', () => {
  const source = readFileSync(MIGRATION_FILE, 'utf8');

  it('explains in source why the seed is not ON DUPLICATE KEY UPDATE', () => {
    expect(source).toContain('INSERT IGNORE');
    expect(source).toContain('not ON DUPLICATE KEY UPDATE');
    expect(source).toContain('2030');
  });

  it('re-running up keeps an existing 2030 because the SQL is INSERT IGNORE', async () => {
    const migration = new SeedPrmsSyncReportingYear1791488432640();
    const { runner, calls } = recordingRunner();

    await migration.up(runner);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('INSERT IGNORE');
    expect(calls[0].sql).not.toContain('ON DUPLICATE KEY UPDATE');
    expect(calls[0].params).toEqual([
      AppConfigKey.ARI_PRMS_SYNC,
      '2026',
      DESCRIPTION,
      'API',
      'PRMS',
    ]);
  });

  it('down deletes the ARI_PRMS_SYNC row', async () => {
    const migration = new SeedPrmsSyncReportingYear1791488432640();
    const { runner, calls } = recordingRunner();

    await migration.down(runner);

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('DELETE FROM app_config');
    expect(calls[0].params).toEqual([AppConfigKey.ARI_PRMS_SYNC]);
  });
});
