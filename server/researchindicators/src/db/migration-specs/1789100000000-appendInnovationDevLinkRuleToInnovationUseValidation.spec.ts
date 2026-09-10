import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { LinkResultRolesEnum } from '../../domain/entities/link-result-roles/enum/link-result-roles.enum';
import { UpdateInnovationUseValidation1787280000000 } from '../migrations/1787280000000-updateInnovationUseValidation';
import { AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000 } from '../migrations/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation';

/**
 * SQL-STRUCTURE spec for T-02 (`docs/specs/innovation-use/link-innovation-dev`,
 * `R-IUL-009` — both scenarios and every `BUT`/`AND IT MUST` clause), design.md
 * §3.3, §11.3, §11.4, DD-5, DD-10.
 *
 * UNIT test (`npm test`) — never opens a real MySQL connection. Runs the
 * migration's `up()` / `down()` against a fake `QueryRunner` that records
 * the SQL text passed to `.query()`, then asserts on the STRUCTURE of that
 * text. Same recording pattern as
 * `1787280000000-updateInnovationUseValidation.spec.ts` and
 * `1789000000000-insertInnovationUseLinkedDevRole.spec.ts`.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration — the
 * `orm.config.ts` migrations glob `require()`s every file under
 * `src/db/migrations/**`, expecting a `MigrationInterface` export; a
 * `*.spec.ts` there crashes the migration runner with
 * `ReferenceError: describe is not defined`
 * (`server/researchindicators/src/CLAUDE.md` §9).
 *
 * ---
 *
 * **CANNOT PROVE (KZ-001) — stated here, per the task's instruction, not
 * only in the Implementer's report:** this spec proves SQL STRUCTURE only.
 * It does NOT and CANNOT prove rule 16's runtime BEHAVIOR — that a real
 * active role-5 link actually flips the check to `TRUE`, that a deactivated
 * link row or an inactive/non-indicator-2 target actually flip it back to
 * `FALSE`, or that rules 2-15 still discriminate correctly once rule 16 is
 * appended. A `QueryRunner` mock here only RECORDS the SQL text passed to
 * `.query()`; it never sends that text to a real MySQL server, so it cannot
 * evaluate operator precedence, execute the `EXISTS(...)` subquery, or run
 * any `IF(...)` branch. Asserting on the migration's SQL STRING is not
 * evidence of behavior and must never be reported as such. **That proof is
 * T-03's alone** — the executed truth table against real MySQL in
 * `test/fixtures/innovation-use/`.
 *
 * What THIS spec proves: (1) the migration touches only
 * `innovation_use_validation`, never `innovation_dev_validation` or any
 * other `*_validation` function, in either `up()` or `down()`, each checked
 * on its OWN calls so a defect in one direction cannot hide behind the
 * other (`R-IUL-009` "IT MUST NOT touch `innovation_dev_validation`",
 * KZ-014); (2) `up()` is a single `DROP FUNCTION IF EXISTS` followed by a
 * single `CREATE FUNCTION`, append-only in shape; (3) `down()` is
 * non-empty and its `CREATE FUNCTION` statement is a BYTE-IDENTICAL
 * restoration of `1787280000000`'s own `up()` CREATE FUNCTION statement —
 * never a bare drop; (4) the entire pre-`RETURN` body — every `DECLARE`,
 * both `SELECT ... INTO` blocks, all three violation-count `SELECT`s,
 * comments included — is CHARACTER-IDENTICAL between `1787280000000`'s
 * `up()` and this migration's `up()`, proven by extracting the same
 * substring from both migrations' actual recorded SQL and asserting string
 * equality (`toBe`), never by eyeballing a diff (`R-IUL-009` "IT MUST NOT
 * weaken, reorder or drop any of rules 2-15"); (5) rule 16's appended
 * conjunct is present, `EXISTS`-shaped (never `COUNT(*) = 1`, DD-5),
 * interpolates `LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV` from the
 * enum rather than a bare literal, filters `is_active` on both `lr` and
 * `r2`, filters `r2.indicator_id = 2`, and carries no created-before /
 * cut-off predicate of any kind (no grandfathering, DD-8/OQ-1).
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

/** Extracts the CREATE FUNCTION statement's body up to (excluding) RETURN. */
function extractPreReturnBody(createStmt: string): string | null {
  const m = createStmt.match(
    /CREATE FUNCTION[\s\S]*?BEGIN([\s\S]*?)RETURN commonFields/,
  );
  return m ? m[1] : null;
}

