import { QueryRunner } from 'typeorm';
import { AddInnovationUseCountsToSharedTables1787070034303 } from '../migrations/1787070034303-addInnovationUseCountsToSharedTables';

/**
 * DDL spec for M3 (T-06, R-IU-003 AC.1/AC.2, R-IU-004 AC.1/AC.2, R-IU-009 AC.2).
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on that captured text.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — see
 * `server/researchindicators/src/CLAUDE.md` §9: `orm.config.ts`'s
 * migrations glob is `require()`d directly by the TypeORM CLI, and a
 * `.spec.ts` inside `db/migrations/` crashes the migration runner
 * ("describe is not defined").
 *
 * KZ-001 guard: every expectation below is transcribed independently from
 * `design.md` §3.3 (`result_actors`, 5 columns) and §3.4 (`result_institution_types`,
 * 1 column) and from `requirements.md` R-IU-003 / R-IU-004 — none of it is
 * imported from, or derived from, the migration module itself. The spec
 * must fail if a column is renamed, typed `bigint`, made `NOT NULL`, given
 * a non-NULL default, or if `down()` drops a pre-existing column. A spec
 * that only asserts "an ALTER TABLE happened" proves nothing (T-06's
 * stated disqualifier).
 */

const RESULT_ACTORS_NEW_COLUMNS = [
  'women_youth_count',
  'women_not_youth_count',
  'men_youth_count',
  'men_not_youth_count',
  'actors_count',
] as const;

const RESULT_INSTITUTION_TYPES_NEW_COLUMNS = ['organization_count'] as const;

// Pre-existing columns on the two shared tables, transcribed from
// `1749957832239-createEntitiesForInnovationDev.ts` (the tables as
// authored) — NOT from the migration under test. down() must never touch
// these, and up() must never redeclare/alter them.
const RESULT_ACTORS_PRE_EXISTING_COLUMNS = [
  'result_actors_id',
  'result_id',
  'actor_type_id',
  'sex_age_disaggregation_not_apply',
  'women_youth',
  'women_not_youth',
  'men_youth',
  'men_not_youth',
  'actor_role_id',
];

