import 'reflect-metadata';
import 'dotenv/config';
import { performance } from 'perf_hooks';
import { DataSource } from 'typeorm';
import { FrameworkReadService } from '../src/domain/entities/strategy-framework/framework-read.service';
import { FrameworkUsageRegistry } from '../src/domain/entities/strategy-framework/framework-usage.registry';
import { FrameworkElementRepository } from '../src/domain/entities/strategy-framework/repositories/framework-element.repository';
import { FrameworkElementResponsibleRepository } from '../src/domain/entities/strategy-framework/repositories/framework-element-responsible.repository';
import { FrameworkLevelRepository } from '../src/domain/entities/strategy-framework/repositories/framework-level.repository';
import { InstitutionalObjectiveElementRepository } from '../src/domain/entities/strategy-framework/repositories/institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from '../src/domain/entities/strategy-framework/repositories/institutional-objective.repository';
import { PortfolioLookupRepository } from '../src/domain/entities/strategy-framework/repositories/portfolio-lookup.repository';
import { StrategyFrameworkService } from '../src/domain/entities/strategy-framework/strategy-framework.service';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import {
  createStfDataSource,
  SEEDED_PORTFOLIO_ID,
} from './support/strategy-framework-fixtures';

/**
 * NFR-STF-001 on the real local scratch (T-10): A1, A1e and A4, p95 of 3
 * runs of 20 calls, budget 300 ms. Spread above 30 % is inconclusive, not
 * a pass and not a fail of the budget.
 *
 * Method matches the org-structure performance suite: one untimed warm-up
 * pass of 20, then the timed runs. p95 is the 19th smallest of 20
 * (nearest rank). The calls are in-process service methods, so the number
 * is a local proxy (KZ-017), not a Dev HTTP latency. Nothing else should
 * be running; a reading taken while another suite is active is not evidence.
 */
describe('Strategy framework — NFR-STF-001 timing (T-10)', () => {
  const RUNS = 3;
  const CALLS = 20;
  const WARM_UP_CALLS = 20;
  const BUDGET_MS = 300;
  const MAX_SPREAD = 0.3;

  let dataSource: DataSource;
  let read: FrameworkReadService;
  let writes: StrategyFrameworkService;

  const p95 = (samples: number[]): number => {
    const sorted = [...samples].sort((a, b) => a - b);
    return sorted[Math.ceil(0.95 * sorted.length) - 1];
  };
  const round = (value: number): number => Math.round(value * 100) / 100;

  const measure = async (call: () => Promise<unknown>): Promise<number[]> => {
    for (let warm = 0; warm < WARM_UP_CALLS; warm += 1) await call();
    const runs: number[] = [];
    for (let run = 0; run < RUNS; run += 1) {
      const samples: number[] = [];
      for (let callIndex = 0; callIndex < CALLS; callIndex += 1) {
        const start = performance.now();
        await call();
        samples.push(performance.now() - start);
      }
      runs.push(p95(samples));
    }
    return runs;
  };

  const verdict = (runs: number[]) => {
    const spread = (Math.max(...runs) - Math.min(...runs)) / Math.min(...runs);
    let result: 'pass' | 'fail' | 'inconclusive';
    if (spread > MAX_SPREAD) result = 'inconclusive';
    else result = Math.max(...runs) <= BUDGET_MS ? 'pass' : 'fail';
    return { spread, result };
  };

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-performance');
    const registry = new FrameworkUsageRegistry();
    read = new FrameworkReadService(
      new PortfolioLookupRepository(dataSource),
      new FrameworkLevelRepository(dataSource),
      new FrameworkElementRepository(dataSource),
      new FrameworkElementResponsibleRepository(dataSource),
      new InstitutionalObjectiveRepository(dataSource),
      new InstitutionalObjectiveElementRepository(dataSource),
      registry,
    );
    writes = new StrategyFrameworkService(dataSource, read, {
      user_id: 1,
    } as CurrentUserUtil);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('measures A1, A1e and A4: 3 runs x 20 calls, p95 per run', async () => {
    const a1 = await measure(() => read.getFramework(SEEDED_PORTFOLIO_ID));
    const a1e = await measure(() => read.getEditor(SEEDED_PORTFOLIO_ID));
    const a4 = await measure(() => writes.searchStaff('an'));
    const rows = [
      ['A1', a1],
      ['A1e', a1e],
      ['A4', a4],
    ] as const;
    const lines = rows.map(([label, runs]) => {
      const outcome = verdict(runs);
      return `  ${label} p95 per run (ms): ${runs.map(round).join(' | ')}  spread ${round(outcome.spread * 100)} %  budget ${BUDGET_MS} ms  -> ${outcome.result}`;
    });
    console.log(
      [
        `[strategy-framework-performance] NFR-STF-001 on ${process.env.ARI_TEST_MYSQL_HOST}:${process.env.ARI_TEST_MYSQL_PORT}/${process.env.ARI_TEST_MYSQL_NAME}`,
        `  portfolio ${SEEDED_PORTFOLIO_ID}; calls per run: ${CALLS}; runs: ${RUNS}; warm-up: ${WARM_UP_CALLS}`,
        ...lines,
        `  local proxy, not Dev (KZ-017)`,
      ].join('\n'),
    );
    for (const [, runs] of rows) {
      const outcome = verdict(runs);
      if (outcome.result === 'inconclusive') {
        expect(outcome.spread).toBeGreaterThan(MAX_SPREAD);
      } else {
        expect(outcome.result).toBe('pass');
      }
    }
  }, 120000);
});