describe('AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000 (T-02 SQL-structure spec)', () => {
  let priorCreateStmt: string;
  let newUpCalls: string[];
  let newDownCalls: string[];
  let newCreateStmt: string;
  let newDownCreateStmt: string;
  let newReturnBody: string;

  beforeAll(async () => {
    const priorMigration = new UpdateInnovationUseValidation1787280000000();
    const priorRecording = createRecordingQueryRunner();
    await priorMigration.up(priorRecording.runner);
    priorCreateStmt = priorRecording.calls.find((sql) =>
      /CREATE FUNCTION/i.test(sql),
    )!;
    expect(priorCreateStmt).toBeDefined();

    const newMigration =
      new AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000();

    const upRecording = createRecordingQueryRunner();
    await newMigration.up(upRecording.runner);
    newUpCalls = upRecording.calls;

    const downRecording = createRecordingQueryRunner();
    await newMigration.down(downRecording.runner);
    newDownCalls = downRecording.calls;

    newCreateStmt = newUpCalls.find((sql) => /CREATE FUNCTION/i.test(sql))!;
    expect(newCreateStmt).toBeDefined();

    newDownCreateStmt = newDownCalls.find((sql) =>
      /CREATE FUNCTION/i.test(sql),
    )!;
    expect(newDownCreateStmt).toBeDefined();

    const returnMatch = newCreateStmt.match(/RETURN\s+([\s\S]*?);\s*END/i);
    expect(returnMatch).not.toBeNull();
    newReturnBody = returnMatch![1];
  });

  describe('naming discipline — only `innovation_use_validation` is touched (R-IUL-009 "IT MUST NOT touch innovation_dev_validation")', () => {
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

    // Falsifying input (tasks.md T-02): rename the function this spec
    // expects to `innovation_dev_validation` in the assertion above (or in
    // the migration's own DROP/CREATE) — both `it`s above must redden.
    // Verified by hand during implementation (see the Implementer's
    // report); not encoded as a live mutation here, since the assertions
    // above already fail on exactly that input by construction.
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

  describe("down() is non-empty and restores 1787280000000's body verbatim, never a bare drop (design §11.3, §11.4)", () => {
    it('issues a DROP FUNCTION IF EXISTS followed by exactly one CREATE FUNCTION', () => {
      expect(newDownCalls).toHaveLength(2);
      expect(newDownCalls[0]).toMatch(/DROP FUNCTION IF EXISTS/i);
      expect(newDownCalls[1]).toMatch(/CREATE FUNCTION/i);
    });

    it("down()'s restored CREATE FUNCTION statement is BYTE-IDENTICAL to 1787280000000's own up() CREATE FUNCTION statement", () => {
      // Strict string equality — not a regex "looks similar" match. This is
      // how "restores verbatim" is checked: the exact text this
      // migration's down() sends to MySQL is compared, character-for-
      // character, against the exact text the migration being replaced
      // sent to MySQL for the same statement.
      expect(newDownCreateStmt).toBe(priorCreateStmt);
    });
  });

  describe('rules 2-15 are character-identical to 1787280000000\'s up() (R-IUL-009: "IT MUST NOT weaken, reorder or drop any of rules 2-15")', () => {
    it('the entire pre-RETURN body (every DECLARE and every SELECT ... INTO block, comments included) is BYTE-IDENTICAL between the prior migration and this one', () => {
      const priorBody = extractPreReturnBody(priorCreateStmt);
      const newBody = extractPreReturnBody(newCreateStmt);

      expect(priorBody).not.toBeNull();
      expect(newBody).not.toBeNull();
      expect(newBody).toBe(priorBody);
    });

    // Falsifying input (tasks.md T-02): retype or reorder any line of the
    // copied body (e.g. drop the `riu.is_active = TRUE` filter, or reorder
    // the two `SELECT COUNT(*)` blocks) — the toBe() assertion above must
    // redden, since it compares the full extracted substring, not a
    // presence check. Verified by hand during implementation.

    it("the RETURN statement's first four conjuncts (commonFields, the level/justification IF, and the three violation counts) are character-identical to the prior migration's, before rule 16's appended conjunct", () => {
      const priorReturnMatch = priorCreateStmt.match(
        /RETURN\s+([\s\S]*?);\s*END/i,
      );
      expect(priorReturnMatch).not.toBeNull();
      const priorReturnBody = priorReturnMatch![1];

      // The prior migration's RETURN has exactly these four conjuncts and
      // nothing else; this migration's RETURN must start with the exact
      // same four, only THEN diverging to add rule 16.
      expect(newReturnBody.startsWith(priorReturnBody)).toBe(true);
    });
  });

  describe('rule 16 (design §3.3, DD-5): EXISTS over an active role-5 link to an active indicator-2 result', () => {
    it("appends exactly one additional top-level AND conjunct beyond the prior migration's four", () => {
      const priorReturnMatch = priorCreateStmt.match(
        /RETURN\s+([\s\S]*?);\s*END/i,
      );
      const priorReturnBody = priorReturnMatch![1];
      const appended = newReturnBody.slice(priorReturnBody.length);
      expect(appended.trim()).toMatch(/^AND\s*\(/);
    });

    it('uses EXISTS, never a COUNT(*) = 1 cardinality assertion (DD-5)', () => {
      expect(newReturnBody).toMatch(/EXISTS\s*\(/i);
      expect(newReturnBody).not.toMatch(/COUNT\(\*\)\s*=\s*1/i);
    });

    it('joins link_results to results on other_result_id, scoped to result_code and the role-5 enum value', () => {
      expect(newReturnBody).toMatch(/FROM link_results lr/i);
      expect(newReturnBody).toMatch(
        /INNER JOIN results r2 ON r2\.result_id\s*=\s*lr\.other_result_id/i,
      );
      expect(newReturnBody).toMatch(/lr\.result_id\s*=\s*result_code/i);
      expect(newReturnBody).toMatch(
        new RegExp(
          `lr\\.link_result_role_id\\s*=\\s*${LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV}\\b`,
        ),
      );
    });

    it('filters is_active = TRUE on BOTH the link row and the target result (DD-0 family — a deactivated link or an inactive target must not satisfy rule 16)', () => {
      expect(newReturnBody).toMatch(/lr\.is_active\s*=\s*TRUE/i);
      expect(newReturnBody).toMatch(/r2\.is_active\s*=\s*TRUE/i);
    });

    it('requires the target to be indicator_id = 2 (Innovation Dev)', () => {
      expect(newReturnBody).toMatch(/r2\.indicator_id\s*=\s*2\b/);
    });

    it('wraps the whole appended conjunct in its own parentheses, matching the style of every other top-level RETURN conjunct (KZ-017)', () => {
      expect(newReturnBody).toMatch(
        /AND\s*\(\s*EXISTS\s*\([\s\S]*?\)\s*\)\s*;?\s*$/,
      );
    });

    it('carries no created-before / cut-off / date predicate of any kind — no grandfathering (DD-8, OQ-1)', () => {
      const appendedConjunct = newReturnBody.slice(
        newReturnBody.indexOf('EXISTS'),
      );
      expect(appendedConjunct).not.toMatch(
        /created_(at|date)|created[-_ ]?before|cut[-_ ]?off|BEFORE\s+['"]?\d{4}/i,
      );
    });

    // Falsifying input (tasks.md T-02): delete rule 16's appended conjunct
    // entirely from the migration's RETURN — the "appends exactly one
    // additional conjunct" test above must redden (an empty appended
    // string does not match /^AND\s*\(/). Verified by hand during
    // implementation.
  });

  describe('source (raw file text) — the enum is imported and interpolated, never a bare literal 5', () => {
    it('imports LinkResultRolesEnum from the domain enum module', () => {
      const src = readFileSync(
        join(
          __dirname,
          '../migrations/1789100000000-appendInnovationDevLinkRuleToInnovationUseValidation.ts',
        ),
        'utf8',
      ) as string;

      expect(src).toMatch(
        /import\s*\{\s*LinkResultRolesEnum\s*\}\s*from\s*['"].*link-result-roles\.enum['"]/,
      );

      // Anchored to the EMITTED region only (from `public async up(` to
      // end-of-file), never to the TSDoc header above it — a file-wide
      // match here would also be satisfied by prose in the header comment
      // that merely quotes the enum name (KZ-001: a property that lives in
      // generated output must be asserted THERE, never on text that
      // happens to describe it). Requiring the following
      // `AND lr.is_active = TRUE` line forces the match inside up()'s own
      // template literal, matching the anchoring already used by
      // `1789000000000-insertInnovationUseLinkedDevRole.spec.ts:62`.
      const emitting = src.slice(src.indexOf('public async up('));
      expect(emitting).toMatch(
        /AND lr\.link_result_role_id = \$\{LinkResultRolesEnum\.INNOVATION_USE_LINKED_DEV\}\s*\n\s*AND lr\.is_active = TRUE/,
      );

      // Falsifying input (tasks.md T-02 rework, Issue 1): replace the
      // interpolation at migrations/…:264 with a bare literal `5` — the
      // positive match above must redden (the enum's identifier text is no
      // longer there) AND this negative match must NOT be what saves it,
      // since a bare `5` also satisfies no accidental substring here.
      expect(emitting).not.toMatch(/link_result_role_id\s*=\s*5\b/);
    });
  });

  describe('append-only shape: this is a NEW file, ordered after both Migration A and 1787280000000', () => {
    it('the new migration class name and timestamp differ from both prior migrations, and the new timestamp sorts after them', () => {
      const priorMigration = new UpdateInnovationUseValidation1787280000000();
      const newMigration =
        new AppendInnovationDevLinkRuleToInnovationUseValidation1789100000000();
      expect(newMigration.name).not.toBe(priorMigration.name);

      const priorTs = Number(priorMigration.name.match(/(\d+)$/)![1]);
      const newTs = Number(newMigration.name.match(/(\d+)$/)![1]);
      expect(newTs).toBeGreaterThan(priorTs);

      // Must also sort after Migration A (1789000000000-
      // insertInnovationUseLinkedDevRole.ts), which seeds the catalog row
      // and the enum member this migration's rule 16 depends on.
      expect(newTs).toBeGreaterThan(1789000000000);
    });
  });
});
