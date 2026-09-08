import { DataSource } from 'typeorm';
import { ResultPoolFundingAlignmentRepository } from './result-pool-funding-alignment.repository';

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-09 / NFR-BIL-122, R-BIL-123 AC.3
//
// This repository had NO spec file before this task (Judgment Day F-4) —
// `repositories/` held only `result-pool-funding-toc-alignment.repository
// .spec.ts`. NFR-BIL-122's query-round-trip gate has nowhere else to live,
// so this file is created here and owns that verification, per
// `tasks.md` T-09 and `execution.md` → "NFR-BIL-122 baseline".
//
// Relationship to `bilateral.service.spec.ts` (T-08's repository-level
// tests, `describe('ResultPoolFundingAlignmentRepository — sp_roles LEFT
// JOIN null-sp_code guard (T-08 / RA-08)')`, around line 1524):
// T-08 added three `it`s there against the real repository construction
// (a zero-active-SP-rows guard, a mixed-row sp_roles check, and an AC.3
// selected_levers field-shape check), explicitly scoped to stay in that
// file rather than create this one ("does not create that file" —
// `bilateral.service.spec.ts:1522`). Decision for this file, per test:
//   - zero-active-SP-rows guard (NULL sp_code)  -> DUPLICATED here
//     deliberately. T-09's own done-criteria require "the LEFT JOIN
//     NULL-sp_code row in at least one fixture" independent of what T-08
//     already covered, and this file — not the service spec — is this
//     repository's designated home going forward. T-08's original is left
//     in place untouched; duplicating is not redundant because this file's
//     job is to be a self-contained verification of NFR-BIL-122 + AC.3
//     without depending on a describe block that lives elsewhere for
//     different reasons.
//   - mixed-row sp_roles check                  -> DUPLICATED here (below,
//     folded into the multi-row ordering test), same reasoning.
//   - AC.3 selected_levers field-shape check     -> DUPLICATED here with an
//     added ordering assertion (two rows, not one), because AC.3 requires
//     "unchanged in fields AND order" and a single-row fixture cannot
//     exercise order at all.
// Nothing is moved or deleted from `bilateral.service.spec.ts` — T-08 is
// already reviewed and PASSed; touching it is outside this task's "one new
// spec file, no production change" scope boundary.
describe('ResultPoolFundingAlignmentRepository', () => {
  const buildRepository = () => {
    const dataSource = {
      // ⚠ THE EMPTY OBJECT IS LOAD-BEARING — do not enrich it.
      //
      // NFR-BIL-122's named defect is `sp_roles` fetched via a SECOND
      // `find()`. The query-count assertion below CANNOT see that: TypeORM's
      // `find()` routes through the entity manager, never through
      // `Repository.query`, so `querySpy` would not increment (verified
      // empirically during T-09 review — `tasks.md`'s claim that a second
      // `find()` "makes the query-count assertion red" is imprecise: the FILE
      // reddens, the count assertion does not).
      //
      // What actually catches it is THIS bare `{}`: any real ORM data-access
      // path other than the spied `query` throws
      // `TypeError: Cannot read properties of undefined (reading 'getMetadata')`
      // immediately. So the two mechanisms are complementary — the count gate
      // catches a second `this.query(...)`, the empty manager catches a second
      // `find()` / `findOne()` / `createQueryBuilder()`.
      //
      // Enriching this mock (e.g. to `{ find: jest.fn() }`) silently deletes
      // the second half of that coverage and leaves only the count gate, which
      // is blind to the defect the requirement names. If a future test needs a
      // populated manager, give THAT test its own data source and leave this
      // one empty.
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    return new ResultPoolFundingAlignmentRepository(dataSource);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------
  // NFR-BIL-122 — "GET adds no query round-trip"
  // -------------------------------------------------------------------
  //
  // Baseline derivation (recorded in `execution.md` → "NFR-BIL-122
  // baseline", captured BEFORE T-08 landed, from commit `e154c75b` — the
  // last commit before T-08's change to this file):
  //
  //   git show e154c75b:server/researchindicators/src/domain/entities/
  //     bilateral/repositories/result-pool-funding-alignment.repository.ts \
  //     | grep -cE "getRawMany|getMany|getRawOne|getOne|\.query\("
  //   => 1
  //
  // `findActiveAlignmentByResultId` issued exactly ONE database round-trip
  // (a single `this.query(...)` call) before sp_role existed. T-08 added
  // sp_role by riding the SAME `LEFT JOIN` and the SAME `this.query(...)`
  // call rather than adding a second query — the assertion below re-derives
  // that baseline is `1` and asserts equality against it, now that
  // `sp_role` is selected. The regression this guards: implementing
  // `sp_roles` as a second `find()`/`query()` call. That would still
  // produce correct output and pass every shape assertion below — only a
  // call-count assertion on the query mock can see it.
  describe('findActiveAlignmentByResultId — query round-trip count (NFR-BIL-122)', () => {
    it('issues exactly ONE this.query(...) call with sp_role selected — equals the e154c75b baseline of 1', async () => {
      const repository = buildRepository();
      const querySpy = jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP06',
          lever_name: 'SP06',
          sp_code: 'SP06',
          sp_role: 'PRIMARY',
        },
      ]);

      await repository.findActiveAlignmentByResultId(19792);

      // Baseline: 1 (derived above from e154c75b). This is an equality
      // assertion, not `<= 2` or any other unearned bound.
      expect(querySpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------
  // sp_roles projection — design.md §4 carrier plumbing, R-BIL-123 AC.3
  // -------------------------------------------------------------------
  describe('findActiveAlignmentByResultId — sp_roles projection', () => {
    it('produces sp_roles from the SAME rows as selected_levers, filtered on non-null sp_code, preserving row order', async () => {
      const repository = buildRepository();
      jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP01',
          lever_name: 'Lever SP01',
          sp_code: 'SP01',
          sp_role: 'CONTRIBUTING',
        },
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP09',
          lever_name: 'Lever SP09',
          sp_code: 'SP09',
          sp_role: 'PRIMARY',
        },
      ]);

      const out = await repository.findActiveAlignmentByResultId(19792);

      // sp_roles comes from the same two rows selected_levers is built
      // from, same order (ORDER BY rpfas.sp_code ASC is applied in SQL).
      expect(out?.sp_roles).toEqual([
        { sp_code: 'SP01', sp_role: 'CONTRIBUTING' },
        { sp_code: 'SP09', sp_role: 'PRIMARY' },
      ]);
      expect(out?.selected_levers).toEqual([
        { lever_code: 'SP01', lever_name: 'Lever SP01' },
        { lever_code: 'SP09', lever_name: 'Lever SP09' },
      ]);
    });

    // The LEFT JOIN NULL-sp_code row is a REAL output of the query (an
    // alignment with zero active SP rows), not a hypothetical — this
    // fixture is deliberately included per T-09's own instructions.
    // Duplicated from `bilateral.service.spec.ts`'s T-08 guard (see file
    // header) because this file is NFR-BIL-122 / AC.3's designated home.
    it('an alignment with zero active SP rows (LEFT JOIN NULL sp_code) yields sp_roles: [] and selected_levers: [] — not a phantom { sp_code: null } member', async () => {
      const repository = buildRepository();
      jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: null,
          lever_name: null,
          sp_code: null,
          sp_role: null,
        },
      ]);

      const out = await repository.findActiveAlignmentByResultId(19792);

      expect(out?.sp_roles).toEqual([]);
      expect(out?.selected_levers).toEqual([]);
    });

    it('a null sp_role on an otherwise active row is passed through as null, not coerced to a role', async () => {
      const repository = buildRepository();
      jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP06',
          lever_name: 'Lever SP06',
          sp_code: 'SP06',
          sp_role: null,
        },
      ]);

      const out = await repository.findActiveAlignmentByResultId(19792);

      expect(out?.sp_roles).toEqual([{ sp_code: 'SP06', sp_role: null }]);
    });
  });

  // -------------------------------------------------------------------
  // selected_levers unchanged in fields AND order — R-BIL-123 AC.3
  // -------------------------------------------------------------------
  describe('findActiveAlignmentByResultId — selected_levers unchanged (R-BIL-123 AC.3)', () => {
    it('selected_levers carries ONLY lever_code/lever_name, field-by-field, in row order — sp_role never leaks onto it', async () => {
      const repository = buildRepository();
      jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP01',
          lever_name: 'Lever SP01',
          sp_code: 'SP01',
          sp_role: 'CONTRIBUTING',
        },
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP09',
          lever_name: 'Lever SP09',
          sp_code: 'SP09',
          sp_role: 'PRIMARY',
        },
      ]);

      const out = await repository.findActiveAlignmentByResultId(19792);
      const levers = out?.selected_levers ?? [];

      // Order: SP01 before SP09, matching the row order (SQL ORDER BY
      // rpfas.sp_code ASC).
      expect(levers.map((l) => l.lever_code)).toEqual(['SP01', 'SP09']);

      // Fields: exactly lever_code + lever_name, per entry — field-by-field,
      // not a loose `toEqual` on the whole array only.
      expect(levers[0].lever_code).toBe('SP01');
      expect(levers[0].lever_name).toBe('Lever SP01');
      expect(levers[1].lever_code).toBe('SP09');
      expect(levers[1].lever_name).toBe('Lever SP09');

      levers.forEach((lever) => {
        expect(Object.keys(lever).sort()).toEqual(['lever_code', 'lever_name']);
      });
    });

    it('falls back to lever_code when lever_name is null, unaffected by sp_role being present on the same row', async () => {
      const repository = buildRepository();
      jest.spyOn(repository, 'query').mockResolvedValue([
        {
          id: 501,
          result_id: 19792,
          has_contribution: 1,
          lever_code: 'SP06',
          lever_name: null,
          sp_code: 'SP06',
          sp_role: 'PRIMARY',
        },
      ]);

      const out = await repository.findActiveAlignmentByResultId(19792);

      expect(out?.selected_levers).toEqual([
        { lever_code: 'SP06', lever_name: 'SP06' },
      ]);
    });
  });
});
