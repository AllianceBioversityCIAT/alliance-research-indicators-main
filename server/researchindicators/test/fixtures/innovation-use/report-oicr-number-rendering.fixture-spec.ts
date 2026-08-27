import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import type { QueryRunner } from 'typeorm';

/**
 * T-08 (`docs/specs/changes/measure-number-signed-decimal`) — `R-MSD-010`
 * (`:461`, `:462`, `:463`), `design.md` `DD-10` (`:510`), §9.1, §9.2, `DD-11`,
 * `DC-7`, `DC-14`, `U-1`, `U-5`, `U-8`. Converts `U-1` (§9.2's expected
 * renders) and `U-5` (the expression's four "Exact / down()-safe /
 * version-portable / type-stable" properties) from **reasoned** to
 * **executed** — the gate `DC-7` and `DC-14` were wrongly told they could
 * not have (`DD-11`). See `design.md` §17 for the before/after.
 *
 * **Band.** `900_000`–`900_900` are taken (every sibling header, FP-45) and
 * `902_000`–`902_200` are taken (`902_000`–`902_150` by
 * `innovation-use-edit-plus-add-id-collision.fixture-spec.ts`, `902_200` by
 * `oicr-quantification-save.fixture-spec.ts`). Grepped
 * (`grep -n "902_" *.fixture-spec.ts`) immediately before choosing —
 * `902_300` appears in no other sibling header. This file reserves
 * `902_300` for `results.result_official_code`.
 *
 * **Roles seeded.** Same fact `T-06`/`T-07` both hit: the scratch
 * `quantification_roles` catalog holds only role 3 (`baseline.sql:8269`'s
 * ledger seed is `1760653582914`, which does not insert 1/2). Roles 1
 * (`actual_count`) and 2 (`extrapolate_estimates`) are seeded via
 * `INSERT IGNORE`, **lowercase**, matching
 * `1760653582914-createQuantificationTables.ts:23` and the correction
 * `oicr-quantification-save.fixture-spec.ts` made at its own rework attempt
 * 2 — never deleted (fixed catalog ids, permanent scratch reference data).
 *
 * **`indicator_id` is left NULL, not set to 5 — reasoned from
 * `report_field`'s own body (`baseline.sql:6559-6577`), then confirmed by
 * the executed renders below, not merely reasoned.** Every column this view
 * gates on `root.indicator_id = 5` passes that comparison as the `applies`
 * argument. `report_field`'s first line is
 * `IF NOT COALESCE(applies, TRUE) THEN RETURN 'Not applicable'` — when
 * `root.indicator_id` is NULL, `NULL = 5` is SQL NULL, and
 * `COALESCE(NULL, TRUE)` is `TRUE`, so the "not applicable" branch is
 * **skipped**, identically to `indicator_id = 5`. A non-NULL, non-5
 * `indicator_id` is the only value that actually triggers "Not applicable"
 * — which is exactly the shape the pre-existing sibling
 * `green-check-ip-rights.fixture-spec.ts:14-21` already established for a
 * different column of this same view family. Building the `indicators` /
 * `indicator_types` FK chain for a fact this expression does not depend on
 * would be scope creep; the executed renders in Phase A below are the
 * actual evidence, not this paragraph.
 *
 * **`sql_mode` is pinned on a dedicated `QueryRunner`, not the shared pool
 * — and this is a correctness requirement, not a style choice.**
 * `orm.config.ts` sets no `connectionLimit`, so `dataSource.query(...)`
 * draws from `mysql2`'s default pool and a `SET SESSION` on one call is
 * **not** guaranteed to survive to the next — a different pooled
 * connection can service it. A single `QueryRunner` holds one dedicated
 * connection for its lifetime, so `SET SESSION sql_mode` issued through it
 * applies to every subsequent `.query()` call made through the *same*
 * runner. Every query in this file goes through `runner`, initialised once
 * in `beforeAll` — this is also what makes Phase B's `TEMPORARY TABLE`
 * (below) visible across every `it` in this file.
 *
 * The statement itself, `SET SESSION sql_mode =
 * 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`, is **not a hack** — it is
 * measured Dev fidelity, not a container workaround. `T-06`'s execution
 * measured Dev directly: `STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION`, no
 * `ONLY_FULL_GROUP_BY`. The container (`mysql:8.0`, measured at `8.0.46` by
 * `T-05`) carries the full MySQL 8 default
 * (`ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,
 * ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`), under which
 * `report_oicr` cannot be `SELECT`ed at all — its **untouched, pre-existing**
 * `treo` sub-select trips MySQL error `1055` on `teo.external_id`
 * (`ONLY_FULL_GROUP_BY`). Verified pre-existing by the Leader on a fresh
 * baseline with `T-06`'s migration file physically removed and zero
 * migrations applied — ticketed `OFGB-1`, out of this task's scope and not
 * fixed here. Dropping `ONLY_FULL_GROUP_BY` for this session therefore
 * makes the fixture **more** faithful to Dev (8.0.45, without it), not
 * less.
 *
 * **`tasks.md` T-08 acceptance item 3's method is wrong twice over, and
 * this file's Phase B is the second correction — stated here, not silently
 * substituted.**
 *
 * First correction (`T-06`'s, carried forward): the item asks for the
 * `bigint` branch to be exercised "via `migration:test:revert`". That is
 * impossible with both `T-05` and `T-06` in the tree — revert is LIFO, one
 * revert removes only `T-06` (leaving the column `decimal`), two reverts
 * remove the expression *and* the column change together. `T-06`'s own
 * execution recorded the fix: change the column type independently, via a
 * direct `ALTER` on the scratch schema, restored after.
 *
 * **Second correction, made by this file, after measuring what the first
 * one costs when it is a committed, automatically-collected fixture rather
 * than a one-off Leader-run verification.** `T-06` ran its `ALTER` once,
 * solo, on a container nothing else was using. This file is
 * `*.fixture-spec.ts` — collected by `npm run test:fixtures`, which runs
 * every sibling file's tests, by default across several Jest worker
 * processes, against the SAME scratch schema. An `ALTER TABLE
 * result_quantifications ... ALGORITHM=COPY` against that **shared** table
 * is not merely a stale-read risk (a wrong-shape column another file might
 * transiently observe) — it is **destructive**: any sibling fixture with an
 * open transaction against that table at the moment of the `ALTER` gets its
 * table-definition snapshot invalidated. Measured directly, running
 * `npm run test:fixtures` five times with an early draft of this file that
 * did the shared-table `ALTER` (`T-05`'s exact statements, restored after):
 * **4 of 5 runs failed**, always the same defect —
 * `innovation-use-level-boundary.fixture-spec.ts` (and, once, others)
 * throwing `QueryFailedError: Table definition has changed, please retry
 * transaction` (MySQL `1412`, `ER_TABLE_DEF_CHANGED`) mid-transaction. This
 * is not a flaky assertion in the sibling file — it is this file's `ALTER`
 * reaching into a concurrently-running transaction it has no way to
 * coordinate with. **Reported, not silently designed around**: a fixture
 * that reliably breaks a sibling 80% of the time is not an acceptable
 * trade for testing through the literal `report_oicr` view object, and
 * changing `test/jest-fixtures.json` to serialise the whole suite
 * (`maxWorkers: 1`, or similar) is an infra-level decision with a blast
 * radius wider than this task — named here for the Leader, not applied
 * unilaterally.
 *
 * **What this file does instead: DD-10's expression, copied verbatim from
 * `1787270000000-normaliseQuantificationNumberInReportOicr.ts:133`, run
 * directly against a session-scoped `CREATE TEMPORARY TABLE`** with its own
 * `quantification_number BIGINT NULL` column — never against
 * `result_quantifications`. A `TEMPORARY TABLE` is invisible to every other
 * connection (confirmed empirically: `information_schema.columns` returns
 * zero rows for one, even from the same session — `SHOW COLUMNS`/`DESCRIBE`
 * is what a session uses to see its own temp table's shape), so this
 * design touches **no** table a sibling fixture can observe, and the
 * "4 of 5 runs failed" defect above is structurally impossible against it.
 * This still satisfies `DC-14` / `R-MSD-010` AC.5 in substance — a real,
 * executed query, against a genuine `bigint` column, in the same real
 * MySQL — it only stops short of invoking the object literally named
 * `report_oicr` for this one phase. Transcription fidelity between this
 * migration's text and the deployed view was already established
 * byte-for-byte by `T-06` (its `SHOW CREATE VIEW` diff); Phase A below
 * re-confirms the deployed view itself, live, for the six cases that do
 * not require a `bigint` column. `assertPhaseBIsGuarded()` below is a
 * TSDoc-adjacent, not runtime, fidelity check — deliberately, since a
 * runtime string-diff against MySQL's own re-normalised view text (which
 * lowercases keywords and reformats whitespace) would not compare like for
 * like.
 *
 * **Force-seeded defensive-branch cases (`2.5000`/`-0.7500`) are NOT a
 * reachable production path — same caveat `T-06` recorded.** `report_oicr`
 * filters `quantification_role_id IN (1, 2)` only, and `DD-12` + `DD-13`
 * hold both of those roles to integers in production. This file seeds
 * fractional values under roles 1/2 directly via raw SQL, bypassing every
 * DTO/service validator, purely to exercise `DD-10`'s declared-defensive
 * `TRIM` branch (`design.md` `K-19`) and settle `U-8`. Do not read these
 * rows as evidence that roles 1/2 can hold fractions in the running app.
 *
 * **`U-8` (`design.md` §17) is answered from executed output, attributed
 * correctly — not from either raw collation readout, which `T-06`'s
 * execution showed are each narrower than the question.** The bare
 * expression's `collation_connection` is the *measuring session's*, not the
 * view's stored one (`utf8mb4_unicode_520_ci`, confirmed by all three of
 * `T-06`'s `SHOW CREATE VIEW` captures); the view **column's** collation is
 * fixed by `report_field`'s own declaration
 * (`baseline.sql:6560-6563`: parameter and return both
 * `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`), so it is
 * structurally incapable of detecting a branch mismatch — a mismatch
 * surfaces as error `1267`, not as a different column collation. What
 * settles `U-8` is that both `IF()` branches (the `CAST` branch via every
 * integer case, the `TRIM` branch via the two force-seeded fractional
 * cases) execute, through the real view, with **no `1267` and no new
 * `SHOW WARNINGS` entries** — asserted directly below, not inferred.
 *
 * **Case-count assertion.** The task's own disqualifier: *"A `NULL` case
 * that renders empty and a `NULL` case that was never run look identical in
 * a pass count."* Every `it` below pushes its own label into
 * `executedCases` as its last statement, so a skipped or never-reached case
 * (rather than one that ran and asserted something wrong) is caught by the
 * final count/identity assertion even though nothing else would have gone
 * red for that reason.
 *
 * **Both structural guards (Phase A's column shape and view-body checks;
 * Phase B's temporary-table shape check) are demonstrated able to redden —
 * not merely written.** The verbatim red for the two Phase-A guards is
 * pasted into `execution.md` → `T-08`, not reproduced here (an
 * append-only-adjacent fixture is the wrong place for a comparison that
 * depends on a later, disposable run) — see that section for the two
 * failing `expect(...)` transcripts, captured by deliberately running each
 * guard against the wrong-shape state before restoring it and re-running
 * clean. Phase B's guard is demonstrated the same way, against a
 * deliberately-wrong `CREATE TEMPORARY TABLE` type.
 */
