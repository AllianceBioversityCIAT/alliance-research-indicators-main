import { QueryRunner } from 'typeorm';
import { CreateInnovationUseValidation1787078283929 } from '../migrations/1787078283929-createInnovationUseValidation';

/**
 * SQL-structure spec for M5 (T-09, R-IU-006, R-IU-003 mode invariant,
 * R-IU-009 AC.3, design.md §6.4).
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on the STRUCTURE of that
 * text. Same recording pattern as the M1/M3/M4 migration specs.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — see
 * `server/researchindicators/src/CLAUDE.md` §9.
 *
 * **Disqualifier (task T-09, KZ-001):** a bare `toContain('innovation_use_validation')`
 * assertion is a presence-assertion and proves nothing about the returned
 * boolean. No such assertion is used as evidence for any AC here. Every
 * expected pattern below has its **predicate and operator** independently
 * transcribed from `design.md` §6.4 and `requirements.md` R-IU-006 — never
 * derived by reading the emitted SQL and reverse-fitting a regex to it.
 * Local identifiers and table aliases (`useLevel`, `explanationValid`,
 * `tempFullActors`, `ciul.`, `ra.`, …) are necessarily the implementation's
 * own vocabulary, absent from both spec documents by construction (they
 * describe the rule, not the routine's variable names); those tokens are
 * matched as what they are — implementation detail — not claimed as
 * independently transcribed.
 *
 * What this spec does NOT prove: the function's *returned value* for any
 * input (AC.2-AC.11's behavioral claims). That proof is T-12's job
 * (design.md §6.5's fixture harness, F1–F12, F9b, F17) — see the task's
 * Done criterion 5. This spec proves SQL structure only: the four traps
 * named by the task, plus the "only this function is touched" safety rule.
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

/**
 * Splits a SQL expression on top-level `AND` keywords only — i.e. `AND`
 * tokens at parenthesis depth 0. Used to distinguish a flat AND-chain
 * (`x AND (guard) AND y`) from a guard nested inside a ternary IF's
 * FALSE-branch (`IF(cond, TRUE, (...) AND (guard) AND ...)`), where the
 * whole `IF(...)` collapses to ONE top-level term and the nested `AND`s
 * inside it are at depth > 0.
 */
function splitTopLevelAnd(expr: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && /^AND\b/i.test(expr.slice(i))) {
      terms.push(current.trim());
      current = '';
      i += 3;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim()) terms.push(current.trim());
  return terms;
}

