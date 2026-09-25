import { DataSource } from 'typeorm';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { ResultQuantificationsService } from '../../../src/domain/entities/result-quantifications/result-quantifications.service';
import { QuantificationRolesEnum } from '../../../src/domain/entities/quantification-roles/enum/quantification-roles.enum';
import { CurrentUserUtil } from '../../../src/domain/shared/utils/current-user.util';
import { StubCurrentUserUtil } from './nest-harness';

/**
 * T-07 (`docs/specs/changes/measure-number-signed-decimal`) — `R-MSD-013`
 * AC.4 (row identity, asserted separately on the OICR path), AC.2's
 * `created_at` half (rework attempt 2 — see below), `DC-16` (silent row
 * replacement), `design.md` §5.3, `DD-2`, `DD-13`.
 *
 * **Scope, stated precisely.** This exercises `ResultQuantificationsService
 * .upsertByCompositeKeys` directly — the exact method + composite key
 * (`['quantification_number','unit','description']`) `ResultOicrService
 * .updateOicr` calls for `actual_count` (role 1) and `extrapolate_estimates`
 * (role 2) (`result-oicr.service.ts:234-246`) — rather than booting the
 * full `ResultOicrService` graph. `design.md` §4 frames the validation this
 * spec adds as living "below this endpoint and below the Innovation Use
 * one, on the path both traverse" (`DD-13`); this file is that shared path,
 * addressed directly, which is also the mechanism `RK-13`/transactionality
 * concerns attach to and are explicitly NOT this task's to fix. No file
 * under `result-oicr/` is touched or required to make this assertion.
 *
 * **Band:** `900_000`-`900_900` are taken (read from every sibling
 * `*.fixture-spec.ts` header — FP-45/KZ-002) and `902_000`-`902_150` are
 * taken by `innovation-use-edit-plus-add-id-collision.fixture-spec.ts`
 * (`902_000` top band, `902_1xx` sentinel counts through `902_150`).
 * `902_200` is free — grepped across every sibling header immediately
 * before choosing it. This file reserves `902_200` for
 * `results.result_official_code`.
 *
 * **Seeding discipline (FP-48).** This is a row-identity / reconciliation
 * fixture — the property under test is whether `upsertByCompositeKeys`'s
 * `String(value)` composite key stays stable across a resave, exactly the
 * "routine copy-path" shape FP-48 describes (not a `= TRUE` validation
 * predicate) — so every sentinel is a maximally distinct literal, no two
 * columns sharing a number, so a positional mix-up would be visible rather
 * than silently passing on a repeated value.
 *
 * **Roles seeded.** The scratch schema's `quantification_roles` catalog
 * holds only role 3 (`innovation_use`) — `baseline.sql:8269`'s ledger seed
 * (`1760653582914`) is what inserts it, and the migration that would seed
 * roles 1/2 is not in that ledger (confirmed at `T-06`'s execution, which
 * left this exact forward pointer for `T-07`/`T-08`). Roles 1
 * (`actual_count`) and 2 (`extrapolate_estimates`) are seeded here via
 * `INSERT IGNORE` (idempotent) and are NEVER deleted in `afterAll` — they
 * are fixed catalog ids, treated as permanent scratch-schema reference
 * data, the same role this file's sibling fixtures give `STAR` /
 * `result_status` id 8. **Corrected, rework attempt 2 (both lenses):**
 * the names are lowercase, matching production's migration
 * (`1760653582914-createQuantificationTables.ts:23`) and the prior seed
 * in `innovation-use-role-isolation.fixture-spec.ts:302` — this file
 * previously seeded uppercase `ACTUAL_COUNT`/`EXTRAPOLATE_ESTIMATES`,
 * which was false on the `name` column, and being non-deterministic
 * (both files' `INSERT IGNORE` race under Jest's parallel workers with
 * no delete on either side — whichever worker's insert wins silently
 * decides the stored `name`) is corrected here rather than merely noted,
 * even though nothing in `src/` or `test/` reads `quantification_roles
 * .name` today.
 *
 * **`ResultQuantificationsService` needs no Nest `TestingModule`.** Its
 * constructor takes only `DataSource` and `CurrentUserUtil`
 * (`result-quantifications.service.ts:29-40`) — neither is `REQUEST`-scoped
 * in a way that matters for a directly-`new`'d instance, so this file
 * constructs it directly against the same initialized TEST `DataSource`
 * every sibling fixture already queries raw SQL through, reusing
 * `./nest-harness`'s `StubCurrentUserUtil`.
 *
 * **`R-MSD-013` AC.2, split (rework attempt 2).** `created_at` is
 * satisfiable and now asserted, per role, via raw SQL before/after the
 * untouched resave — it is a `@CreateDateColumn` in no `audit()` payload,
 * so TypeORM never writes it on update; capturing it directly is the only
 * route (`select: false`, same as `created_by`/`updated_by`).
 * `created_by` is NOT asserted here and this file does NOT change
 * `base-service.ts` to make it assertable: `base-service.ts:440-446`
 * applies `...audit(SetAuditEnum.BOTH)` via `.map()` to every row in
 * `finalDataToSave`, including the reused branch, and `current-user.util
 * .ts:57-59` shows `BOTH` returns `{ created_by, updated_by }` — so
 * today's code overwrites `created_by` on every save, unmodified or not,
 * and asserting immutability against that code would assert something
 * false. That half of AC.2 is a real product defect, tracked separately
 * for a ticket, not fixed in this task.
 *
 * **`L-08` is EXPECTED here, not a defect this file fixes.**
 * `oicr-details.component.ts:275` and `:280` send `quantification_number:
 * q.number ?? 0` — so a `NULL`-valued row's "unmodified" resave actually
 * resends `0`, a genuinely different value from the client's own read.
 * `base-service.ts`'s `isEmpty` treats `null` as empty (contributing `''`
 * to the composite key) and `0` as NOT empty (contributing `'0'`) — so the
 * composite key changes and the row churns, correctly, given what the
 * client actually sent. This file asserts that churn as EXPECTED, with a
 * comment naming `L-08`, and does not fix the client. **Consequence,
 * rework attempt 2:** this test hard-codes `readBack.quantification_number
 * ?? 0` itself rather than calling the client, so fixing `L-08` in
 * `oicr-details.component.ts` does NOT redden it — it keeps passing
 * forever. When `L-08` is fixed this test does not fail — it becomes a
 * pin on `upsertByCompositeKeys`'s null-vs-0 key semantics; retitle it
 * then, do not restore `?? 0` in the client.
 *
 * **Schema guard (rework attempt 2, disqualifier check).** This file's
 * sentinels are integers, which hydrate to the identical JS `number` from
 * a pre-migration `bigint` column and a post-migration `DECIMAL(24,4)`
 * column alike — so a run against a scratch schema that was bootstrapped
 * but never migrated would report green while discharging `R-MSD-013`
 * AC.4 / `DC-16` on the wrong column shape. `beforeAll` asserts
 * `information_schema.columns` shows `decimal(24,4)` before any `it` runs.
 */
