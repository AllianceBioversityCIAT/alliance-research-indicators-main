import 'reflect-metadata';
import 'dotenv/config';
import { performance } from 'perf_hooks';
import { DataSource } from 'typeorm';
import { OrgStructureReadService } from '../src/domain/entities/organizational-structure/org-structure-read.service';
import { OrgStructureClock } from '../src/domain/entities/organizational-structure/org-structure.clock';
import { OrgUnitUsageRegistry } from '../src/domain/entities/organizational-structure/org-unit-usage.registry';
import { OrgUnitRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit.repository';
import { OrgUnitVersionRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from '../src/domain/entities/organizational-structure/repositories/org-unit-change-log.repository';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_T05_PREFIX,
} from './support/org-structure-fixtures';

/**
 * NFR-ORG-001 on the REAL local MySQL (docs/specs/institutional-performance/
 * organizational-structure, T-05): the year view (B1) of 500 entries p95 <=
 * 300 ms and `resolve` of 100 ids p95 <= 100 ms.
 *
 * Method: the seeded 117 entries plus synthetic `__T05_` entries up to 500
 * covering 2026 (two with a director, one in four with a delegate, so the
 * joins do real work), the clock fixed at 2026. Each operation first gets a
 * full UNTIMED pass of 20 calls (WARM_UP_CALLS: a single warm-up call left the
 * first timed run cold, measured by the Leader as B1 p95 33 ms against 16 ms
 * for the next runs), then 3 runs of 20 timed calls each. So the verdict is
 * the STEADY-STATE latency, which is what NFR-ORG-001 asks about; the cold
 * first call is not a budget claim. p95 of a run is its 19th smallest value
 * (nearest rank). Spread = (max - min) / min of the three
 * per-run p95 values; above 30 % the verdict is INCONCLUSIVE, not pass
 * (tasks.md T-05 Disqualifier).
 *
 * Synthetic rows are committed (the read service uses its own connections, so
 * a rolled-back transaction would be invisible to it), tracked by id, and
 * removed in the last test and again in `afterAll`; the last test proves 0
 * `__T05_` rows are left.
 *
 * Scope note (KZ-017): timings are only meaningful when NOTHING else runs
 * (parallel Jest workers, builds, other agents), and 383 synthetic rows written
 * while sibling suites run would add load to THEM. (A deadlock seen once with
 * this suite active was NOT caused by it: the Leader reproduced it with this
 * suite off, and the mechanism is in the DDL / cleanup-scan notes of the seed
 * files.) So the suite runs ONLY when `ORG_PERF_STRICT=1` (the dedicated
 * timing run, with nothing else running) and is skipped otherwise; there it asserts the
 * thresholds and the cleanup. Local MySQL only: not a proxy for Dev or Prod
 * hardware.
 */
const timingRun = process.env.ORG_PERF_STRICT === '1';
(timingRun ? describe : describe.skip)(
  'Organizational Structure — NFR-ORG-001 timing against real MySQL (T-05)',
  () => {
    const TARGET_ENTRIES = 500;
    const RUNS = 3;
    const CALLS = 20;
    const WARM_UP_CALLS = 20; // a full untimed pass per operation, before the timed runs
    const B1_BUDGET_MS = 300;
    const RESOLVE_BUDGET_MS = 100;
    const MAX_SPREAD = 0.3;
    const YEAR = 2026;

    let dataSource: DataSource;
    let fixtures: OrgFixtures;
    let service: OrgStructureReadService;
    let resolveIds: number[] = [];
    let viewSize = 0;

    const p95 = (samples: number[]): number => {
      const sorted = [...samples].sort((a, b) => a - b);
      return sorted[Math.ceil(0.95 * sorted.length) - 1];
    };
    const round = (value: number): number => Math.round(value * 100) / 100;

    const measure = async (call: () => Promise<unknown>): Promise<number[]> => {
      for (let w = 0; w < WARM_UP_CALLS; w++) await call(); // untimed warm-up pass
      const out: number[] = [];
      for (let i = 0; i < RUNS; i++) {
        const samples: number[] = [];
        for (let c = 0; c < CALLS; c++) {
          const start = performance.now();
          await call();
          samples.push(performance.now() - start);
        }
        out.push(p95(samples));
      }
      return out;
    };

    const verdict = (runs: number[], budget: number) => {
      const spread =
        (Math.max(...runs) - Math.min(...runs)) / Math.min(...runs);
      let result: 'pass' | 'fail' | 'inconclusive';
      if (spread > MAX_SPREAD) result = 'inconclusive';
      else result = Math.max(...runs) <= budget ? 'pass' : 'fail';
      return { spread, result };
    };

    const leftover = async (): Promise<number> => {
      const [row] = await dataSource.query(
        `SELECT COUNT(*) AS n FROM org_units WHERE code LIKE '\\_\\_T05\\_%'`,
      );
      return Number(row.n);
    };

    beforeAll(async () => {
      dataSource = await createOrgTestDataSource('org-structure-performance');
      fixtures = new OrgFixtures(dataSource, ORG_T05_PREFIX);
      const clock: OrgStructureClock = { currentYear: () => YEAR };
      service = new OrgStructureReadService(
        new OrgUnitRepository(dataSource),
        new OrgUnitVersionRepository(dataSource),
        new OrgUnitDelegateRepository(dataSource),
        clock,
        new OrgUnitChangeLogRepository(dataSource),
        new OrgUnitUsageRegistry(),
      );

      // Real carnets to hang directors and delegates on (never modified).
      const staff: Array<{ carnet: string }> = await dataSource.query(
        `SELECT carnet FROM alliance_user_staff WHERE is_active = 1 AND deleted_at IS NULL ORDER BY carnet LIMIT 40`,
      );
      const [{ n }] = await dataSource.query(
        `SELECT COUNT(DISTINCT org_unit_id) AS n FROM org_unit_versions
        WHERE valid_from_year <= ${YEAR} AND (valid_to_year IS NULL OR valid_to_year > ${YEAR})`,
      );
      const toCreate = Math.max(0, TARGET_ENTRIES - Number(n));
      const parents: Array<{ id: string }> = await dataSource.query(
        `SELECT id FROM org_units WHERE id BETWEEN 1 AND 117 ORDER BY id`,
      );

      for (let i = 0; i < toCreate; i++) {
        const id = await fixtures.unit(`P${i}`, [
          {
            from: 2026,
            to: null,
            name: `Synthetic performance entry ${i}`,
            levelId: 23,
            parentId: Number(parents[i % parents.length].id),
            directorCarnet: i % 2 === 0 ? staff[i % staff.length].carnet : null,
          },
        ]);
        if (i % 4 === 0) {
          await fixtures.delegate(id, staff[(i + 7) % staff.length].carnet);
        }
      }

      const view = await service.getYearView(YEAR, false);
      viewSize = view.length;
      resolveIds = view.slice(0, 100).map((row) => Number(row.id));
    }, 120000);

    afterAll(async () => {
      await fixtures?.cleanup();
      await dataSource?.destroy();
    }, 60000);

    it('the year view carries 500 entries and 100 ids resolve', () => {
      expect(viewSize).toBeGreaterThanOrEqual(TARGET_ENTRIES);
      expect(resolveIds).toHaveLength(100);
    });

    it('measures B1 (year view of 500) and resolve (100 ids): 3 runs x 20 calls, p95 per run', async () => {
      const b1 = await measure(() => service.getYearView(YEAR, false));
      const resolve = await measure(() => service.resolve(resolveIds, YEAR));
      const b1Verdict = verdict(b1, B1_BUDGET_MS);
      const resolveVerdict = verdict(resolve, RESOLVE_BUDGET_MS);

      console.log(
        [
          `[org-structure-performance] NFR-ORG-001 on ${process.env.ARI_TEST_MYSQL_HOST}:${process.env.ARI_TEST_MYSQL_PORT}/${process.env.ARI_TEST_MYSQL_NAME}`,
          `  entries in the year view: ${viewSize}; ids resolved per call: ${resolveIds.length}; calls per run: ${CALLS}; runs: ${RUNS}`,
          `  B1 year view   p95 per run (ms): ${b1.map(round).join(' | ')}  spread ${round(b1Verdict.spread * 100)} %  budget ${B1_BUDGET_MS} ms  -> ${b1Verdict.result}`,
          `  resolve(100)   p95 per run (ms): ${resolve.map(round).join(' | ')}  spread ${round(resolveVerdict.spread * 100)} %  budget ${RESOLVE_BUDGET_MS} ms  -> ${resolveVerdict.result}`,
          `  strict mode (ORG_PERF_STRICT=1): ${process.env.ORG_PERF_STRICT === '1'}`,
        ].join('\n'),
      );

      if (process.env.ORG_PERF_STRICT === '1') {
        expect(b1Verdict.result).toBe('pass');
        expect(resolveVerdict.result).toBe('pass');
      }
    }, 120000);

    it('leaves no synthetic row behind', async () => {
      expect(await leftover()).toBeGreaterThan(0);
      await fixtures.cleanup();
      expect(await leftover()).toBe(0);
      const orphans = await dataSource.query(
        `SELECT COUNT(*) AS n FROM org_unit_versions v
        LEFT JOIN org_units u ON u.id = v.org_unit_id WHERE u.id IS NULL`,
      );
      expect(Number(orphans[0].n)).toBe(0);
    });
  },
);
