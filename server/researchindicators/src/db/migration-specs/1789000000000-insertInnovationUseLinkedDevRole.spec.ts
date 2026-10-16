import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { InsertInnovationUseLinkedDevRole1789000000000 } from '../migrations/1789000000000-insertInnovationUseLinkedDevRole';

/**
 * Structural spec for Migration A of
 * docs/specs/innovation-use/link-innovation-dev (T-01, R-IUL-010).
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on that captured text,
 * plus a raw-source check of the migration file itself.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — a
 * `.spec.ts` inside `db/migrations/` crashes the TypeORM migration runner
 * (`ReferenceError: describe is not defined`), per
 * `server/researchindicators/src/CLAUDE.md` §9.
 *
 * CANNOT PROVE (KZ-017): this spec asserts SQL *text* only. It never opens a
 * database connection and never proves the INSERT/DELETE actually lands in
 * `link_result_roles` — that property belongs to a real-MySQL fixture spec
 * (D-1 in requirements.md §5), which this task does not own.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1789000000000-insertInnovationUseLinkedDevRole.ts',
);

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

describe('InsertInnovationUseLinkedDevRole1789000000000 (Migration A, R-IUL-010)', () => {
  describe('source (raw file text — independent of what up()/down() emit)', () => {
    let src: string;

    beforeAll(() => {
      src = readFileSync(MIGRATION_FILE, 'utf8');
    });

    it('imports LinkResultRolesEnum from the domain enum module', () => {
      expect(src).toMatch(
        /import\s*\{\s*LinkResultRolesEnum\s*\}\s*from\s*['"].*link-result-roles\.enum['"]/,
      );
    });

    it('interpolates LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV in the INSERT\'s own statement, never a bare literal 5 (falsification target — R-IUL-010 "IT MUST reuse LinkResultRolesEnum for the literal, never a bare 5 in the SQL")', () => {
      expect(src).toMatch(
        /INSERT INTO link_result_roles \(link_result_role_id, name\) VALUES \(\$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}/,
      );
    });

    it('interpolates the same enum member in the DELETE of down()', () => {
      const deleteMatches = src.match(
        /DELETE FROM link_result_roles WHERE link_result_role_id = \$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}/,
      );
      expect(deleteMatches).not.toBeNull();
    });
  });

  describe('up()', () => {
    let calls: string[];

    beforeAll(async () => {
      const migration = new InsertInnovationUseLinkedDevRole1789000000000();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
    });

    it('issues exactly one INSERT statement', () => {
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(/INSERT INTO link_result_roles/i);
    });

    it('inserts role id 5 (LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV) named "Innovation Use Linked Dev"', () => {
      expect(LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV).toBe(5);
      expect(calls[0]).toMatch(
        new RegExp(
          `\\(\\s*${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}\\s*,`,
        ),
      );
      expect(calls[0]).toContain("'Innovation Use Linked Dev'");
    });

    it('never references roles 1-4 as a write target', () => {
      for (const existingId of [1, 2, 3, 4]) {
        expect(calls[0]).not.toMatch(new RegExp(`\\(\\s*${existingId}\\s*,`));
      }
    });

    it('is pure DML — no CREATE/DROP/ALTER TABLE, no UPDATE, no DELETE', () => {
      expect(calls[0]).not.toMatch(/CREATE TABLE|DROP TABLE|ALTER TABLE/i);
      expect(calls[0]).not.toMatch(/UPDATE|DELETE/i);
    });
  });

  describe('down()', () => {
    let calls: string[];

    beforeAll(async () => {
      const migration = new InsertInnovationUseLinkedDevRole1789000000000();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.down(runner);
      calls = recorded;
    });

    it('is non-empty and issues exactly one DELETE statement (falsification target — an emptied down() must fail this)', () => {
      expect(calls.length).toBeGreaterThan(0);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(/DELETE FROM link_result_roles/i);
    });

    it('deletes only the role-5 row, keyed on link_result_role_id, and is restorative (undoes exactly what up() did)', () => {
      expect(calls[0]).toMatch(
        new RegExp(
          `link_result_role_id\\s*=\\s*${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}\\b`,
        ),
      );
      expect(calls[0]).toMatch(/WHERE/i);
    });

    it('never alters or renumbers roles 1-4 (R-IUL-010 BUT clause)', () => {
      for (const existingId of [1, 2, 3, 4]) {
        expect(calls[0]).not.toMatch(
          new RegExp(`link_result_role_id\\s*=\\s*${existingId}\\b`),
        );
      }
      expect(calls[0]).not.toMatch(
        /UPDATE|CREATE TABLE|DROP TABLE|ALTER TABLE/i,
      );
    });
  });
});
