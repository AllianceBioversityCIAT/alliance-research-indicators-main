import { dataSource } from '../../src/db/config/mysql/orm.test.config';

/**
 * T-13 (`docs/specs/innovation-use/data-model-and-catalog`) rework attempt 2
 * — FAIL-2. Jest `globalSetup`: runs exactly ONCE, in Jest's main process,
 * strictly BEFORE any worker (and therefore before any `*.fixture-spec.ts`
 * file's own `beforeAll`) starts. Wired via `test/jest-fixtures.json`'s
 * `globalSetup` key.
 *
 * Seeds the foundational, cross-file-shared reference rows several fixture
 * files depend on but none of them created (their seed migration predates
 * the committed schema-only baseline snapshot's cutoff — its DDL is
 * captured, the data INSERT is not, the same FP-16 trap independently
 * rediscovered by T-12 and T-13):
 *   - `reporting_platforms` 'STAR'
 *   - `result_status` id 8 ("Deleted")
 *   - `actor_roles` id 1 ("innovation-development")
 *   - `institution_type_roles` id 1 ("innovation-development")
 *
 * Why this is the durable fix and per-file `INSERT IGNORE` was not: on a
 * COLD container, several fixture files' `beforeAll` hooks run concurrently
 * in different Jest workers, each racing a plain check-then-insert (or an
 * `INSERT IGNORE`) against the SAME row. The loser of that race can observe
 * a half-created row, hit a duplicate-key error on a plain `INSERT`, or -
 * worse - have the row deleted out from under it by a sibling file's
 * `afterAll` teardown that assumed it was the sole owner. Every one of
 * those failure modes requires at least two workers to be seeding the same
 * row AT THE SAME TIME; a `globalSetup` module removes the possibility
 * structurally, by finishing all four seeds before Jest spawns a single
 * worker. No fixture file may create or tear down any of these four rows
 * from here on — see the removed teardown blocks in
 * `sp-versioning-objective-blocks.fixture-spec.ts` (`STAR`) and
 * `innovation-use/innovation-use-validation.fixture-spec.ts` (`actor_roles`
 * id 1).
 *
 * `INSERT IGNORE` keeps each seed idempotent across repeated `test:fixtures`
 * runs on an already-warm schema (a second cold-to-warm run must not error
 * on a duplicate key) — and because this function runs exactly once, before
 * any concurrent writer exists, there is no race for it to paper over the
 * way there would be inside an individual fixture file's `beforeAll`.
 *
 * Must return a function (Jest's contract for `globalSetup` — see
 * `runGlobalHook.js`); the module is required and transpiled through the
 * same `ts-jest` transform as every other file this config collects, so
 * plain ESM `export default` resolves via Jest's default-export interop.
 */
export default async function globalSetup(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.query(
      `INSERT IGNORE INTO reporting_platforms (platform_code, platform_name) VALUES ('STAR', 'STAR reporting platform')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO result_status (result_status_id, name) VALUES (8, 'Deleted')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO actor_roles (actor_role_id, name) VALUES (1, 'innovation-development')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO institution_type_roles (institution_type_role_id, name) VALUES (1, 'innovation-development')`,
    );
  } finally {
    await dataSource.destroy();
  }
}