describe('OICR quantification save — row identity through the real upsertByCompositeKeys (T-07, R-MSD-013 AC.2 created_at half/AC.4, DC-16)', () => {
  const uniqueSuffix = Date.now();
  const actingUserId = 902_200_000;

  let service: ResultQuantificationsService;

  const officialCodes: number[] = [];
  let nextCode = 902_200_000_000_000 + uniqueSuffix;
  function nextOfficialCode(): number {
    return nextCode++;
  }

  async function seedResult(): Promise<number> {
    const officialCode = nextOfficialCode();
    officialCodes.push(officialCode);
    const result = await dataSource.query(
      `INSERT INTO results (is_active, result_official_code, platform_code, report_year_id, is_snapshot, result_status_id)
       VALUES (1, ?, NULL, NULL, 0, NULL)`,
      [officialCode],
    );
    return result.insertId;
  }

  beforeAll(async () => {
    await dataSource.initialize();

    const currentUser = new StubCurrentUserUtil(actingUserId);
    service = new ResultQuantificationsService(
      dataSource as DataSource,
      currentUser as unknown as CurrentUserUtil,
    );

    // Foundational, cross-file-shared reference rows — see file header.
    // Never deleted by this file.
    await dataSource.query(
      `INSERT IGNORE INTO quantification_roles (id, name) VALUES (1, 'actual_count')`,
    );
    await dataSource.query(
      `INSERT IGNORE INTO quantification_roles (id, name) VALUES (2, 'extrapolate_estimates')`,
    );

    // Schema guard (T-07 rework, disqualifier check). This file's
    // sentinels (`87_654`, `13_579`, `null`, `0`) are all integers, and an
    // integer hydrates to the SAME JS `number` whether the column is the
    // pre-migration `bigint` or the post-migration `DECIMAL(24,4)` (`DD-2`)
    // — so every `it` below would report identically green against a
    // scratch schema that was bootstrapped but never migrated, silently
    // discharging `R-MSD-013` AC.4 / `DC-16` on the column shape the
    // requirement is NOT about. Roles 1/2 cannot use a fractional sentinel
    // instead (`DD-13`'s default rule would `400` it), so this guard is
    // the only available substitute. Asserted in `beforeAll`, before any
    // `it` runs, so a stale schema fails fast and unambiguously rather
    // than passing for the wrong reason.
    const [quantificationNumberColumn] = await dataSource.query(
      `SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
         FROM information_schema.columns
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'result_quantifications'
          AND COLUMN_NAME = 'quantification_number'`,
    );
    expect(quantificationNumberColumn).toBeDefined();
    expect(quantificationNumberColumn.DATA_TYPE).toBe('decimal');
    expect(Number(quantificationNumberColumn.NUMERIC_PRECISION)).toBe(24);
    expect(Number(quantificationNumberColumn.NUMERIC_SCALE)).toBe(4);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) {
      return;
    }

    for (const officialCode of officialCodes) {
      const resultRows: { result_id: number }[] = await dataSource.query(
        `SELECT result_id FROM results WHERE result_official_code = ?`,
        [officialCode],
      );
      for (const { result_id } of resultRows) {
        await dataSource.query(
          `DELETE FROM result_quantifications WHERE result_id = ?`,
          [result_id],
        );
      }
      await dataSource.query(
        `DELETE FROM results WHERE result_official_code = ?`,
        [officialCode],
      );
    }
    // `quantification_roles` ids 1/2 are deliberately NEVER deleted here —
    // see file header.

    await dataSource.destroy();
  });

  it('role 1 (ACTUAL_COUNT): an unmodified save, seeded from a real read, leaves the primary key and created_at unchanged and deactivates nothing (R-MSD-013 AC.1/AC.2/AC.3/AC.4)', async () => {
    const resultId = await seedResult();

    await service.upsertByCompositeKeys(
      resultId,
      [
        {
          quantification_number: 87_654,
          unit: 'sentinel-unit-oicr-actual',
          description: 'sentinel-description-oicr-actual',
        },
      ],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.ACTUAL_COUNT,
    );

    // `created_at` via raw SQL (R-MSD-013 AC.2) — it is a
    // `@CreateDateColumn` in no `audit()` payload, so it never surfaces
    // through the repository the way `created_by`/`updated_by` don't.
    const [before] = await dataSource.query(
      `SELECT id, created_at FROM result_quantifications WHERE result_id = ? AND is_active = 1`,
      [resultId],
    );
    expect(before).toBeDefined();

    // Real read (K-012, DD-19) — through the actual repository and DD-2's
    // `from` transformer, never a hand-written literal.
    const [readBack] = await service.findByResultIdAndRoles(resultId, [
      QuantificationRolesEnum.ACTUAL_COUNT,
    ]);
    expect(readBack).toBeDefined();
    expect(readBack.quantification_number).toBe(87_654);
    expect(typeof readBack.quantification_number).toBe('number');

    // Resend EXACTLY what the real read produced — nothing else touched.
    await expect(
      service.upsertByCompositeKeys(
        resultId,
        [
          {
            quantification_number: readBack.quantification_number,
            unit: readBack.unit,
            description: readBack.description,
          },
        ],
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.ACTUAL_COUNT,
      ),
    ).resolves.toBeDefined();

    const after = await dataSource.query(
      `SELECT id, is_active, created_at FROM result_quantifications WHERE result_id = ?`,
      [resultId],
    );
    // Not toHaveLength(1) against the WHOLE table (J-20) — scoped to this
    // file's own resultId, which legitimately holds exactly one row.
    expect(after).toHaveLength(1);
    expect(Number(after[0].id)).toBe(Number(before.id)); // AC.1 — same PK
    expect(Number(after[0].is_active)).toBe(1); // AC.3 — not deactivated
    // AC.2 — created_at unchanged by the untouched resave.
    expect(new Date(after[0].created_at).getTime()).toBe(
      new Date(before.created_at).getTime(),
    );
  }, 30000);

  it('role 2 (EXTRAPOLATE_ESTIMATES): an unmodified save, seeded from a real read, leaves the primary key and created_at unchanged and deactivates nothing (R-MSD-013 AC.1/AC.2/AC.3/AC.4, asserted separately from role 1)', async () => {
    const resultId = await seedResult();

    await service.upsertByCompositeKeys(
      resultId,
      [
        {
          quantification_number: 13_579,
          unit: 'sentinel-unit-oicr-extrapolate',
          description: 'sentinel-description-oicr-extrapolate',
        },
      ],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
    );

    const [before] = await dataSource.query(
      `SELECT id, created_at FROM result_quantifications WHERE result_id = ? AND is_active = 1`,
      [resultId],
    );
    expect(before).toBeDefined();

    const [readBack] = await service.findByResultIdAndRoles(resultId, [
      QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
    ]);
    expect(readBack).toBeDefined();
    expect(readBack.quantification_number).toBe(13_579);
    expect(typeof readBack.quantification_number).toBe('number');

    await expect(
      service.upsertByCompositeKeys(
        resultId,
        [
          {
            quantification_number: readBack.quantification_number,
            unit: readBack.unit,
            description: readBack.description,
          },
        ],
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.EXTRAPOLATE_ESTIMATES,
      ),
    ).resolves.toBeDefined();

    const after = await dataSource.query(
      `SELECT id, is_active, created_at FROM result_quantifications WHERE result_id = ?`,
      [resultId],
    );
    expect(after).toHaveLength(1);
    expect(Number(after[0].id)).toBe(Number(before.id));
    expect(Number(after[0].is_active)).toBe(1);
    // AC.2 — created_at unchanged by the untouched resave.
    expect(new Date(after[0].created_at).getTime()).toBe(
      new Date(before.created_at).getTime(),
    );
  }, 30000);

  it('a NULL-valued OICR row churns on an unmodified-looking save because the client resends 0 for null — EXPECTED, L-08, pre-existing client defect, not fixed here', async () => {
    const resultId = await seedResult();

    await service.upsertByCompositeKeys(
      resultId,
      [
        {
          quantification_number: null,
          unit: 'sentinel-unit-oicr-null',
          description: 'sentinel-description-oicr-null',
        },
      ],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.ACTUAL_COUNT,
    );

    const [originalRow] = await dataSource.query(
      `SELECT id FROM result_quantifications WHERE result_id = ? AND is_active = 1`,
      [resultId],
    );
    expect(originalRow).toBeDefined();

    // Real read, both directions: raw SQL confirms the `to` direction
    // stored SQL NULL (not 0); the service read confirms the `from`
    // direction hydrates it as JS `null` (not 0, not NaN) — DD-2, asserted
    // separately per direction.
    const [nullRaw] = await dataSource.query(
      `SELECT quantification_number FROM result_quantifications WHERE id = ?`,
      [originalRow.id],
    );
    expect(nullRaw.quantification_number).toBeNull();

    const [readBack] = await service.findByResultIdAndRoles(resultId, [
      QuantificationRolesEnum.ACTUAL_COUNT,
    ]);
    expect(readBack.quantification_number).toBeNull();

    // Reproduces `oicr-details.component.ts:275`/`:280`'s `q.number ?? 0`
    // verbatim — this is what the REAL client sends given a real read of
    // `null`, not this fixture's own invented literal. `L-08`: a
    // pre-existing client coercion defect this spec reports and does NOT
    // fix. The `?? 0` is hard-coded HERE, not read from the client, so
    // fixing `L-08` in the component does not redden this test — it keeps
    // passing forever, and becomes a pin on `upsertByCompositeKeys`'s
    // null-vs-0 key semantics instead; retitle it then, do not restore
    // `?? 0` in the client.
    await service.upsertByCompositeKeys(
      resultId,
      [
        {
          quantification_number: readBack.quantification_number ?? 0,
          unit: readBack.unit,
          description: readBack.description,
        },
      ],
      ['quantification_number', 'unit', 'description'],
      QuantificationRolesEnum.ACTUAL_COUNT,
    );

    const rowsAfter = await dataSource.query(
      `SELECT id, quantification_number, is_active FROM result_quantifications WHERE result_id = ? ORDER BY id`,
      [resultId],
    );
    // EXPECTED churn (L-08): `isEmpty(null)` is `true` (contributes `''`
    // to the composite key) and `isEmpty(0)` is `false` (contributes
    // `'0'`) — `object.utils.ts`'s `isEmpty` — so the composite key
    // genuinely differs and `upsertByCompositeKeys` deactivates the
    // original row and inserts a new one. This is correct behavior given
    // what the client actually sent (0 is not null); the defect is the
    // client sending it, not this reconciliation.
    expect(rowsAfter).toHaveLength(2);
    const original = rowsAfter.find(
      (r: any) => Number(r.id) === Number(originalRow.id),
    );
    const churned = rowsAfter.find(
      (r: any) => Number(r.id) !== Number(originalRow.id),
    );
    expect(original).toBeDefined();
    expect(Number(original.is_active)).toBe(0); // deactivated — L-08
    expect(churned).toBeDefined();
    expect(Number(churned.is_active)).toBe(1);
    expect(Number(churned.quantification_number)).toBe(0);
  }, 30000);
});