describe('CreateInnovationUseValidation1787078283929 (M5 SQL-structure spec)', () => {
  describe('up()', () => {
    let calls: string[];
    let createStmt: string;
    let returnBody: string;

    beforeAll(async () => {
      const migration = new CreateInnovationUseValidation1787078283929();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;

      const created = calls.find((sql) => /CREATE FUNCTION/i.test(sql));
      expect(created).toBeDefined();
      createStmt = created!;

      const returnMatch = createStmt.match(/RETURN\s+([\s\S]*?);\s*END/i);
      expect(returnMatch).not.toBeNull();
      returnBody = returnMatch![1];
    });

    it('issues a DROP FUNCTION IF EXISTS followed by exactly one CREATE FUNCTION', () => {
      expect(calls).toHaveLength(2);
      expect(calls[0]).toMatch(/DROP FUNCTION IF EXISTS/i);
      expect(calls[1]).toMatch(/CREATE FUNCTION/i);
    });

    it('declares the correct signature: (result_code BIGINT) RETURNS tinyint(1), READS SQL DATA', () => {
      expect(createStmt).toMatch(
        /CREATE FUNCTION\s+`?innovation_use_validation`?\s*\(\s*result_code\s+BIGINT\s*\)\s*RETURNS\s+tinyint\(1\)/i,
      );
      expect(createStmt).toMatch(/READS SQL DATA/i);
    });

    // --- Trap 1 (DD-3/DC-10): the catalog join, and the level comparison
    // reading the JOINED `level`, never the FK `innovation_use_level_id`.
    describe('the catalog join and level comparison (DD-3 / DC-10)', () => {
      it('joins `clarisa_innovation_use_levels` on `id = innovation_use_level_id`', () => {
        expect(createStmt).toMatch(
          /JOIN\s+`?clarisa_innovation_use_levels`?\s+\w+\s+ON\s+\w+\.id\s*=\s*\w+\.innovation_use_level_id/i,
        );
      });

      it('selects the catalog `level` column (through the join) into a variable used in the level comparison', () => {
        // The SELECT list must read `<alias>.level` from the joined catalog.
        expect(createStmt).toMatch(
          /\bciul\.level\b|clarisa_innovation_use_levels`?\.level\b/i,
        );
      });

      it('the level comparison against 6 is made on the variable bound to the joined `level` column, never on `innovation_use_level_id` directly (falsification target: writing `innovation_use_level_id >= 6` must make THIS assertion fail)', () => {
        // Positive: the RETURN statement compares the joined-level variable.
        expect(returnBody).toMatch(/useLevel\s*>=\s*6/i);
        // Negative: the FK column must never be compared to 6 anywhere in
        // the function body — that is the off-by-one trap (id 6 is level 5).
        expect(createStmt).not.toMatch(/innovation_use_level_id\s*>=\s*6/i);
      });

      it('the conditional explanation rule is `IF(<level> >= 6, <explanation valid>, TRUE)` — not required below level 6', () => {
        expect(returnBody).toMatch(
          /IF\(\s*useLevel\s*>=\s*6\s*,\s*explanationValid\s*,\s*TRUE\s*\)/i,
        );
      });
    });

    // --- Trap 2 (DD-4): role filter present on every result_actors query,
    // unlike innovation_dev_validation.
    describe('role filtering — actor_role_id = 2 (DD-4)', () => {
      it('every `FROM result_actors` block filters on `actor_role_id = 2` (ActorRolesEnum.INNOVATION_USE)', () => {
        const actorBlocks = createStmt.split(/FROM\s+result_actors/i).slice(1);
        expect(actorBlocks.length).toBeGreaterThanOrEqual(3);
        for (const block of actorBlocks) {
          // Scope to this block's own WHERE clause (up to the next SELECT
          // or end of body), so a match in a later block isn't credited to
          // an earlier one.
          const clause = block.split(/SELECT/i)[0];
          expect(clause).toMatch(/actor_role_id\s*=\s*2\b/);
          expect(clause).toMatch(/is_active\s*=\s*TRUE/i);
        }
      });
    });

    // --- Trap 3 (DD-10): the dead ELSE branch must NOT be copied.
    describe('actor type resolution — no dead branch (DD-10)', () => {
      it('uses `IF(actor_type_id = 5, valid_text(actor_type_custom_name), TRUE)`', () => {
        expect(createStmt).toMatch(
          /IF\(\s*ra\.actor_type_id\s*=\s*5\s*,\s*valid_text\(\s*ra\.actor_type_custom_name\s*\)\s*,\s*TRUE\s*\)/i,
        );
      });

      it("does NOT copy `innovation_dev_validation`'s unreachable `ELSE actor_type_id IS NOT NULL` branch", () => {
        expect(createStmt).not.toMatch(
          /ELSE\s+ra?\.?actor_type_id\s+IS\s+NOT\s+NULL/i,
        );
        expect(createStmt).not.toMatch(
          /WHEN\s+ra\.actor_type_id\s*=\s*5\s+THEN/i,
        );
      });
    });

    // --- Step 4 / RB-5 layer 2 / AC.10: mode consistency, both directions.
    describe('actor mode consistency — both directions (RB-5 layer 2 / AC.10)', () => {
      it('branches on `sex_age_disaggregation_not_apply = TRUE`', () => {
        expect(createStmt).toMatch(
          /sex_age_disaggregation_not_apply\s*=\s*TRUE/i,
        );
      });

      it('the aggregate-mode branch requires `actors_count IS NOT NULL`', () => {
        expect(createStmt).toMatch(/actors_count\s+IS\s+NOT\s+NULL/i);
      });

      it('the disaggregated-mode branch requires at least one of the four counts to be non-null', () => {
        const modeMatch = createStmt.match(
          /sex_age_disaggregation_not_apply[\s\S]{0,400}/i,
        );
        expect(modeMatch).not.toBeNull();
        const region = modeMatch![0];
        expect(region).toMatch(/women_youth_count\s+IS\s+NOT\s+NULL/i);
        expect(region).toMatch(/women_not_youth_count\s+IS\s+NOT\s+NULL/i);
        expect(region).toMatch(/men_youth_count\s+IS\s+NOT\s+NULL/i);
        expect(region).toMatch(/men_not_youth_count\s+IS\s+NOT\s+NULL/i);
        // Both branches live in the same construct (both directions covered
        // together, not as two disconnected fixes).
        expect(region).toMatch(/OR/i);
      });
    });

    // --- Trap 4 (DD-11): the zero-actor guard is UNCONDITIONAL.
    describe('the zero-actor guard is unconditional (DD-11 / AC.11)', () => {
      it("the RETURN statement is a flat top-level AND-chain, not a wrapping ternary (unlike `innovation_dev_validation`'s `RETURN IF(anticipatedUserId = 1 OR ..., TRUE, (...))`)", () => {
        expect(returnBody.trim()).not.toMatch(/^IF\s*\(/i);
      });

      it('a "> 0" guard on the actor row count is present as its OWN top-level AND conjunct — not nested inside an IF(...) whose TRUE branch would bypass it', () => {
        const terms = splitTopLevelAnd(returnBody);
        const guardTerm = terms.find((t) => /tempFullActors\s*>\s*0/i.test(t));
        expect(guardTerm).toBeDefined();
        // If the guard were nested (as in innovation_dev_validation's
        // conditional form), the enclosing IF(...) would be the term that
        // matched here, and that term would itself contain "IF(" and the
        // literal "TRUE" (the bypass branch). A flat, unconditional guard
        // term contains neither.
        expect(guardTerm).not.toMatch(/IF\s*\(/i);
        expect(guardTerm).not.toMatch(/\bTRUE\b/i);
      });
    });

    it('reuses `valid_text()` and introduces no new helper function (no other CREATE FUNCTION in this migration)', () => {
      const createFunctionStmts = calls.filter((sql) =>
        /CREATE FUNCTION/i.test(sql),
      );
      expect(createFunctionStmts).toHaveLength(1);
      expect(createStmt).toMatch(/valid_text\(/);
    });

    // --- R-IU-009 AC.3: DROP/CREATE name only innovation_use_validation.
    it('names only `innovation_use_validation` in DROP and CREATE — no other `*_validation` function is touched', () => {
      for (const sql of calls) {
        const validationIdentifiers =
          sql.match(/`?[a-z][a-z0-9_]*_validation`?/gi) ?? [];
        for (const ident of validationIdentifiers) {
          expect(ident.replace(/`/g, '')).toBe('innovation_use_validation');
        }
      }
    });
  });

  describe('down()', () => {
    let calls: string[];

    beforeAll(async () => {
      const migration = new CreateInnovationUseValidation1787078283929();
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.down(runner);
      calls = recorded;
    });

    it('issues exactly one DROP FUNCTION IF EXISTS `innovation_use_validation` and nothing else', () => {
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatch(
        /DROP FUNCTION IF EXISTS\s+`?innovation_use_validation`?/i,
      );
      expect(calls[0]).not.toMatch(/CREATE FUNCTION/i);
    });

    it('touches no other `*_validation` function (R-IU-009 AC.3 — no `innovation_dev_validation` or other function dropped)', () => {
      for (const sql of calls) {
        const validationIdentifiers =
          sql.match(/`?[a-z][a-z0-9_]*_validation`?/gi) ?? [];
        for (const ident of validationIdentifiers) {
          expect(ident.replace(/`/g, '')).toBe('innovation_use_validation');
        }
      }
    });
  });
});
