import { QueryRunner } from 'typeorm';
import { CreateResultInnovationUse1787068132517 } from '../migrations/1787068132517-createResultInnovationUse';

/**
 * DDL spec for M2 (T-05, R-IU-001).
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
 * KZ-001 guard: every expectation below asserts the SQL text the migration
 * itself declares (table name, column types/nullability, PK, FK targets).
 * None of it is imported from, or derived from, the migration module — it
 * is transcribed from `design.md` §3.1 and R-IU-001. Changing the migration
 * to (for example) add a surrogate `id` PK, drop a FK, or make
 * `innovation_use_level_id` NOT NULL must fail one of these assertions —
 * that is the falsification this spec exists to catch. A test that only
 * checks the table exists proves nothing about the constraint (T-05's
 * stated disqualifier).
 */

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

describe('CreateResultInnovationUse1787068132517 (M2 DDL spec)', () => {
  describe('up()', () => {
    let calls: string[];
    let createTableSql: string;
    let alterCalls: string[];

    beforeAll(async () => {
      const migration = new CreateResultInnovationUse1787068132517();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;

      const createTableCalls = calls.filter((sql) => /CREATE TABLE/i.test(sql));
      expect(createTableCalls).toHaveLength(1);
      createTableSql = createTableCalls[0];

      alterCalls = calls.filter((sql) => /ALTER TABLE/i.test(sql));
    });

    it('creates exactly one table, result_innovation_use', () => {
      expect(createTableSql).toMatch(/`result_innovation_use`/);
    });

    it('declares `result_id` NOT NULL as the sole PRIMARY KEY (trap: no surrogate `id` column, and result_id is not merely unique)', () => {
      expect(createTableSql).toMatch(/`result_id`\s+bigint\s+NOT NULL/i);
      expect(createTableSql).toMatch(/PRIMARY KEY\s*\(\s*`result_id`\s*\)/i);
      // No separate auto-increment surrogate key.
      expect(createTableSql).not.toMatch(/AUTO_INCREMENT/i);
      // Guard against "unique instead of PK": there must be exactly one
      // PRIMARY KEY clause, and it must be the one asserted above.
      const primaryKeyMatches = createTableSql.match(/PRIMARY KEY/gi) ?? [];
      expect(primaryKeyMatches).toHaveLength(1);
    });

    it('declares `innovation_use_level_id` as a nullable bigint (trap: never NOT NULL — a draft can exist before a level is chosen)', () => {
      expect(createTableSql).toMatch(
        /`innovation_use_level_id`\s+bigint\s+NULL/i,
      );
      expect(createTableSql).not.toMatch(
        /`innovation_use_level_id`\s+bigint\s+NOT NULL/i,
      );
    });

    it('declares `innovation_use_level_explanation` as nullable text with no CHECK constraint (trap: the >=6 rule belongs to T-09, not a DB constraint)', () => {
      expect(createTableSql).toMatch(
        /`innovation_use_level_explanation`\s+text\s+NULL/i,
      );
      expect(createTableSql).not.toMatch(/CHECK/i);
    });

    it('carries the full AuditableEntity column set, including the deliberate timestamp precision asymmetry', () => {
      expect(createTableSql).toMatch(
        /`created_at`\s+timestamp\(6\)\s+NOT NULL DEFAULT CURRENT_TIMESTAMP\(6\)/i,
      );
      expect(createTableSql).toMatch(/`created_by`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(
        /`updated_at`\s+timestamp\(6\)\s+NULL DEFAULT CURRENT_TIMESTAMP\(6\) ON UPDATE CURRENT_TIMESTAMP\(6\)/i,
      );
      expect(createTableSql).toMatch(/`updated_by`\s+bigint\s+NULL/i);
      expect(createTableSql).toMatch(
        /`is_active`\s+tinyint\s+NOT NULL DEFAULT 1/i,
      );
      // deleted_at is plain `timestamp`, NOT `timestamp(6)` — asymmetry is intentional.
      expect(createTableSql).toMatch(/`deleted_at`\s+timestamp\s+NULL/i);
      expect(createTableSql).not.toMatch(/`deleted_at`\s+timestamp\(6\)/i);
    });

    it('uses utf8mb4 / utf8mb4_unicode_520_ci (TRD §5.1; deliberate asymmetry with the utf8mb3 precedent, FP-8)', () => {
      expect(createTableSql).toMatch(/utf8mb4/i);
      expect(createTableSql).toMatch(/utf8mb4_unicode_520_ci/i);
    });

    it('adds the result_id FK to results(result_id), with no ON DELETE/ON UPDATE clause (default RESTRICT — lifecycle routines handle deletion explicitly)', () => {
      const fkResult = alterCalls.find(
        (sql) =>
          /FOREIGN KEY\s*\(\s*`result_id`\s*\)/i.test(sql) &&
          /REFERENCES\s*`results`/i.test(sql),
      );
      expect(fkResult).toBeDefined();
      expect(fkResult!).toMatch(
        /REFERENCES\s*`results`\s*\(\s*`result_id`\s*\)/i,
      );
      expect(fkResult!).not.toMatch(/ON DELETE/i);
      expect(fkResult!).not.toMatch(/ON UPDATE/i);
    });

    it('adds the innovation_use_level_id FK to clarisa_innovation_use_levels(id) (trap: FK stores id, never level)', () => {
      const fkLevel = alterCalls.find(
        (sql) =>
          /FOREIGN KEY\s*\(\s*`innovation_use_level_id`\s*\)/i.test(sql) &&
          /REFERENCES\s*`clarisa_innovation_use_levels`/i.test(sql),
      );
      expect(fkLevel).toBeDefined();
      expect(fkLevel!).toMatch(
        /REFERENCES\s*`clarisa_innovation_use_levels`\s*\(\s*`id`\s*\)/i,
      );
      expect(fkLevel!).not.toMatch(/ON DELETE/i);
      expect(fkLevel!).not.toMatch(/ON UPDATE/i);
    });

    it('never references result_innovation_dev or clarisa_innovation_readiness_levels (this is a distinct table and a distinct catalog)', () => {
      for (const sql of calls) {
        expect(sql).not.toMatch(/result_innovation_dev/i);
        expect(sql).not.toMatch(/clarisa_innovation_readiness_levels/i);
      }
    });
  });

  describe('down()', () => {
    it('drops both FKs before dropping the table, touching only result_innovation_use, in reverse order of creation', async () => {
      const migration = new CreateResultInnovationUse1787068132517();
      const { runner, calls } = createRecordingQueryRunner();
      await migration.down(runner);

      expect(calls).toHaveLength(3);

      // Reverse of up(): level FK dropped first, then result FK, then the table.
      expect(calls[0]).toMatch(
        /ALTER TABLE `result_innovation_use` DROP FOREIGN KEY/i,
      );
      expect(calls[0]).toMatch(
        /innovation_use_level_id|FK_result_innovation_use_innovation_use_level_id/i,
      );

      expect(calls[1]).toMatch(
        /ALTER TABLE `result_innovation_use` DROP FOREIGN KEY/i,
      );
      expect(calls[1]).toMatch(/FK_result_innovation_use_result_id/i);

      expect(calls[2]).toMatch(/DROP TABLE/i);
      expect(calls[2]).toMatch(/`result_innovation_use`/);

      for (const sql of calls) {
        expect(sql).not.toMatch(/clarisa_innovation_use_levels`/i);
        expect(sql).not.toMatch(/DROP TABLE `results`/i);
      }
    });
  });
});
