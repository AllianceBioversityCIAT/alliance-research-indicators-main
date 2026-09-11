import { QueryRunner } from 'typeorm';
import { InsertInnovationUseRoles1787071463485 } from '../migrations/1787071463485-insertInnovationUseRoles';

/**
 * Role-row assertion spec for M4 (T-07, R-IU-005 AC.1-AC.3, design.md §3.6 /
 * §10 "Role-row assertion").
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on that captured text.
 * Same pattern as the M1/M3 migration specs (`1787066437593-...spec.ts`,
 * `1787070034303-...spec.ts`).
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — see
 * `server/researchindicators/src/CLAUDE.md` §9: `orm.config.ts`'s migrations
 * glob is `require()`d directly by the TypeORM CLI, and a `.spec.ts` inside
 * `db/migrations/` crashes the migration runner ("describe is not defined").
 *
 * KZ-001 / DC-8 guard: `newId` and `pkColumn` below are transcribed
 * independently from `design.md` §3.6's table and from the baseline
 * snapshot (`src/db/baseline/baseline.sql` lines 833/1990/2438) — none of it
 * is imported from, or derived from, the migration module itself.
 *
 * `name` has a narrower, different source: `design.md` §3.6 records only
 * enum notation (`INNOVATION_USE = 2`), no name string, and
 * `baseline.sql` is schema-only — neither contains a `name` value to
 * transcribe, so no independence claim is made against them for `name`.
 * `name` is instead sourced from the sibling-row naming convention already
 * seeded by the precedent migrations
 * (`1749957832239-createEntitiesForInnovationDev.ts:45,48` ->
 * `'innovation-development'`, kebab-case, for `actor_roles` /
 * `institution_type_roles`; `1760653582914-createQuantificationTables.ts:23`
 * -> `'actual_count'` / `'extrapolate_estimates'`, snake_case, for
 * `quantification_roles`), applied per-catalog to `'innovation-use'` /
 * `'innovation-use'` / `'innovation_use'`.
 *
 * Altering a seeded id in the migration to collide with an existing role id
 * (1, or 1/2 for `quantification_roles`) MUST make the "previously unused
 * id" assertions below fail — that is the falsification this spec exists to
 * catch (T-07's stated Disqualifier: "a row-count-only / rows-added-only
 * assertion does not prove no existing id moved").
 *
 * Trap 1 (NOT uniform PK column names, per baseline.sql):
 *   - `actor_roles`            -> `actor_role_id`
 *   - `institution_type_roles` -> `institution_type_role_id`
 *   - `quantification_roles`   -> bare `id`
 */

interface RoleRowExpectation {
  table: 'actor_roles' | 'institution_type_roles' | 'quantification_roles';
  pkColumn: 'actor_role_id' | 'institution_type_role_id' | 'id';
  newId: number;
  existingIds: number[];
  name: string;
}

// Independent literal — newId/pkColumn transcribed by hand from design.md
// §3.6 and the baseline snapshot; name from the sibling-row convention
// seeded by the precedent migrations (see header). Do NOT derive any of
// this from the migration file.
const EXPECTED_ROWS: RoleRowExpectation[] = [
  {
    table: 'actor_roles',
    pkColumn: 'actor_role_id',
    newId: 2,
    existingIds: [1],
    name: 'innovation-use',
  },
  {
    table: 'institution_type_roles',
    pkColumn: 'institution_type_role_id',
    newId: 2,
    existingIds: [1],
    name: 'innovation-use',
  },
  {
    table: 'quantification_roles',
    pkColumn: 'id',
    newId: 3,
    existingIds: [1, 2],
    name: 'innovation_use',
  },
];

