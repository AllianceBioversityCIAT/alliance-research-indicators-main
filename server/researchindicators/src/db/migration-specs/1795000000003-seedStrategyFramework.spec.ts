import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { LoggerUtil } from '../../domain/shared/utils/logger.util';
import { SeedStrategyFramework1795000000003 } from '../migrations/1795000000003-seedStrategyFramework';
import {
  SEED_ELEMENTS,
  SEED_LEVELS,
  SEED_LINKS,
  SEED_OBJECTIVES,
} from '../seeds/seed-data/strategy-framework.data';

/**
 * SQL-shape spec for `1795000000003-seedStrategyFramework`
 * (design section 3.3, D-STF-24, R-STF-011).
 *
 * UNIT test. The dedicated runner records SQL. It is not a MySQL connection.
 *
 * CANNOT PROVE (KZ-017): rollback on this mock does not show that InnoDB
 * undoes the seed, and it does not show that one DELETE per depth is
 * required. Those runs are the scratch gate and T-10. This file checks the
 * statement shape: bound placeholders, no SQL comment, and the delete order.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1795000000003-seedStrategyFramework.ts',
);

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

function assertSqlShape(sql: string, params: unknown[]): void {
  const bare = sql.replace(/'(?:\\'|[^'])*'/g, "''").replace(/`[^`]*`/g, '``');
  expect(bare.match(/--[^\n]*|\/\*[\s\S]*?\*\//g) ?? []).toEqual([]);
  expect(bare.match(/\?/g) ?? []).toHaveLength(params.length);
  expect(bare.replace(/\?/g, '')).not.toMatch(/:(?:\d+|[a-zA-Z][a-zA-Z0-9_]*)/);
}

function harness(answer: (sql: string) => unknown): {
  outer: QueryRunner;
  dedicated: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    query: jest.Mock;
  };
  calls: RecordedQuery[];
} {
  const calls: RecordedQuery[] = [];
  const dedicated = {
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      const recorded = { sql, params: params ?? [] };
      calls.push(recorded);
      return answer(sql);
    }),
  };
  const outer = {
    query: jest.fn(),
    connection: { createQueryRunner: () => dedicated },
  } as unknown as QueryRunner;
  return { outer, dedicated, calls };
}

const depthIds = (depth: number): number[] =>
  SEED_ELEMENTS.filter((element) => element.depth === depth).map(
    (element) => element.id,
  );

describe('SeedStrategyFramework1795000000003', () => {
  const source = readFileSync(MIGRATION_FILE, 'utf8');

  beforeEach(() => {
    jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exports only its migration class and leaves the transaction mode unset', () => {
    const exported = source.match(/^export .+$/gm) ?? [];
    expect(exported).toHaveLength(1);
    expect(exported[0]).toContain('SeedStrategyFramework1795000000003');
    expect(source).toContain('createQueryRunner()');
    expect(source).toContain('startTransaction()');
    expect(source).toContain('commitTransaction()');
    expect(source).toContain('rollbackTransaction()');
    expect(source).toContain('release()');
    expect(source).not.toMatch(/^\s*transaction\s*=/m);
  });

  it('runs the seed on the dedicated runner and commits', async () => {
    const migration = new SeedStrategyFramework1795000000003();
    const { outer, dedicated, calls } = harness((sql) => {
      if (sql.includes('alliance_user_staff')) {
        return [];
      }
      return { affectedRows: 1 };
    });

    await migration.up(outer);

    expect(outer.query).not.toHaveBeenCalled();
    expect(dedicated.connect).toHaveBeenCalledTimes(1);
    expect(dedicated.startTransaction).toHaveBeenCalledTimes(1);
    expect(dedicated.commitTransaction).toHaveBeenCalledTimes(1);
    expect(dedicated.rollbackTransaction).not.toHaveBeenCalled();
    expect(dedicated.release).toHaveBeenCalledTimes(1);
    expect(calls.some((call) => call.sql.includes('INSERT INTO'))).toBe(true);
    for (const call of calls) {
      assertSqlShape(call.sql, call.params);
    }
  });

  it('rolls the dedicated runner back when the seed throws', async () => {
    const migration = new SeedStrategyFramework1795000000003();
    const { outer, dedicated } = harness(() => {
      throw new Error('injected seed failure');
    });

    await expect(migration.up(outer)).rejects.toThrow('injected seed failure');
    expect(dedicated.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(dedicated.commitTransaction).not.toHaveBeenCalled();
    expect(dedicated.release).toHaveBeenCalledTimes(1);
  });

  it('refuses down when a non-seed row depends on a seeded id, and otherwise deletes one depth at a time', async () => {
    const migration = new SeedStrategyFramework1795000000003();
    const blocked = harness((sql) => {
      if (
        sql.includes('institutional_objective_elements') &&
        sql.includes('COUNT')
      ) {
        return [{ cnt: 1 }];
      }
      if (sql.includes('COUNT')) {
        return [{ cnt: 2 }];
      }
      return { affectedRows: 0 };
    });

    await expect(migration.down(blocked.outer)).rejects.toThrow(
      'strategy framework seed down refused: 2 non-seed elements under a seeded parent; 1 links to a seeded element from a non-seeded objective',
    );
    expect(blocked.calls.some((call) => call.sql.startsWith('DELETE'))).toBe(
      false,
    );
    expect(blocked.dedicated.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(blocked.dedicated.commitTransaction).not.toHaveBeenCalled();

    const cleared = harness((sql) => {
      if (sql.includes('COUNT')) {
        return [{ cnt: 0 }];
      }
      return { affectedRows: 0 };
    });
    await migration.down(cleared.outer);

    const deletes = cleared.calls.filter((call) =>
      call.sql.startsWith('DELETE'),
    );
    expect(deletes.map((call) => call.sql)).toEqual([
      expect.stringContaining('DELETE FROM `framework_element_responsibles`'),
      expect.stringContaining('DELETE FROM `institutional_objective_elements`'),
      expect.stringContaining('DELETE FROM `framework_elements`'),
      expect.stringContaining('DELETE FROM `framework_elements`'),
      expect.stringContaining('DELETE FROM `framework_elements`'),
      expect.stringContaining('DELETE FROM `institutional_objectives`'),
      expect.stringContaining('DELETE FROM `framework_levels`'),
    ]);
    expect(deletes[2].params).toEqual(depthIds(3));
    expect(deletes[3].params).toEqual(depthIds(2));
    expect(deletes[4].params).toEqual(depthIds(1));
    expect(deletes[1].params).toEqual(SEED_LINKS.map((link) => link.id));
    expect(deletes[5].params).toEqual(
      SEED_OBJECTIVES.map((objective) => objective.id),
    );
    expect(deletes[6].params).toEqual(SEED_LEVELS.map((level) => level.id));
    for (const call of cleared.calls) {
      assertSqlShape(call.sql, call.params);
      expect(call.sql).not.toMatch(/IN\s*\(\s*\d/);
    }
    expect(cleared.dedicated.commitTransaction).toHaveBeenCalledTimes(1);
  });
});
