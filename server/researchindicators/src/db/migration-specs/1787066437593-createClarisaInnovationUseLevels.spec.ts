import { QueryRunner } from 'typeorm';
import { CreateClarisaInnovationUseLevels1787066437593 } from '../migrations/1787066437593-createClarisaInnovationUseLevels';

/**
 * Seed spec for M1 (T-04, R-IU-002).
 *
 * This is a UNIT test (`npm test`) — it never opens a real MySQL
 * connection. It runs the migration's `up()` / `down()` against a fake
 * `QueryRunner` that only records the SQL text passed to `.query()`, then
 * asserts on that captured text.
 *
 * Lives in `src/db/migration-specs/`, a sibling of `src/db/migrations/`,
 * rather than inside the migrations folder itself: `orm.config.ts`'s
 * `migrations` glob is `${__dirname}/../../migrations/**\/*{.ts,.js}` and is
 * loaded directly by the TypeORM CLI (`migration:test:execute`), which
 * `require()`s every matched file expecting a `MigrationInterface` export.
 * A `.spec.ts` file's top-level `describe(...)` call executes immediately on
 * `require()` and crashes outside the Jest runtime ("describe is not
 * defined") — confirmed by running `migration:test:execute` with the spec
 * still inside `migrations/`. This directory is picked up by Jest's default
 * `rootDir: "src"` / `testRegex` (so `npm test` still collects it) but is
 * outside the migrations glob (so the real migration runner never touches
 * it).
 *
 * KZ-001 guard: `EXPECTED_ROWS` below is an INDEPENDENT literal, hand
 * transcribed from `requirements.md` §R-IU-002's canonical seed table. It is
 * NOT imported from the migration file and shares no source with it. Altering
 * one character of a `definition` in the migration (and only the migration)
 * must make this spec fail — that is the falsification this spec exists to
 * pass. If this file ever imports its expected rows from the migration
 * module, the comparison becomes tautological and this guard is void.
 */

interface ExpectedRow {
  id: number;
  level: number;
  name: string;
  definition: string;
}

