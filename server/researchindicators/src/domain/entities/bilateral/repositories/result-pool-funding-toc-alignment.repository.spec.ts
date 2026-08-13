import { DataSource, EntityManager } from 'typeorm';
import { ResultPoolFundingTocAlignment } from '../entities/result-pool-funding-toc-alignment.entity';
import {
  ResultPoolFundingTocAlignmentRepository,
  TocAlignmentUpsertInput,
} from './result-pool-funding-toc-alignment.repository';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-05 / R-BIL-092, R-BIL-095

describe('ResultPoolFundingTocAlignmentRepository', () => {
  let repository: ResultPoolFundingTocAlignmentRepository;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  const baseInput: TocAlignmentUpsertInput = {
    result_id: 101,
    sp_code: 'SP01',
    aligns_with_toc: true,
    level: 'OUTPUT',
    toc_result_id: 7,
    indicator_id: 12,
    quantitative_contribution: 3.5,
    toc_result_title: 'ToC result title',
    indicator_description: 'Indicator description',
    unit_messurament: 'Number',
    target_value: '40',
    target_year: 2026,
  };

  beforeEach(() => {
    repository = new ResultPoolFundingTocAlignmentRepository(dataSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findActiveByResultId', () => {
    it('filters by result + is_active and orders by sp_code', async () => {
      const rows = [
        { id: 1, sp_code: 'SP01' },
      ] as ResultPoolFundingTocAlignment[];
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue(rows);

      await expect(repository.findActiveByResultId(101)).resolves.toBe(rows);

      expect(findSpy).toHaveBeenCalledWith({
        where: { result_id: 101, is_active: true },
        order: { sp_code: 'ASC' },
      });
    });
  });

  describe('upsertForSp', () => {
    it('inserts a new row when no active row exists for (result, sp)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(repository, 'create')
        .mockImplementation(
          (entity) => entity as ResultPoolFundingTocAlignment,
        );
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockImplementation(async (entity) => ({ id: 9, ...entity }) as any);
      const updateSpy = jest.spyOn(repository, 'update');

      const saved = await repository.upsertForSp(baseInput, 555);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 101,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 7,
          indicator_id: 12,
          quantitative_contribution: 3.5,
          toc_result_title: 'ToC result title',
          indicator_description: 'Indicator description',
          unit_messurament: 'Number',
          target_value: '40',
          target_year: 2026,
          created_by: 555,
          updated_by: 555,
        }),
      );
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saved.id).toBe(9);
    });

    it('updates the active row in place — never inserts a second active row', async () => {
      const existing = { id: 4 } as ResultPoolFundingTocAlignment;
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          aligns_with_toc: false,
        } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP01', aligns_with_toc: false },
        555,
      );

      expect(findOneSpy).toHaveBeenNthCalledWith(1, {
        where: { result_id: 101, sp_code: 'SP01', is_active: true },
      });
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        expect.objectContaining({
          aligns_with_toc: false,
          updated_by: 555,
        }),
      );
      expect(saveSpy).not.toHaveBeenCalled();
      expect(result.aligns_with_toc).toBe(false);
    });

    // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-08 / R-BIL-092 AC.3
    it('re-submitting the same SP with a DIFFERENT indicator updates the single active row in place with the new snapshots — no second active row', async () => {
      const existing = {
        id: 4,
        indicator_id: 12,
      } as ResultPoolFundingTocAlignment;
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          indicator_id: 6001,
        } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      const saveSpy = jest.spyOn(repository, 'save');
      const createSpy = jest.spyOn(repository, 'create');

      const result = await repository.upsertForSp(
        {
          ...baseInput,
          indicator_id: 6001,
          indicator_description: 'Replacement indicator description',
          target_value: '4',
        },
        555,
      );

      // Same row id, new indicator + snapshots — never a new insert.
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        expect.objectContaining({
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 7,
          indicator_id: 6001,
          indicator_description: 'Replacement indicator description',
          target_value: '4',
          updated_by: 555,
        }),
      );
      expect(saveSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
      expect(result.id).toBe(4);
      expect(result.indicator_id).toBe(6001);
    });

    it('nulls every ToC/snapshot column when the input omits them ("No" answer)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        id: 4,
      } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP01', aligns_with_toc: false },
        555,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        {
          aligns_with_toc: false,
          level: null,
          toc_result_id: null,
          indicator_id: null,
          quantitative_contribution: null,
          toc_result_title: null,
          indicator_description: null,
          unit_messurament: null,
          target_value: null,
          target_year: null,
          updated_by: 555,
        },
      );
    });

    it('uses the provided EntityManager repository inside an outer transaction', async () => {
      const txRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((entity) => entity),
        save: jest
          .fn()
          .mockImplementation(async (entity) => ({ id: 1, ...entity })),
        update: jest.fn(),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(txRepo),
      } as unknown as EntityManager;
      const ownFindOneSpy = jest.spyOn(repository, 'findOne');
      const ownSaveSpy = jest.spyOn(repository, 'save');

      await repository.upsertForSp(baseInput, 555, manager);

      expect(manager.getRepository).toHaveBeenCalledWith(
        ResultPoolFundingTocAlignment,
      );
      expect(txRepo.findOne).toHaveBeenCalled();
      expect(txRepo.save).toHaveBeenCalledTimes(1);
      expect(ownFindOneSpy).not.toHaveBeenCalled();
      expect(ownSaveSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Regression net (AC-1676, T-01) — per-SP isolation + partial-unique
  // active-row constraint (R-BIL-118). Both properties already hold on
  // unmodified code; this block pins them BEFORE the T-03/T-04 partial-ToC
  // relaxation lands. Unlike the mock-based tests above (which only assert
  // *which* repository methods were called), these use a small in-memory
  // fake store that actually applies `findOne`/`update`/`create`/`save`
  // against stored rows the way the real TypeORM repository would — so a
  // weakened `WHERE` scope in `upsertForSp` makes the assertions fail, not
  // just go unnoticed. This block proves the application half of AC.2 only:
  // `upsertForSp` never issues a second insert for an already-active
  // (result, sp) pair, so the DB partial-unique index is never reached by
  // application traffic. The DB-enforced half — the
  // `idx_rpfta_active_result_sp` partial-unique index on the generated
  // `active_result_sp` column (migration 1779190000015), which enforces
  // independently and which `upsertForSp` relies on as a backstop, not the
  // reverse — is discharged structurally: this task changes no DDL, and
  // design.md §4 / requirements.md §5 record that column and index as
  // unchanged.
  //
  // T-12 (AC-1676 primary-contributing-sp) added the reverse-direction AC.1
  // test and both AC.3 tests below. R-BIL-118 AC.1/AC.3 (one SP's ToC
  // alignment must not overwrite another's) can no longer be demonstrated
  // through the service PATCH path: T-07 made that path refuse a payload
  // carrying two SPs' ToC entries (`toc_alignment_not_primary_sp`), so the
  // guarantee is proven here instead, where `upsertForSp` is called
  // directly per-SP and multi-SP state can be seeded without going through
  // that gate. A single-SP fixture cannot show isolation — it would pass
  // under an implementation with no isolation at all — so every isolation
  // test below seeds two SPs and asserts the untouched one is unchanged
  // field-by-field, in both directions.
  //
  // Note on R-BIL-118 AC.2: its structural discharge (see requirements.md
  // §"R-BIL-118" and design.md §11 item 3) is NOT re-opened or re-proven
  // here. That discharge's lapse condition is keyed to the
  // `result_pool_funding_toc_alignment` table's `active_result_sp` column
  // and `idx_rpfta_active_result_sp` index. This spec's migration target is
  // `result_pool_funding_alignment_sp` — a different table — so the lapse
  // condition is not tripped and the discharge still holds.
  //
  // @sdd-spec docs/specs/bilateral/toc-optional-mapping — T-01 / R-BIL-118
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-12 / R-BIL-118 AC.1, AC.3
  // ---------------------------------------------------------------------------
  describe('per-SP isolation + partial-unique active row (R-BIL-118)', () => {
    // Generic WHERE matcher mimicking a real UPDATE/SELECT — every key in
    // `criteria` must equal the row's value. Deliberately NOT hard-coded to
    // `id` so a mutant that widens the update criteria (e.g. dropping the
    // `id` scope down to `result_id` only) is caught by these tests.
    const matches = (
      row: Record<string, unknown>,
      criteria: Record<string, unknown>,
    ) => Object.entries(criteria).every(([key, value]) => row[key] === value);

    it('R-BIL-118 AC.1 — writing SP01 leaves SP02 row byte-identical', async () => {
      const sp01Row = {
        id: 1,
        result_id: 101,
        sp_code: 'SP01',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: 'sp01 title',
        indicator_description: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
      };
      const sp02Row = {
        id: 2,
        result_id: 101,
        sp_code: 'SP02',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTCOME',
        toc_result_id: 9,
        indicator_id: 77,
        quantitative_contribution: 4.2,
        toc_result_title: 'sp02 title',
        indicator_description: 'sp02 description',
        unit_messurament: 'Number',
        target_value: '10',
        target_year: 2026,
      };
      const sp02Snapshot = { ...sp02Row };
      // Untouched row (SP02) listed FIRST — see T-12 note (matches at the
      // top of this describe block): with the target row first, `findOne`
      // would locate the right row by array-position coincidence even if
      // `upsertForSp` dropped `sp_code` from its WHERE, hiding that mutant.
      // Ordering the victim first makes the isolation assertion depend on
      // the WHERE actually scoping by `sp_code`, not on fixture order.
      const store: Record<string, unknown>[] = [sp02Row, sp01Row];

      jest
        .spyOn(repository, 'findOne')
        .mockImplementation(
          async ({ where }: { where: Record<string, unknown> }) =>
            (store.find((row) => matches(row, where)) as never) ?? null,
        );
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockImplementation(async (criteria: any, payload: any) => {
          const matched = store.filter((row) => matches(row, criteria));
          matched.forEach((row) => Object.assign(row, payload));
          return { affected: matched.length } as any;
        });

      await repository.upsertForSp(
        {
          result_id: 101,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTCOME',
          toc_result_id: 42,
          indicator_id: 999,
          toc_result_title: 'sp01 title, updated',
        },
        555,
      );

      // SP02's row must be untouched, field for field.
      expect(sp02Row).toEqual(sp02Snapshot);
      // The update was scoped to SP01's row id only.
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ toc_result_id: 42 }),
      );
      expect(updateSpy).not.toHaveBeenCalledWith({ id: 2 }, expect.anything());
    });

    // T-12 (AC-1676 primary-contributing-sp) — the mirror of the test above.
    // R-BIL-118 AC.1's own text ("writing SP01 leaves SP02 byte-identical")
    // only states one direction; an implementation could special-case SP01
    // (e.g. hard-code an id offset) and still satisfy that literal reading.
    // Asserting the reverse — writing SP02 leaves SP01 byte-identical —
    // rules that out and is the "both directions" evidence T-12 requires.
    it('R-BIL-118 AC.1 — writing SP02 leaves SP01 row byte-identical (reverse direction)', async () => {
      const sp01Row = {
        id: 1,
        result_id: 101,
        sp_code: 'SP01',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: 'sp01 title',
        indicator_description: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
      };
      const sp02Row = {
        id: 2,
        result_id: 101,
        sp_code: 'SP02',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTCOME',
        toc_result_id: 9,
        indicator_id: 77,
        quantitative_contribution: 4.2,
        toc_result_title: 'sp02 title',
        indicator_description: 'sp02 description',
        unit_messurament: 'Number',
        target_value: '10',
        target_year: 2026,
      };
      const sp01Snapshot = { ...sp01Row };
      const store: Record<string, unknown>[] = [sp01Row, sp02Row];

      jest
        .spyOn(repository, 'findOne')
        .mockImplementation(
          async ({ where }: { where: Record<string, unknown> }) =>
            (store.find((row) => matches(row, where)) as never) ?? null,
        );
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockImplementation(async (criteria: any, payload: any) => {
          const matched = store.filter((row) => matches(row, criteria));
          matched.forEach((row) => Object.assign(row, payload));
          return { affected: matched.length } as any;
        });

      await repository.upsertForSp(
        {
          result_id: 101,
          sp_code: 'SP02',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 43,
          indicator_id: 888,
          toc_result_title: 'sp02 title, updated',
        },
        555,
      );

      // SP01's row must be untouched, field for field.
      expect(sp01Row).toEqual(sp01Snapshot);
      // The update was scoped to SP02's row id only.
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 2 },
        expect.objectContaining({ toc_result_id: 43 }),
      );
      expect(updateSpy).not.toHaveBeenCalledWith({ id: 1 }, expect.anything());
    });

    // T-12 — relocates R-BIL-118 AC.3 ("a partial row for one SP does not
    // null out a complete row for another") from the service PATCH path,
    // which T-07 made unable to carry two SPs' ToC entries in one payload.
    // `upsertForSp` is invoked directly per-SP here, seeding both rows
    // up front so a shared-scope bug (e.g. a WHERE that matches on
    // `result_id` alone) would leak the partial write's nulls into the
    // sibling row — exactly the failure this AC guards against. Proven in
    // both directions (T-12 disqualifier: one seeded SP cannot demonstrate
    // isolation).
    it('R-BIL-118 AC.3 — a partial row for SP01 does not null out the complete row for SP02', async () => {
      const sp01Row = {
        id: 1,
        result_id: 101,
        sp_code: 'SP01',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5,
        indicator_id: 12,
        quantitative_contribution: 3.5,
        toc_result_title: 'sp01 title',
        indicator_description: 'sp01 description',
        unit_messurament: 'Number',
        target_value: '40',
        target_year: 2026,
      };
      const sp02Row = {
        id: 2,
        result_id: 101,
        sp_code: 'SP02',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTCOME',
        toc_result_id: 9,
        indicator_id: 77,
        quantitative_contribution: 4.2,
        toc_result_title: 'sp02 title',
        indicator_description: 'sp02 description',
        unit_messurament: 'Number',
        target_value: '10',
        target_year: 2026,
      };
      const sp02Snapshot = { ...sp02Row };
      // Untouched row (SP02) listed FIRST — see ordering note on the AC.1
      // test above.
      const store: Record<string, unknown>[] = [sp02Row, sp01Row];

      jest
        .spyOn(repository, 'findOne')
        .mockImplementation(
          async ({ where }: { where: Record<string, unknown> }) =>
            (store.find((row) => matches(row, where)) as never) ?? null,
        );
      jest
        .spyOn(repository, 'update')
        .mockImplementation(async (criteria: any, payload: any) => {
          const matched = store.filter((row) => matches(row, criteria));
          matched.forEach((row) => Object.assign(row, payload));
          return { affected: matched.length } as any;
        });

      // Partial ("No") submission for SP01 — nulls SP01's own ToC/snapshot
      // columns per upsertForSp's tocColumns mapping.
      await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP01', aligns_with_toc: false },
        555,
      );

      // SP01's own row is legitimately nulled by its own partial submission.
      expect(sp01Row).toMatchObject({
        aligns_with_toc: false,
        level: null,
        toc_result_id: null,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: null,
        indicator_description: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
      });
      // SP02's complete row must survive untouched, field for field — this
      // is the failure AC.3 targets: an overwrite that leaks SP01's nulls
      // into SP02 while leaving SP02 "present" in the store.
      expect(sp02Row).toEqual(sp02Snapshot);
    });

    it('R-BIL-118 AC.3 — a partial row for SP02 does not null out the complete row for SP01 (reverse direction)', async () => {
      const sp01Row = {
        id: 1,
        result_id: 101,
        sp_code: 'SP01',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5,
        indicator_id: 12,
        quantitative_contribution: 3.5,
        toc_result_title: 'sp01 title',
        indicator_description: 'sp01 description',
        unit_messurament: 'Number',
        target_value: '40',
        target_year: 2026,
      };
      const sp02Row = {
        id: 2,
        result_id: 101,
        sp_code: 'SP02',
        is_active: true,
        aligns_with_toc: true,
        level: 'OUTCOME',
        toc_result_id: 9,
        indicator_id: 77,
        quantitative_contribution: 4.2,
        toc_result_title: 'sp02 title',
        indicator_description: 'sp02 description',
        unit_messurament: 'Number',
        target_value: '10',
        target_year: 2026,
      };
      const sp01Snapshot = { ...sp01Row };
      const store: Record<string, unknown>[] = [sp01Row, sp02Row];

      jest
        .spyOn(repository, 'findOne')
        .mockImplementation(
          async ({ where }: { where: Record<string, unknown> }) =>
            (store.find((row) => matches(row, where)) as never) ?? null,
        );
      jest
        .spyOn(repository, 'update')
        .mockImplementation(async (criteria: any, payload: any) => {
          const matched = store.filter((row) => matches(row, criteria));
          matched.forEach((row) => Object.assign(row, payload));
          return { affected: matched.length } as any;
        });

      // Partial ("No") submission for SP02 — nulls SP02's own ToC/snapshot
      // columns per upsertForSp's tocColumns mapping.
      await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP02', aligns_with_toc: false },
        555,
      );

      // SP02's own row is legitimately nulled by its own partial submission.
      expect(sp02Row).toMatchObject({
        aligns_with_toc: false,
        level: null,
        toc_result_id: null,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: null,
        indicator_description: null,
        unit_messurament: null,
        target_value: null,
        target_year: null,
      });
      // SP01's complete row must survive untouched, field for field.
      expect(sp01Row).toEqual(sp01Snapshot);
    });

    it('R-BIL-118 AC.2 (application half) — re-submitting the same (result, sp) updates the single active row in place, never inserting a second, so the partial-unique index is never reached', async () => {
      const store: Record<string, unknown>[] = [];
      let nextId = 1;

      jest
        .spyOn(repository, 'findOne')
        .mockImplementation(
          async ({ where }: { where: Record<string, unknown> }) =>
            (store.find((row) => matches(row, where)) as never) ?? null,
        );
      jest
        .spyOn(repository, 'update')
        .mockImplementation(async (criteria: any, payload: any) => {
          const matched = store.filter((row) => matches(row, criteria));
          matched.forEach((row) => Object.assign(row, payload));
          return { affected: matched.length } as any;
        });
      jest
        .spyOn(repository, 'create')
        .mockImplementation(
          (entity) => entity as ResultPoolFundingTocAlignment,
        );
      jest.spyOn(repository, 'save').mockImplementation(async (entity: any) => {
        const row = { id: nextId++, is_active: true, ...entity };
        store.push(row);
        return row as never;
      });

      await repository.upsertForSp(
        {
          result_id: 101,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5,
        },
        555,
      );
      // Re-submitting the SAME (result, sp) with different content must
      // update the existing active row, not insert a second one.
      await repository.upsertForSp(
        {
          result_id: 101,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTCOME',
          toc_result_id: 9,
        },
        555,
      );

      const activeSp01Rows = store.filter(
        (row) =>
          row.result_id === 101 && row.sp_code === 'SP01' && row.is_active,
      );
      expect(activeSp01Rows).toHaveLength(1);
      expect(activeSp01Rows[0]).toMatchObject({ level: 'OUTCOME' });
    });
  });

  describe('deactivateForSps', () => {
    it('soft-deactivates active rows for the given SPs with audit fields', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 2 } as any);

      const affected = await repository.deactivateForSps(
        101,
        ['SP01', 'SP02'],
        555,
      );

      expect(affected).toBe(2);
      const [criteria, payload] = updateSpy.mock.calls[0];
      expect(criteria).toMatchObject({ result_id: 101, is_active: true });
      expect(payload).toMatchObject({
        is_active: false,
        updated_by: 555,
      });
      expect((payload as any).deleted_at).toBeInstanceOf(Date);
    });

    it('short-circuits and touches nothing when spCodes is empty', async () => {
      const updateSpy = jest.spyOn(repository, 'update');

      await expect(repository.deactivateForSps(101, [], 555)).resolves.toBe(0);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('routes through the provided EntityManager when given', async () => {
      const txRepo = {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(txRepo),
      } as unknown as EntityManager;
      const ownUpdateSpy = jest.spyOn(repository, 'update');

      const affected = await repository.deactivateForSps(
        101,
        ['SP03'],
        555,
        manager,
      );

      expect(affected).toBe(1);
      expect(manager.getRepository).toHaveBeenCalledWith(
        ResultPoolFundingTocAlignment,
      );
      expect(ownUpdateSpy).not.toHaveBeenCalled();
    });
  });
});