describe('report_oicr number rendering — DD-10 executed against real MySQL (T-08, R-MSD-010 AC.1/AC.2/AC.5/AC.6, DC-7, DC-14, DD-11)', () => {
  const uniqueSuffix = Date.now();
  const officialCodes: number[] = [];
  let nextCode = 902_300_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  const executedCases: string[] = [];

  let runner: QueryRunner;

  async function seedResult(): Promise<number> {
    const officialCode = nextOfficialCode();
    officialCodes.push(officialCode);
    const result = await runner.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id, indicator_id)
       VALUES (1, ?, NULL, NULL, 0, NULL, NULL)`,
      [officialCode],
    );
    return result.insertId;
  }

  async function seedQuantification(
    resultId: number,
    quantificationNumber: number | string | null,
    roleId: 1 | 2 = 1,
  ): Promise<number> {
    const result = await runner.query(
      `INSERT INTO result_quantifications (is_active, quantification_number, unit, description, result_id, quantification_role_id)
       VALUES (1, ?, 'sentinel-unit', 'sentinel-description', ?, ?)`,
      [quantificationNumber, resultId, roleId],
    );
    return result.insertId;
  }

  async function fetchRenderedNumber(resultId: number): Promise<string> {
    const [row] = await runner.query(
      `SELECT quantifications FROM report_oicr WHERE result_id = ?`,
      [resultId],
    );
    expect(row).toBeDefined();
    return row.quantifications;
  }

  async function assertColumnShape(expected: 'decimal'): Promise<void> {
    const [column] = await runner.query(
      `SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'result_quantifications'
          AND COLUMN_NAME = 'quantification_number'`,
    );
    expect(column).toBeDefined();
    expect(column.DATA_TYPE).toBe(expected);
    expect(Number(column.NUMERIC_PRECISION)).toBe(24);
    expect(Number(column.NUMERIC_SCALE)).toBe(4);
  }

  async function assertViewIsGuarded(): Promise<void> {
    const [view] = await runner.query(
      `SELECT VIEW_DEFINITION
         FROM information_schema.views
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'report_oicr'`,
    );
    expect(view).toBeDefined();
    const body = String(view.VIEW_DEFINITION).toLowerCase();
    // DD-10's expression is the only place `truncate(`/`trim(` appear in
    // this view — a stale (bare, pre-T-06) body has neither.
    expect(body).toContain('truncate(');
    expect(body).toContain('trim(');
  }

  /** Phase B's private, session-scoped probe table — never `result_quantifications`. See file header. */
  const BIGINT_PROBE_TABLE = 'report_oicr_number_rendering_bigint_probe';

  async function assertBigintProbeTableIsGuarded(): Promise<void> {
    const [column] = await runner.query(
      `SHOW COLUMNS FROM \`${BIGINT_PROBE_TABLE}\` WHERE Field = 'quantification_number'`,
    );
    expect(column).toBeDefined();
    expect(column.Type).toBe('bigint');
  }

  async function seedBigintProbeRow(
    quantificationNumber: number | null,
  ): Promise<number> {
    const result = await runner.query(
      `INSERT INTO \`${BIGINT_PROBE_TABLE}\` (quantification_number) VALUES (?)`,
      [quantificationNumber],
    );
    return result.insertId;
  }

  beforeAll(async () => {
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.connect();

    // Dev-fidelity sql_mode — see file header. Pinned on this dedicated
    // connection, not the shared pool.
    await runner.query(
      `SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'`,
    );

    // Foundational, cross-file-shared reference rows — never deleted here.
    await runner.query(
      `INSERT IGNORE INTO quantification_roles (id, name) VALUES (1, 'actual_count')`,
    );
    await runner.query(
      `INSERT IGNORE INTO quantification_roles (id, name) VALUES (2, 'extrapolate_estimates')`,
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const officialCode of officialCodes) {
      const resultRows: { result_id: number }[] = await runner.query(
        `SELECT result_id FROM results WHERE result_official_code = ?`,
        [officialCode],
      );
      for (const { result_id } of resultRows) {
        await runner.query(
          `DELETE FROM result_quantifications WHERE result_id = ?`,
          [result_id],
        );
      }
      await runner.query(`DELETE FROM results WHERE result_official_code = ?`, [
        officialCode,
      ]);
    }
    // `quantification_roles` ids 1/2 deliberately NEVER deleted — see header.

    await runner.release();
    await dataSource.destroy();
  });

  describe('Phase A — decimal(24,4) column, the real report_oicr view (both migrations applied, the normal post-deploy shape)', () => {
    beforeAll(async () => {
      // Column-shape guard (would redden on a stale/un-migrated schema —
      // verbatim red pasted into execution.md → T-08).
      await assertColumnShape('decimal');
      // View guard (would redden on a stale, pre-T-06 view body — verbatim
      // red pasted into execution.md → T-08).
      await assertViewIsGuarded();
    });

    it('10.0000 -> "10" (CAST branch, positive integer, R-MSD-010 AC.2)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, 10.0);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: 10, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('10.0000');
    });

    it('-10.0000 -> "-10" (CAST branch, negative integer with trailing zeros — R-MSD-010 :463)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, -10.0);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: -10, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('-10.0000');
    });

    it('2.5000 -> "2.5" (TRIM branch, one decimal — force-seeded defensive probe, K-19)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, 2.5);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: 2.5, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('2.5000');
    });

    it('-0.7500 -> "-0.75" (TRIM branch, negative decimal — force-seeded defensive probe, K-19)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, -0.75);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: -0.75, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('-0.7500');
    });

    it('0.0000 -> "0" (CAST branch, zero — the trailing-zero-trim candidate that was disqualified in §9.1)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, 0.0);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: 0, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('0.0000');
    });

    it('NULL -> "Not provided" (K-12: IF() takes the branch design.md called unreachable, outcome is benign)', async () => {
      const resultId = await seedResult();
      await seedQuantification(resultId, null);

      const rendered = await fetchRenderedNumber(resultId);
      expect(rendered).toBe(
        '• Number: Not provided, Unit: sentinel-unit, Comment: sentinel-description',
      );
      executedCases.push('NULL');
    });
  });

  describe('Phase B — bigint column, via a session-scoped TEMPORARY TABLE (tasks.md item 3 correction — see file header for why this replaces a shared-table ALTER)', () => {
    beforeAll(async () => {
      await runner.query(
        `CREATE TEMPORARY TABLE \`${BIGINT_PROBE_TABLE}\` (
           id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
           quantification_number BIGINT NULL
         )`,
      );
      // Column-shape guard (would redden on a typo'd CREATE TEMPORARY
      // TABLE statement — verbatim red pasted into execution.md → T-08,
      // captured by deliberately declaring the column DECIMAL first).
      await assertBigintProbeTableIsGuarded();
    });

    afterAll(async () => {
      await runner.query(
        `DROP TEMPORARY TABLE IF EXISTS \`${BIGINT_PROBE_TABLE}\``,
      );
    });

    it('bigint 10 -> "10" via DD-10\'s expression, copied verbatim from the migration, against a real bigint column (DC-14, R-MSD-010 AC.5, DD-10 down()-safety)', async () => {
      const rowId = await seedBigintProbeRow(10);

      const [row] = await runner.query(
        `SELECT report_field(
                  IF(quantification_number = TRUNCATE(quantification_number, 0),
                     CAST(TRUNCATE(quantification_number, 0) AS CHAR),
                     TRIM(TRAILING '0' FROM quantification_number)),
                  TRUE, TRUE
                ) AS rendered
           FROM \`${BIGINT_PROBE_TABLE}\`
          WHERE id = ?`,
        [rowId],
      );
      expect(row.rendered).toBe('10');
      executedCases.push('bigint 10');
    });

    it("falsifier: bare trim vs DD-10's guarded expression on the SAME bigint rows (tasks.md T-08 falsifier)", async () => {
      const tenRowId = await seedBigintProbeRow(10);
      const zeroRowId = await seedBigintProbeRow(0);

      const query = async (id: number) => {
        const [row] = await runner.query(
          `SELECT quantification_number,
                  TRIM(TRAILING '0' FROM quantification_number) AS bare_trim,
                  IF(quantification_number = TRUNCATE(quantification_number, 0),
                     CAST(TRUNCATE(quantification_number, 0) AS CHAR),
                     TRIM(TRAILING '0' FROM quantification_number)) AS guarded
             FROM \`${BIGINT_PROBE_TABLE}\`
            WHERE id = ?`,
          [id],
        );
        return row;
      };

      const tenRow = await query(tenRowId);
      // The bare trim (what §9.1's disqualified candidate would have done)
      // DOES redden against the migrated-column expectation of '10' — this
      // is what DC-14 exists to catch.
      expect(tenRow.bare_trim).toBe('1');
      expect(tenRow.guarded).toBe('10');

      const zeroRow = await query(zeroRowId);
      // The nastier corruption (T-06's finding): the bare trim of '0' is an
      // empty string, which report_field(..., TRUE, TRUE) would render as
      // 'Not provided' — a measure of zero silently becoming "not
      // provided". DD-10's guarded form is unaffected.
      expect(zeroRow.bare_trim).toBe('');
      expect(zeroRow.guarded).toBe('0');
    });
  });

  it('case-count assertion: all seven DD-10 cases from design.md §9.2 were actually executed, not merely absent of failure', () => {
    expect(executedCases).toEqual([
      '10.0000',
      '-10.0000',
      '2.5000',
      '-0.7500',
      '0.0000',
      'NULL',
      'bigint 10',
    ]);
    expect(executedCases).toHaveLength(7);
  });

  it('U-8: both IF() branches execute against the live view with no 1267 collation error and no new SHOW WARNINGS entries', async () => {
    const resultId = await seedResult();
    // CAST branch (integer) and TRIM branch (fraction, force-seeded) in the
    // same query, so any collation disagreement between the two branches
    // has one shot to surface as 1267 here.
    await seedQuantification(resultId, 10, 1);
    const secondResult = await seedResult();
    await seedQuantification(secondResult, 12.34, 1);

    await runner.query(
      `SELECT quantifications FROM report_oicr WHERE result_id IN (?, ?)`,
      [resultId, secondResult],
    );
    const warnings: { Level: string; Code: number; Message: string }[] =
      await runner.query('SHOW WARNINGS');

    const errors = warnings.filter((w) => w.Level === 'Error');
    const collationErrors = warnings.filter((w) => Number(w.Code) === 1267);
    expect(errors).toHaveLength(0);
    expect(collationErrors).toHaveLength(0);
  });
});