const RESULT_INSTITUTION_TYPES_PRE_EXISTING_COLUMNS = [
  'result_institution_type_id',
  'result_id',
  'institution_type_id',
  'institution_type_role_id',
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

describe('AddInnovationUseCountsToSharedTables1787070034303 (M3 DDL spec)', () => {
  describe('up()', () => {
    let calls: string[];
    let alterCalls: string[];

    beforeAll(async () => {
      const migration = new AddInnovationUseCountsToSharedTables1787070034303();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      alterCalls = calls.filter((sql) => /ALTER TABLE/i.test(sql));
    });

    it('issues exactly six ALTER TABLE statements, one per new column, and nothing else', () => {
      expect(alterCalls).toHaveLength(6);
      expect(calls).toHaveLength(6);
    });

    it.each(RESULT_ACTORS_NEW_COLUMNS)(
      'adds `%s` to result_actors as a nullable int with no default other than NULL (trap: int not bigint — DD-6)',
      (column) => {
        const stmt = alterCalls.find(
          (sql) =>
            /`result_actors`/i.test(sql) &&
            new RegExp(`\`${column}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(
          new RegExp(
            `ALTER TABLE\\s*\`result_actors\`\\s*ADD\\s*\`${column}\`\\s*int\\s*NULL`,
            'i',
          ),
        );
        // Trap: bigint would match "consistency with the FK columns" but is
        // explicitly wrong per DD-6/R-IU-003.
        expect(stmt!).not.toMatch(/bigint/i);
        expect(stmt!).not.toMatch(/NOT NULL/i);
        expect(stmt!).not.toMatch(/DEFAULT/i);
        expect(stmt!).not.toMatch(/MODIFY COLUMN/i);
      },
    );

    it.each(RESULT_INSTITUTION_TYPES_NEW_COLUMNS)(
      'adds `%s` to result_institution_types as a nullable int with no default other than NULL',
      (column) => {
        const stmt = alterCalls.find(
          (sql) =>
            /`result_institution_types`/i.test(sql) &&
            new RegExp(`\`${column}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(
          new RegExp(
            `ALTER TABLE\\s*\`result_institution_types\`\\s*ADD\\s*\`${column}\`\\s*int\\s*NULL`,
            'i',
          ),
        );
        expect(stmt!).not.toMatch(/bigint/i);
        expect(stmt!).not.toMatch(/NOT NULL/i);
        expect(stmt!).not.toMatch(/DEFAULT/i);
      },
    );

    it('does NOT add a fifth/total column for the disaggregated mode (R-IU-003 AC.4, DD-7 — actors_count is the aggregate-mode column, not a sum column)', () => {
      const resultActorsColumnsTouched = alterCalls
        .filter((sql) => /`result_actors`/i.test(sql))
        .map((sql) => {
          const match = sql.match(/ADD\s*`([a-z0-9_]+)`/i);
          return match ? match[1] : null;
        })
        .filter((c): c is string => c !== null);
      expect(resultActorsColumnsTouched.sort()).toEqual(
        [...RESULT_ACTORS_NEW_COLUMNS].sort(),
      );
      // No 'total', 'sum', or 'women_total'/'men_total' style column.
      for (const sql of alterCalls) {
        expect(sql).not.toMatch(/`.*total.*`/i);
        expect(sql).not.toMatch(/`.*_sum`/i);
      }
    });

    it('never touches the four pre-existing boolean columns or any other pre-existing column on either table', () => {
      const preExisting = [
        ...RESULT_ACTORS_PRE_EXISTING_COLUMNS,
        ...RESULT_INSTITUTION_TYPES_PRE_EXISTING_COLUMNS,
      ];
      for (const sql of calls) {
        for (const column of preExisting) {
          expect(sql).not.toMatch(new RegExp(`\`${column}\``));
        }
      }
    });

    it('never issues MODIFY COLUMN, DROP COLUMN, or a CREATE/DROP TABLE statement', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/MODIFY COLUMN/i);
        expect(sql).not.toMatch(/DROP COLUMN/i);
        expect(sql).not.toMatch(/CREATE TABLE/i);
        expect(sql).not.toMatch(/DROP TABLE/i);
      }
    });

    it('touches only result_actors and result_institution_types', () => {
      for (const sql of calls) {
        const alterMatch = sql.match(/ALTER TABLE\s*`([a-z0-9_]+)`/i);
        expect(alterMatch).not.toBeNull();
        expect(['result_actors', 'result_institution_types']).toContain(
          alterMatch![1],
        );
      }
    });
  });

  describe('down()', () => {
    let calls: string[];

    beforeAll(async () => {
      const migration = new AddInnovationUseCountsToSharedTables1787070034303();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.down(runner);
      calls = recorded;
    });

    it('drops exactly the six new columns and nothing else', () => {
      expect(calls).toHaveLength(6);
      for (const sql of calls) {
        expect(sql).toMatch(/DROP COLUMN/i);
      }
    });

    it.each(RESULT_ACTORS_NEW_COLUMNS)(
      'drops `%s` from result_actors',
      (column) => {
        const stmt = calls.find(
          (sql) =>
            /`result_actors`/i.test(sql) &&
            new RegExp(`\`${column}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(
          new RegExp(
            `ALTER TABLE\\s*\`result_actors\`\\s*DROP COLUMN\\s*\`${column}\``,
            'i',
          ),
        );
      },
    );

    it.each(RESULT_INSTITUTION_TYPES_NEW_COLUMNS)(
      'drops `%s` from result_institution_types',
      (column) => {
        const stmt = calls.find(
          (sql) =>
            /`result_institution_types`/i.test(sql) &&
            new RegExp(`\`${column}\``, 'i').test(sql),
        );
        expect(stmt).toBeDefined();
        expect(stmt!).toMatch(
          new RegExp(
            `ALTER TABLE\\s*\`result_institution_types\`\\s*DROP COLUMN\\s*\`${column}\``,
            'i',
          ),
        );
      },
    );

    it('never drops any pre-existing column on either table (trap: down() must ONLY drop the six new columns)', () => {
      const preExisting = [
        ...RESULT_ACTORS_PRE_EXISTING_COLUMNS,
        ...RESULT_INSTITUTION_TYPES_PRE_EXISTING_COLUMNS,
      ];
      for (const sql of calls) {
        for (const column of preExisting) {
          expect(sql).not.toMatch(new RegExp(`\`${column}\``));
        }
      }
    });

    it('never issues DROP TABLE, CREATE TABLE, or a foreign-key statement', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/DROP TABLE/i);
        expect(sql).not.toMatch(/CREATE TABLE/i);
        expect(sql).not.toMatch(/FOREIGN KEY/i);
      }
    });

    it('touches only result_actors and result_institution_types', () => {
      for (const sql of calls) {
        const alterMatch = sql.match(/ALTER TABLE\s*`([a-z0-9_]+)`/i);
        expect(alterMatch).not.toBeNull();
        expect(['result_actors', 'result_institution_types']).toContain(
          alterMatch![1],
        );
      }
    });
  });
});
