/**
 * T-12 — runs the real sweep in dry-run mode against a live database.
 *
 * This is the artifact a human reviews before any `apply`, and it closes the two
 * limits T-09 declared:
 *
 *  1. **"The dry run mutates nothing" — measured, not inferred.** Row counts are
 *     taken across `results` and its child tables before and after. T-09 could only
 *     prove the chain (plan drives the runner in DRY_RUN; DRY_RUN does not delete);
 *     this proves the outcome.
 *  2. **The run lock against real MySQL.** Two concurrent `plan()` calls must yield
 *     exactly one success and one `409`. T-09 proved that against a *model* of the
 *     conditional `UPDATE`; KZ-001 says a double that does not behave like the
 *     thing it stands for gives a green suite over broken behavior, so the model's
 *     fidelity was itself an assumption. This settles it.
 *
 * Writes ONLY the audit rows that make a plan retrievable for a later apply. It
 * never deletes: `hard_delete_enabled` is seeded `false`, and `DRY_RUN` does not
 * even read that flag.
 *
 * Run from `server/researchindicators`:
 *
 *   NODE_PATH="$PWD/node_modules" TS_NODE_PROJECT="$PWD/tsconfig.json" \
 *     npx ts-node -T ../../docs/specs/results/cross-platform-duplicate-resolution/run-dry-run.ts
 *
 * **Both env vars are required — corrected 2026-08-05 (T-15).** The plain
 * `npx ts-node -T …` form this header used to prescribe cannot work:
 *   - There is **no root `tsconfig.json`**, so ts-node finds no project config and
 *     falls back to its own defaults, compiling TypeORM's decorators with the TC39
 *     transform instead of legacy `experimentalDecorators`. It fails with
 *     `TypeError: Cannot read properties of undefined (reading 'constructor')`
 *     out of `auditable.entity.ts` — which reads like a code bug and is not one.
 *   - This script lives under `docs/specs/`, so Node resolves `require` from the
 *     *script's* directory and cannot find `dotenv/config`. `NODE_PATH` fixes that;
 *     the sibling `verify-normalization.js` instead shims it in-file with
 *     `module.paths.unshift(path.join(process.cwd(), 'node_modules'))`.
 *
 * Expect ~34 minutes against the remote dev database, not seconds: the sweep issues
 * thousands of short queries and is **round-trip bound**, not query bound (measured
 * 2026-08-05 — five PROCESSLIST samples found zero long-running queries).
 *
 * Exits non-zero if any row count moved, so it can gate CI.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSource as coreDataSource } from '../../../../server/researchindicators/src/db/config/mysql/orm.config';
import { DuplicateResolutionService } from '../../../../server/researchindicators/src/domain/entities/results/duplicate-resolution.service';
import { DuplicateCandidateRepository } from '../../../../server/researchindicators/src/domain/entities/results/repositories/duplicate-candidate.repository';
import { ResultDuplicateResolutionLogService } from '../../../../server/researchindicators/src/domain/entities/results/result-duplicate-resolution-log.service';
import { QueryService } from '../../../../server/researchindicators/src/domain/shared/utils/query.service';
import { StarRelationshipService } from '../../../../server/researchindicators/src/domain/shared/services/star-relationship.service';
import { DuplicateResolutionRunner } from '../../../../server/researchindicators/src/domain/shared/services/duplicate-resolution-runner.service';

/** Tables whose counts must not move during a dry run. */
const WATCHED_TABLES = [
  'results',
  'link_results',
  'result_knowledge_products',
  'result_capacity_sharing',
  'result_evidences',
  'result_levers',
  'result_countries',
  'result_users',
];

const countRows = async (dataSource: DataSource) => {
  const counts: Record<string, number> = {};
  for (const table of WATCHED_TABLES) {
    const rows = await dataSource.query(
      `SELECT COUNT(*) AS n FROM \`${table}\``,
    );
    counts[table] = Number(rows[0].n);
  }
  return counts;
};

const buildService = (dataSource: DataSource) => {
  const auditLog = new ResultDuplicateResolutionLogService(dataSource);
  const queryService = new QueryService(dataSource);
  const starRelationships = new StarRelationshipService(dataSource);

  // A dry run deletes nothing, so the search index is never touched. This stub
  // throws rather than no-ops: if it is ever called, the run is not a dry run.
  const openSearch = {
    uploadSingleToOpenSearch: () => {
      throw new Error(
        'A dry run attempted to write to OpenSearch. This must never happen.',
      );
    },
  };

  const runner = new DuplicateResolutionRunner(
    dataSource,
    queryService,
    starRelationships,
    auditLog,
    openSearch as never,
  );

  return new DuplicateResolutionService(
    dataSource,
    new DuplicateCandidateRepository(dataSource),
    queryService,
    starRelationships,
    runner,
    auditLog,
  );
};

