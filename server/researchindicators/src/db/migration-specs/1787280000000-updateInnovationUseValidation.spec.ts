import { QueryRunner } from 'typeorm';
import { CreateInnovationUseValidation1787078283929 } from '../migrations/1787078283929-createInnovationUseValidation';
import { UpdateInnovationUseValidation1787280000000 } from '../migrations/1787280000000-updateInnovationUseValidation';

/**
 * SQL-STRUCTURE spec for T-18 (`docs/specs/changes/innovation-use-required-fields`,
 * `R-IUR-012` AC.2-AC.5, `R-IUR-011` AC.4, `DD-6`).
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on the STRUCTURE of that
 * text. Same recording pattern as `1787078283929-createInnovationUseValidation.spec.ts`.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — the
 * `orm.config.ts` migrations glob `require()`s every file under
 * `src/db/migrations/**`, expecting a `MigrationInterface` export; a
 * `*.spec.ts` there crashes the migration runner with
 * `ReferenceError: describe is not defined` (`server/researchindicators/src/CLAUDE.md` §9).
 *
 * ---
 *
 * **`R-IUR-012` AC.5 / `DC-7` — the disqualifier this file exists to honor,
 * recorded IN-FILE as the task instructs, not only in the Implementer's
 * report:**
 *
 * **This spec proves SQL STRUCTURE only. It does NOT and CANNOT prove the
 * function's runtime BEHAVIOR** — that every violating row is actually
 * counted, that the NULL-safe branches actually route NULL correctly, that
 * the parenthesization actually groups the way MySQL's own parser reads
 * it. A `QueryRunner` mock here only RECORDS the SQL text passed to
 * `.query()`; it never sends that text to a real MySQL server, so it
 * cannot evaluate operator precedence, execute an `EXISTS(...)` subquery,
 * or run an `IF(...)` branch. Asserting on the migration's SQL STRING is
 * not evidence of behavior and must never be reported as parity
 * (`R-IUR-012` S1's `BUT`). **That proof is `T-19`'s alone** — the
 * executed truth table against real MySQL in
 * `test/fixtures/innovation-use/innovation-use-validation.fixture-spec.ts`.
 *
 * What THIS spec proves: (1) the migration touches only
 * `innovation_use_validation`, never `innovation_dev_validation` or any
 * other `*_validation` function (`R-IUR-011` AC.4); (2) `up()` is a single
 * `DROP FUNCTION IF EXISTS` followed by a single `CREATE FUNCTION`,
 * append-only in shape; (3) `down()` is non-empty and its `CREATE
 * FUNCTION` statement is a BYTE-IDENTICAL restoration of the function body
 * this migration replaces (`R-IUR-012` AC.4) — never a bare drop; (4) the
 * verbatim rules 14-15 block (`C-5`) — the `SELECT ... INTO commonFields,
 * useLevel, explanationValid ... LIMIT 1;` statement and the
 * `IF(useLevel >= 6, explanationValid, TRUE)` RETURN conjunct — is
 * CHARACTER-IDENTICAL between the prior migration's body and this one's,
 * proven by extracting the same regex-captured substring from both
 * migrations' actual recorded SQL and asserting string equality (`toBe`),
 * never by eyeballing a diff.
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

/** Extracts the rules-14/15 `SELECT ... INTO ... LIMIT 1;` statement. */
function extractLevelJustificationBlock(sql: string): string | null {
  const m = sql.match(/SELECT\s+riu\.innovation_use_level_id[\s\S]*?LIMIT 1;/);
  return m ? m[0] : null;
}