// Independent literal — transcribed by hand from requirements.md §R-IU-002.
// Do NOT derive this from the migration file, from family.md, from
// proposal.md, or from CLARISA. Ten rows, ids 1-10, levels 0-9.
const EXPECTED_ROWS: ExpectedRow[] = [
  {
    id: 1,
    level: 0,
    name: 'No use',
    definition: 'Innovation is not used.',
  },
  {
    id: 2,
    level: 1,
    name: 'Project lead organization',
    definition:
      'Innovation is used by organization(s) leading the innovation development.',
  },
  {
    id: 3,
    level: 2,
    name: 'Partners',
    definition:
      'Innovation is used by some partners involved in initial innovation development.',
  },
  {
    id: 4,
    level: 3,
    name: 'Partners',
    definition:
      'Innovation is commonly used by partners involved in initial innovation development.',
  },
  {
    id: 5,
    level: 4,
    name: 'Connected next-user',
    definition:
      'Innovation is used by some organizations connected to partners involved in the initial innovation development.',
  },
  {
    id: 6,
    level: 5,
    name: 'Connected next-user',
    definition:
      'Innovation is commonly used by organizations connected to partners involved in the initial innovation development.',
  },
  {
    id: 7,
    level: 6,
    name: 'Unconnected next-user',
    definition:
      'Innovation is used by organizations not connected to partners involved in the initial innovation development.',
  },
  {
    id: 8,
    level: 7,
    name: 'Unconnected next-user',
    definition:
      'Innovation is commonly used by organizations not connected to partners involved in the initial innovation development.',
  },
  {
    id: 9,
    level: 8,
    name: 'End-user / Beneficiaries',
    definition:
      'Innovation is used by some end-users or beneficiaries who were not involved in the initial innovation development.',
  },
  {
    id: 10,
    level: 9,
    name: 'End-user / Beneficiaries',
    definition:
      'Innovation is commonly used by end-users or beneficiaries who were not involved in the initial innovation development.',
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

describe('CreateClarisaInnovationUseLevels1787066437593 (M1 seed spec)', () => {
  describe('up()', () => {
    let calls: string[];
    let createTableSql: string;
    let insertSql: string;

    beforeAll(async () => {
      const migration = new CreateClarisaInnovationUseLevels1787066437593();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;

      const createTableCalls = calls.filter((sql) => /CREATE TABLE/i.test(sql));
      const insertCalls = calls.filter((sql) => /INSERT INTO/i.test(sql));

      expect(createTableCalls).toHaveLength(1);
      expect(insertCalls).toHaveLength(1);

      createTableSql = createTableCalls[0];
      insertSql = insertCalls[0];
    });

    it('creates exactly one table, clarisa_innovation_use_levels', () => {
      expect(createTableSql).toMatch(/clarisa_innovation_use_levels/);
    });

    it('declares `id` as a NOT NULL, non-auto-increment PK (trap: id is a PK, but not auto-increment)', () => {
      expect(createTableSql).toMatch(/`id`\s+bigint\s+NOT NULL/i);
      expect(createTableSql).not.toMatch(/AUTO_INCREMENT/i);
      expect(createTableSql).toMatch(/PRIMARY KEY\s*\(\s*`id`\s*\)/i);
    });

    it('declares `level`, `name`, `definition` with no `additional_guidance` column (trap: no readiness-catalog column)', () => {
      expect(createTableSql).toMatch(/`level`\s+bigint/i);
      expect(createTableSql).toMatch(/`name`\s+text/i);
      expect(createTableSql).toMatch(/`definition`\s+text/i);
      expect(createTableSql).not.toMatch(/additional_guidance/i);
    });

    it('carries the full AuditableEntity column set', () => {
      expect(createTableSql).toMatch(/`created_at`/);
      expect(createTableSql).toMatch(/`created_by`/);
      expect(createTableSql).toMatch(/`updated_at`/);
      expect(createTableSql).toMatch(/`updated_by`/);
      expect(createTableSql).toMatch(/`is_active`/);
      expect(createTableSql).toMatch(/`deleted_at`/);
    });

    it('does NOT declare a unique constraint or unique index on `name` (trap: name repeats in pairs)', () => {
      expect(createTableSql).not.toMatch(/UNIQUE/i);
    });

    it('uses utf8mb4 / utf8mb4_unicode_520_ci', () => {
      expect(createTableSql).toMatch(/utf8mb4/i);
      expect(createTableSql).toMatch(/utf8mb4_unicode_520_ci/i);
    });

    it('seeds exactly ten rows, ids 1-10, levels 0-9, no duplicate level, no ids 13-20 (trap: id = level + 1)', () => {
      const tuplePattern = /\(\s*(\d+)\s*,\s*(\d+)\s*,/g;
      const pairs: Array<{ id: number; level: number }> = [];
      let match: RegExpExecArray | null;
      while ((match = tuplePattern.exec(insertSql)) !== null) {
        pairs.push({ id: Number(match[1]), level: Number(match[2]) });
      }

      expect(pairs).toHaveLength(10);

      const ids = pairs.map((p) => p.id).sort((a, b) => a - b);
      expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const levels = pairs.map((p) => p.level).sort((a, b) => a - b);
      expect(levels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(new Set(levels).size).toBe(10);

      for (const id of [13, 14, 15, 16, 17, 18, 19, 20]) {
        expect(ids).not.toContain(id);
      }

      // id = level + 1, for every pair actually inserted.
      for (const pair of pairs) {
        expect(pair.id).toBe(pair.level + 1);
      }
    });

    it.each(EXPECTED_ROWS)(
      'seeds id $id / level $level with name and definition matching R-IU-002 verbatim',
      (expected) => {
        // This is the falsifiable, non-tautological assertion: EXPECTED_ROWS
        // is hand-transcribed above, independent of the migration file. A
        // one-character edit to the migration's seeded definition for this
        // row must fail exactly this assertion.
        const rowTuple = `(${expected.id}, ${expected.level}, '${expected.name}', '${expected.definition}')`;
        expect(insertSql).toContain(rowTuple);
      },
    );

    it('never references clarisa_innovation_readiness_levels (AC.5 — that catalog is provably untouched)', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/clarisa_innovation_readiness_levels/i);
      }
    });
  });

  describe('down()', () => {
    it('drops only clarisa_innovation_use_levels', async () => {
      const migration = new CreateClarisaInnovationUseLevels1787066437593();
      const { runner, calls } = createRecordingQueryRunner();
      await migration.down(runner);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(/DROP TABLE/i);
      expect(calls[0]).toMatch(/clarisa_innovation_use_levels/);
      expect(calls[0]).not.toMatch(/clarisa_innovation_readiness_levels/i);
    });
  });
});