(async () => {
  const dataSource = await coreDataSource.initialize();
  let failures = 0;

  try {
    const service = buildService(dataSource);

    console.log('=== row counts BEFORE ===');
    const before = await countRows(dataSource);
    Object.entries(before).forEach(([table, n]) =>
      console.log(`  ${table.padEnd(28)} ${n}`),
    );

    console.log('\n=== running the sweep in DRY_RUN ===');
    const started = Date.now();
    const plan = await service.plan({});
    console.log(`  completed in ${Date.now() - started} ms`);
    console.log(`  runId              ${plan.runId}`);
    console.log(`  status             ${plan.status}`);
    console.log(`  confirmationDigest ${plan.confirmationDigest}`);
    console.log(`  groups             ${plan.groupCount}`);
    console.log(`  rows to delete     ${plan.rowsToDelete}`);
    console.log(`  by classification  ${JSON.stringify(plan.byClassification)}`);
    if (plan.message) console.log(`  message            ${plan.message}`);

    // --- what a reviewer needs to see ---------------------------------------
    const losersByPlatform: Record<string, number> = {};
    const protectedGroups: typeof plan.groups = [];
    for (const group of plan.groups) {
      if (!group.toDelete.length && group.classification === 'RESOLVED') {
        protectedGroups.push(group);
      }
      for (const id of group.participantResultIds) {
        if (id !== null && id !== group.winnerResultId && group.toDelete.includes(id)) {
          const platform =
            plan.groups.find((g) => g.groupKey === group.groupKey) && 'loser';
          losersByPlatform[platform ?? 'loser'] =
            (losersByPlatform[platform ?? 'loser'] ?? 0) + 1;
        }
      }
    }
    console.log('\n=== groups by rule ===');
    const byRule: Record<string, number> = {};
    plan.groups.forEach((group) => {
      byRule[group.rule] = (byRule[group.rule] ?? 0) + 1;
    });
    Object.entries(byRule).forEach(([rule, n]) =>
      console.log(`  ${rule.padEnd(26)} ${n}`),
    );
    console.log(
      `\n  groups RESOLVED but with nothing deletable (all losers protected): ${protectedGroups.length}`,
    );

    console.log('\n=== first 10 groups, for review ===');
    plan.groups.slice(0, 10).forEach((group) => {
      console.log(
        `  ${group.groupKey.slice(0, 58).padEnd(60)} ${group.classification.padEnd(20)} winner=${String(group.winnerResultId).padEnd(7)} delete=[${group.toDelete.join(',')}]`,
      );
    });

    // --- 1. write-freedom, measured -----------------------------------------
    console.log('\n=== row counts AFTER (must be identical) ===');
    const after = await countRows(dataSource);
    for (const table of WATCHED_TABLES) {
      const same = before[table] === after[table];
      if (!same) failures++;
      console.log(
        `  ${same ? 'ok  ' : 'FAIL'} ${table.padEnd(28)} ${before[table]} -> ${after[table]}`,
      );
    }

    // The one expected write.
    const auditRows = await dataSource.query(
      `SELECT COUNT(*) AS n FROM result_duplicate_resolution_log WHERE run_id = ?`,
      [plan.runId],
    );
    console.log(
      `\n  audit rows written for this run: ${auditRows[0].n} (expected ${plan.groupCount}) — the only write a dry run performs`,
    );
    if (Number(auditRows[0].n) !== plan.groupCount) failures++;

    // --- 2. the run lock, against real MySQL --------------------------------
    console.log('\n=== run lock under real contention ===');
    const [first, second] = await Promise.allSettled([
      service.plan({ limit: 1 }),
      service.plan({ limit: 1 }),
    ]);
    const statuses = [first.status, second.status].sort();
    const lockOk =
      statuses[0] === 'fulfilled' && statuses[1] === 'rejected';
    if (!lockOk) failures++;
    console.log(
      `  ${lockOk ? 'ok  ' : 'FAIL'} exactly one of two concurrent sweeps proceeded (${statuses.join(', ')})`,
    );
    if (second.status === 'rejected') {
      console.log(`       rejection: ${second.reason?.message}`);
    } else if (first.status === 'rejected') {
      console.log(`       rejection: ${first.reason?.message}`);
    }

    // The lock must be free again afterwards.
    const lock = await dataSource.query(
      `SELECT simple_value AS v FROM app_config WHERE \`key\` = 'duplicate_resolution.sweep_lock'`,
    );
    const released = !lock[0]?.v;
    if (!released) failures++;
    console.log(
      `  ${released ? 'ok  ' : 'FAIL'} lock released after the runs (value ${JSON.stringify(lock[0]?.v ?? null)})`,
    );

    console.log(
      `\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`,
    );
  } finally {
    await dataSource.destroy();
  }

  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error('FATAL:', error?.message ?? error);
  process.exit(2);
});