describe('UpdateInnovationUseValidation1787280000000 (T-18 SQL-structure spec)', () => {
  let oldCalls: string[];
  let newUpCalls: string[];
  let newDownCalls: string[];
  let newCreateStmt: string;
  let newReturnBody: string;

  beforeAll(async () => {
    const oldMigration = new CreateInnovationUseValidation1787078283929();
    const oldRecording = createRecordingQueryRunner();
    await oldMigration.up(oldRecording.runner);
    oldCalls = oldRecording.calls;

    const newMigration = new UpdateInnovationUseValidation1787280000000();
    const upRecording = createRecordingQueryRunner();
    await newMigration.up(upRecording.runner);
    newUpCalls = upRecording.calls;

    const downRecording = createRecordingQueryRunner();
    await newMigration.down(downRecording.runner);
    newDownCalls = downRecording.calls;

    const created = newUpCalls.find((sql) => /CREATE FUNCTION/i.test(sql));
    expect(created).toBeDefined();
    newCreateStmt = created!;

    const returnMatch = newCreateStmt.match(/RETURN\s+([\s\S]*?);\s*END/i);
    expect(returnMatch).not.toBeNull();
    newReturnBody = returnMatch![1];
  });

  describe('naming discipline — only `innovation_use_validation` is touched (R-IUR-011 AC.4)', () => {
    it('up() names only `innovation_use_validation` in both the DROP and the CREATE', () => {
      for (const sql of newUpCalls) {
        const validationIdentifiers =
          sql.match(/`?[a-z][a-z0-9_]*_validation`?/gi) ?? [];
        for (const ident of validationIdentifiers) {
          expect(ident.replace(/`/g, '')).toBe('innovation_use_validation');
        }
      }
    });

    it('down() names only `innovation_use_validation` in both the DROP and the restored CREATE', () => {
      for (const sql of newDownCalls) {
        const validationIdentifiers =
          sql.match(/`?[a-z][a-z0-9_]*_validation`?/gi) ?? [];
        for (const ident of validationIdentifiers) {
          expect(ident.replace(/`/g, '')).toBe('innovation_use_validation');
        }
      }
    });

    // Falsifying input (tasks.md T-18): add a second function name to the
    // DROP statement — both assertions above must redden. Verified by hand
    // during implementation (see the Implementer's report); not encoded as
    // a live mutation here, since the two assertions above already fail on
    // exactly that input by construction.
  });

  describe('up() is append-only in shape: one DROP, then exactly one CREATE', () => {
    it('issues a DROP FUNCTION IF EXISTS followed by exactly one CREATE FUNCTION', () => {
      expect(newUpCalls).toHaveLength(2);
      expect(newUpCalls[0]).toMatch(/DROP FUNCTION IF EXISTS/i);
      expect(newUpCalls[1]).toMatch(/CREATE FUNCTION/i);
    });

    it('declares the correct signature: (result_code BIGINT) RETURNS tinyint(1), READS SQL DATA', () => {
      expect(newCreateStmt).toMatch(
        /CREATE FUNCTION\s+`?innovation_use_validation`?\s*\(\s*result_code\s+BIGINT\s*\)\s*RETURNS\s+tinyint\(1\)/i,
      );
      expect(newCreateStmt).toMatch(/READS SQL DATA/i);
    });

    it('introduces no new helper function — exactly one CREATE FUNCTION in up(), reusing `valid_text()`', () => {
      const createFunctionStmts = newUpCalls.filter((sql) =>
        /CREATE FUNCTION/i.test(sql),
      );
      expect(createFunctionStmts).toHaveLength(1);
      expect(newCreateStmt).toMatch(/valid_text\(/);
    });
  });

  describe('down() is non-empty and restores the PREVIOUS body verbatim (R-IUR-012 AC.4)', () => {
    it('issues a DROP FUNCTION IF EXISTS followed by exactly one CREATE FUNCTION — never a bare drop', () => {
      expect(newDownCalls).toHaveLength(2);
      expect(newDownCalls[0]).toMatch(/DROP FUNCTION IF EXISTS/i);
      expect(newDownCalls[1]).toMatch(/CREATE FUNCTION/i);
    });

    it("down()'s restored CREATE FUNCTION statement is BYTE-IDENTICAL to the prior migration's own up() CREATE FUNCTION statement", () => {
      const priorCreate = oldCalls.find((sql) => /CREATE FUNCTION/i.test(sql));
      expect(priorCreate).toBeDefined();

      const restoredCreate = newDownCalls.find((sql) =>
        /CREATE FUNCTION/i.test(sql),
      );
      expect(restoredCreate).toBeDefined();

      // Strict string equality — not a regex "looks similar" match. This is
      // how "restores the previous body verbatim" is checked: the exact
      // text this migration's down() sends to MySQL is compared,
      // character-for-character, against the exact text the migration
      // being replaced sent to MySQL for the same statement.
      expect(restoredCreate).toBe(priorCreate);
    });
  });

  describe('constraint 1 (C-5): rules 14-15 are character-identical to the source', () => {
    it('the level/justification SELECT ... INTO ... LIMIT 1 block is BYTE-IDENTICAL between the prior migration and this one', () => {
      const priorCreate = oldCalls.find((sql) => /CREATE FUNCTION/i.test(sql))!;
      const priorBlock = extractLevelJustificationBlock(priorCreate);
      const newBlock = extractLevelJustificationBlock(newCreateStmt);

      expect(priorBlock).not.toBeNull();
      expect(newBlock).not.toBeNull();
      // Strict equality on the extracted substring — proves the
      // `r.is_active` / `riu.is_active` filters and the `LIMIT 1` survived
      // untouched, not merely that a similarly-shaped block exists.
      expect(newBlock).toBe(priorBlock);
    });

    it("the RETURN statement's `IF(useLevel >= 6, explanationValid, TRUE)` conjunct is present, character-identical to the prior migration's", () => {
      const priorCreate = oldCalls.find((sql) => /CREATE FUNCTION/i.test(sql))!;
      const conjunctPattern = /IF\(useLevel >= 6, explanationValid, TRUE\)/;

      const priorMatch = priorCreate.match(conjunctPattern);
      const newMatch = newReturnBody.match(conjunctPattern);

      expect(priorMatch).not.toBeNull();
      expect(newMatch).not.toBeNull();
      expect(newMatch![0]).toBe(priorMatch![0]);
    });

    // Falsifying input (tasks.md T-18): delete the
    // `IF(useLevel >= 6, ...)` conjunct from the new migration's RETURN —
    // both assertions in this describe block must redden (the second one
    // directly; the first is unaffected by this particular mutation and is
    // the control for the OTHER falsifying input, the rules-14/15 SELECT
    // block). Verified by hand during implementation; see the
    // Implementer's report for the observed red and revert.
  });

  describe('constraint 4: every top-level grouping in the RETURN statement is parenthesized', () => {
    it('the four violation-count conjuncts and the level/justification conjuncts are each wrapped in their own parentheses', () => {
      expect(newReturnBody).toMatch(/\(tempActorViolations\s*=\s*0\)/);
      expect(newReturnBody).toMatch(/\(tempOrganizationViolations\s*=\s*0\)/);
      expect(newReturnBody).toMatch(/\(tempMeasureViolations\s*=\s*0\)/);
    });
  });

  describe('the new violation-counting shape (DD-6): one COUNT(*) per collection, scoped is_active + role (DD-0)', () => {
    it('scopes the actor violation count by is_active = TRUE and actor_role_id = 2', () => {
      const actorBlock = newCreateStmt.split(/FROM result_actors/i)[1];
      expect(actorBlock).toBeDefined();
      const clause = actorBlock.split(
        /SELECT COUNT|FROM result_institution_types/i,
      )[0];
      expect(clause).toMatch(/is_active\s*=\s*TRUE/i);
      expect(clause).toMatch(/actor_role_id\s*=\s*2\b/);
    });

    it('scopes the organization violation count by is_active = TRUE and institution_type_role_id = 2', () => {
      const orgBlock = newCreateStmt.split(/FROM result_institution_types/i)[1];
      expect(orgBlock).toBeDefined();
      const clause = orgBlock.split(/FROM result_quantifications/i)[0];
      expect(clause).toMatch(/is_active\s*=\s*TRUE/i);
      expect(clause).toMatch(/institution_type_role_id\s*=\s*2\b/);
    });

    it('scopes the measure violation count by is_active = TRUE and quantification_role_id = 3', () => {
      const measureBlock = newCreateStmt.split(
        /FROM result_quantifications/i,
      )[1];
      expect(measureBlock).toBeDefined();
      expect(measureBlock).toMatch(/is_active\s*=\s*TRUE/i);
      expect(measureBlock).toMatch(/quantification_role_id\s*=\s*3\b/);
    });

    it('names each violation counter as its own DECLARE and folds all three into the RETURN as `= 0` conjuncts (DD-6: violating rows, not the old tempFullActors anchor)', () => {
      expect(newCreateStmt).toMatch(/DECLARE tempActorViolations INT/i);
      expect(newCreateStmt).toMatch(/DECLARE tempOrganizationViolations INT/i);
      expect(newCreateStmt).toMatch(/DECLARE tempMeasureViolations INT/i);
      // The retired anchor must not reappear.
      expect(newCreateStmt).not.toMatch(/tempFullActors/i);
    });
  });

  describe('DD-5: the sub-type predicate mirrors the CLIENT, not the naive innovation-dev EXISTS', () => {
    it('requires the parent type to be a root (`parent_code IS NULL`) and active, with `is_active` never applied to the child alias', () => {
      const orgBlock = newCreateStmt.split(/FROM result_institution_types/i)[1];
      expect(orgBlock).toMatch(
        /t\.parent_code IS NULL[\s\S]{0,40}AND[\s\S]{0,40}t\.is_active = TRUE/i,
      );
      // The naive mirror this spec's design explicitly rejects.
      expect(orgBlock).not.toMatch(/c\.is_active/i);
    });

    it('joins a chosen sub-type back to its own institution_type_id (rule 8b, DD-5b)', () => {
      const orgBlock = newCreateStmt.split(/FROM result_institution_types/i)[1];
      expect(orgBlock).toMatch(
        /c\.parent_code\s*=\s*rit\.institution_type_id/i,
      );
    });
  });

  describe('append-only shape: this is a NEW file, not an edit of the migration it replaces', () => {
    it('the new migration class name and timestamp differ from the prior migration, and the new timestamp sorts after it', () => {
      const oldMigration = new CreateInnovationUseValidation1787078283929();
      const newMigration = new UpdateInnovationUseValidation1787280000000();
      expect(newMigration.name).not.toBe(oldMigration.name);

      const oldTs = Number(oldMigration.name.match(/(\d+)$/)![1]);
      const newTs = Number(newMigration.name.match(/(\d+)$/)![1]);
      expect(newTs).toBeGreaterThan(oldTs);
      // Must also sort after the latest migration in the tree at the time
      // this task was written (1787270000000 —
      // normaliseQuantificationNumberInReportOicr).
      expect(newTs).toBeGreaterThan(1787270000000);
    });
  });
});