function createRecordingQueryRunner(): {
  runner: QueryRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

describe('InsertInnovationUseRoles1787071463485 (M4 role-row assertion spec)', () => {
  describe('up()', () => {
    let calls: string[];
    let insertCalls: string[];

    beforeAll(async () => {
      const migration = new InsertInnovationUseRoles1787071463485();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      insertCalls = calls.filter((sql) => /INSERT INTO/i.test(sql));
    });

    it('issues exactly three INSERT statements, one per catalog, and nothing else', () => {
      expect(insertCalls).toHaveLength(3);
      expect(calls).toHaveLength(3);
    });

    it.each(EXPECTED_ROWS)(
      'inserts exactly one row into `$table` keyed on `$pkColumn`, at the previously unused id $newId, named "$name"',
      ({ table, pkColumn, newId, name }) => {
        const stmt = insertCalls.find((sql) =>
          new RegExp(`\`${table}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(new RegExp(`\`${pkColumn}\``, 'i'));
        expect(stmt!).toMatch(new RegExp(`\\(\\s*${newId}\\s*,`));
        expect(stmt!).toContain(`'${name}'`);
      },
    );

    it('quantification_roles insert uses the bare `id` column, NOT `quantification_role_id` (trap 1: PK column name is not uniform)', () => {
      const stmt = insertCalls.find((sql) =>
        /`quantification_roles`/i.test(sql),
      );
      expect(stmt).toBeDefined();
      expect(stmt!).not.toMatch(/`quantification_role_id`/i);
      expect(stmt!).toMatch(/`id`/);
    });

    it.each(EXPECTED_ROWS)(
      'never references any existing id of `$table` in an UPDATE, DELETE, or renumbering statement (R-IU-005 AC.3 — falsification target)',
      ({ table, existingIds }) => {
        for (const sql of calls) {
          if (!new RegExp(`\`${table}\``, 'i').test(sql)) continue;
          expect(sql).not.toMatch(/UPDATE/i);
          expect(sql).not.toMatch(/DELETE/i);
          for (const existingId of existingIds) {
            // The existing id must not appear as a value being written by
            // this migration (an INSERT for a fresh row is fine; the guard
            // is against that id being the TARGET of a write).
            const insertsThisTable = insertCalls.filter((s) =>
              new RegExp(`\`${table}\``, 'i').test(s),
            );
            for (const insertSql of insertsThisTable) {
              const tuple = insertSql.match(/VALUES\s*\(([^)]*)\)/i);
              expect(tuple).not.toBeNull();
              const firstValue = Number(tuple![1].split(',')[0].trim());
              expect(firstValue).not.toBe(existingId);
            }
          }
        }
      },
    );

    it('is pure DML — no CREATE TABLE, DROP TABLE, ALTER TABLE, or FOREIGN KEY statement (FP-9: M4 is pure DML, unlike M1-M3)', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/CREATE TABLE/i);
        expect(sql).not.toMatch(/DROP TABLE/i);
        expect(sql).not.toMatch(/ALTER TABLE/i);
        expect(sql).not.toMatch(/FOREIGN KEY/i);
      }
    });

    it('touches only actor_roles, institution_type_roles, and quantification_roles', () => {
      for (const sql of calls) {
        const match = sql.match(/INSERT INTO\s*`([a-z0-9_]+)`/i);
        expect(match).not.toBeNull();
        expect([
          'actor_roles',
          'institution_type_roles',
          'quantification_roles',
        ]).toContain(match![1]);
      }
    });
  });

  describe('down()', () => {
    let calls: string[];

    beforeAll(async () => {
      const migration = new InsertInnovationUseRoles1787071463485();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.down(runner);
      calls = recorded;
    });

    it('issues exactly three DELETE statements, one per catalog, and nothing else', () => {
      expect(calls).toHaveLength(3);
      for (const sql of calls) {
        expect(sql).toMatch(/DELETE FROM/i);
      }
    });

    it.each(EXPECTED_ROWS)(
      'deletes only the seeded row of `$table` by id ($newId), keyed on `$pkColumn`',
      ({ table, pkColumn, newId, existingIds }) => {
        const stmt = calls.find((sql) =>
          new RegExp(`\`${table}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(new RegExp(`\`${pkColumn}\``, 'i'));
        expect(stmt!).toMatch(new RegExp(`=\\s*${newId}\\b`));
        for (const existingId of existingIds) {
          expect(stmt!).not.toMatch(new RegExp(`=\\s*${existingId}\\b`));
        }
      },
    );

    it('never issues DROP TABLE, CREATE TABLE, ALTER TABLE, or an unfiltered DELETE', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/DROP TABLE/i);
        expect(sql).not.toMatch(/CREATE TABLE/i);
        expect(sql).not.toMatch(/ALTER TABLE/i);
        expect(sql).toMatch(/WHERE/i);
      }
    });

    it('touches only actor_roles, institution_type_roles, and quantification_roles', () => {
      for (const sql of calls) {
        const match = sql.match(/DELETE FROM\s*`([a-z0-9_]+)`/i);
        expect(match).not.toBeNull();
        expect([
          'actor_roles',
          'institution_type_roles',
          'quantification_roles',
        ]).toContain(match![1]);
      }
    });
  });
});
