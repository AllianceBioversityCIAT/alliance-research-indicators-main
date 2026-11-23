import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  SEED_LINKS,
  SEED_PORTFOLIO_ID,
} from '../src/db/seeds/seed-data/strategy-framework.data';
import { seedStrategyFramework } from '../src/db/seeds/strategy-framework.seed';
import {
  countPortfolioRows,
  createStfDataSource,
  dropBatchDatabase,
  prepareBatchDatabase,
  runFourMigrationsWithInjectedSeedFailure,
  SEEDED_PORTFOLIO_ID,
} from './support/strategy-framework-fixtures';

/**
 * Seed contents and batch atomicity
 * (R-STF-011 AC.1/AC.3, NFR-STF-002, P-26, D-STF-24).
 *
 * AC.2 (the unmatched-name list) is the seed task's log, not a row in this
 * database, so it is not re-asserted here.
 *
 * The batch runs on `ari_scratch_stf_batch` inside the scratch container:
 * the four migrations are the only ones registered, so they are pending
 * together without replaying the chain. The scratch itself is not migrated.
 * Scope (KZ-017): a zero count on that side schema is not a Dev deploy.
 */
describe('Strategy framework — seed and batch atomicity (T-10)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-seed');
  });

  afterAll(async () => {
    try {
      if (dataSource?.isInitialized) await dropBatchDatabase(dataSource);
    } finally {
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  it('R-STF-011 AC.1: Portfolio 2 has 3 levels, 4/13/31 elements, 28 IOBs, 36 links, only 1.3.2 unlinked, 4.6 absent, both pre-merge links on 4.1.1', async () => {
    const counts = await countPortfolioRows(dataSource, SEEDED_PORTFOLIO_ID);
    expect(counts.levels).toBe(3);
    expect(counts.elements).toBe(48);
    expect(counts.objectives).toBe(28);
    expect(counts.links).toBe(36);
    expect(counts.responsibles).toBe(35);

    const byDepth: Array<{ depth: number; n: number }> = await dataSource.query(
      `SELECT l.depth AS depth, COUNT(*) AS n
         FROM framework_elements e
         JOIN framework_levels l ON l.id = e.level_id
        WHERE e.portfolio_id = ?
        GROUP BY l.depth
        ORDER BY l.depth`,
      [SEEDED_PORTFOLIO_ID],
    );
    expect(byDepth.map((row) => Number(row.n))).toEqual([4, 13, 31]);

    const unlinked: Array<{ code: string }> = await dataSource.query(
      `SELECT e.code AS code
         FROM framework_elements e
         JOIN framework_levels l ON l.id = e.level_id
         LEFT JOIN institutional_objective_elements ioe ON ioe.element_id = e.id
        WHERE e.portfolio_id = ? AND l.depth = 3 AND ioe.id IS NULL
        ORDER BY e.code`,
      [SEEDED_PORTFOLIO_ID],
    );
    expect(unlinked.map((row) => row.code)).toEqual(['1.3.2']);

    const every: Array<{ code: string; links: number }> =
      await dataSource.query(
        `SELECT io.code AS code, COUNT(ioe.id) AS links
           FROM institutional_objectives io
           LEFT JOIN institutional_objective_elements ioe
             ON ioe.institutional_objective_id = io.id
          WHERE io.portfolio_id = ?
          GROUP BY io.id
         HAVING COUNT(ioe.id) = 0`,
        [SEEDED_PORTFOLIO_ID],
      );
    expect(every).toEqual([]);

    const absent = await dataSource.query(
      `SELECT code FROM framework_elements WHERE portfolio_id = ? AND code = '4.6'`,
      [SEEDED_PORTFOLIO_ID],
    );
    expect(absent).toEqual([]);

    const preMerge = SEED_LINKS.filter((link) =>
      [
        '3.2.1 Innovation development',
        '4.1.1 Uptake of innovations for system change',
      ].includes(link.sourceLabel),
    );
    expect(preMerge.map((link) => link.elementCode)).toEqual([
      '4.1.1',
      '4.1.1',
    ]);
    const stored: Array<{ objectiveCode: string; elementCode: string }> =
      await dataSource.query(
        `SELECT io.code AS objectiveCode, e.code AS elementCode
           FROM institutional_objective_elements ioe
           JOIN institutional_objectives io ON io.id = ioe.institutional_objective_id
           JOIN framework_elements e ON e.id = ioe.element_id
          WHERE io.portfolio_id = ? AND io.code IN (?, ?) AND e.code = '4.1.1'
          ORDER BY io.code`,
        [
          SEEDED_PORTFOLIO_ID,
          preMerge[0].objectiveCode,
          preMerge[1].objectiveCode,
        ],
      );
    expect(stored).toEqual([
      { objectiveCode: 'IOB-24', elementCode: '4.1.1' },
      { objectiveCode: 'IOB-25', elementCode: '4.1.1' },
    ]);
    expect(SEED_PORTFOLIO_ID).toBe(SEEDED_PORTFOLIO_ID);
  });

  it('R-STF-011 AC.3: a second seed run inserts zero rows', async () => {
    const before = await countPortfolioRows(dataSource, SEEDED_PORTFOLIO_ID);
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      const inserted = await seedStrategyFramework(runner);
      expect(inserted).toBe(0);
    } finally {
      await runner.release();
    }
    expect(await countPortfolioRows(dataSource, SEEDED_PORTFOLIO_ID)).toEqual(
      before,
    );
  });

  it('P-26 / D-STF-24: four pending migrations and an injected seed failure leave zero seed rows', async () => {
    await prepareBatchDatabase(dataSource);
    const result = await runFourMigrationsWithInjectedSeedFailure();
    console.log(
      `[strategy-framework-seed] D-STF-24 batch threw="${result.threw}" levelsTable=${result.levelsTable} counts=${JSON.stringify(result.counts)}`,
    );
    expect(result.threw).toContain('injected seed failure');
    expect(result.levelsTable).toBe(1);
    expect(result.counts).toEqual({
      levels: 0,
      elements: 0,
      objectives: 0,
      links: 0,
      responsibles: 0,
    });
    const scratch = await countPortfolioRows(dataSource, SEEDED_PORTFOLIO_ID);
    expect(scratch.elements).toBe(48);
    await dropBatchDatabase(dataSource);
  }, 120000);
});
