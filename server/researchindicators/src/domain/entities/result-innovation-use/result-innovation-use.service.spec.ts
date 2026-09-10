import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { ResultInnovationUse } from './entities/result-innovation-use.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ResultQuantificationsService } from '../result-quantifications/result-quantifications.service';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ClarisaInnovationUseLevel } from '../../tools/clarisa/entities/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';
import {
  CreateResultInnovationUseDto,
  InnovationUseActorDto,
} from './dto/create-result-innovation-use.dto';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { ResultsService } from '../results/results.service';
import { LinkResultsService } from '../link-results/link-results.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { Result } from '../results/entities/result.entity';

describe('ResultInnovationUseService', () => {
  let service: ResultInnovationUseService;
  // FAIL-2 remediation (design.md §9, validation-report.md 2026-08-20).
  // `logger` is instantiated directly (`new CgiarLogger(...)`), not injected
  // via DI (mirrors `ResultInnovationDevService`), so it is spied at the
  // prototype rather than provided as a mock.
  let loggerWarnSpy: jest.SpyInstance;

  const mainFindOne = jest.fn();
  const mainSave = jest.fn();
  const levelFindOne = jest.fn();

  const mainRepo = {
    findOne: mainFindOne,
    save: mainSave,
    target: ResultInnovationUse,
  };

  const levelRepo = {
    findOne: levelFindOne,
  };

  // `docs/specs/innovation-use/dev-card-details` T-01 —
  // `readInnovationDevCardFacts`'s `QueryBuilder` chain, mocked the way
  // `bilateral-mapping-coverage.service.ts` exemplifies for this repo:
  // `leftJoinAndSelect`/`where` return `this` (chainable), `getOne` is the
  // terminal call whose resolution drives each acceptance case below. This
  // mock has no `getQuery` key — the ACTUAL emitted SQL is asserted only in
  // the `test:fixtures` tier (`innovation-dev-card-facts.fixture-spec.ts`),
  // per `NFR-IUC-001`'s disqualifier: a mocked repository proves the call,
  // never the SQL.
  const resultQueryBuilderLeftJoinAndSelect = jest.fn().mockReturnThis();
  const resultQueryBuilderWhere = jest.fn().mockReturnThis();
  const resultQueryBuilderGetOne = jest.fn();
  const resultQueryBuilder = {
    leftJoinAndSelect: resultQueryBuilderLeftJoinAndSelect,
    where: resultQueryBuilderWhere,
    getOne: resultQueryBuilderGetOne,
  };
  const resultCreateQueryBuilder = jest
    .fn()
    .mockReturnValue(resultQueryBuilder);
  const resultRepo = {
    createQueryBuilder: resultCreateQueryBuilder,
  };

  const getRepository = jest.fn((entity: unknown) => {
    if (entity === ClarisaInnovationUseLevel) {
      return levelRepo;
    }
    if (entity === Result) {
      return resultRepo;
    }
    return mainRepo;
  });

  const transaction = jest.fn();

  const mockDataSource = {
    getRepository,
    transaction,
  };

  // Mirrors `CurrentUserUtil.audit`'s real switch (`current-user.util.ts:51-60`)
  // branch-for-branch, including its `SetAuditEnum.NEW` default parameter —
  // not a two-way `flag === NEW ? A : B` collapse. That collapse silently
  // merged `BOTH` into the `UPDATE` shape (so an `audit(BOTH)` call on the
  // update path — which should clobber `created_by` too — asserted
  // identically to a correct `audit(UPDATE)` call) and, since
  // `SetAuditEnum.NEW === 0`, inverted a no-argument `audit()` call to the
  // `UPDATE` shape instead of the real default `NEW` shape (fold-in, T-06
  // attempt 2). The `default:` arm below is this double's own safety net
  // only — the real `audit`'s switch (an exhaustive match over the
  // `SetAuditEnum` enum) has no `default` case at all, so "branch-for-branch"
  // means the three real cases, not this one; it is unreachable through the
  // typed `SetAuditEnum` parameter and exists only so a caller who defeats
  // the type system fails loud in the double rather than falling through to
  // `undefined` (corrected, T-06 attempt 3 — the original wording overstated
  // this as branch-for-branch fidelity).
  const mockCurrentUser = {
    audit: jest.fn((flag: SetAuditEnum = SetAuditEnum.NEW) => {
      switch (flag) {
        case SetAuditEnum.NEW:
          return { created_by: 1 };
        case SetAuditEnum.UPDATE:
          return { updated_by: 1 };
        case SetAuditEnum.BOTH:
          return { created_by: 1, updated_by: 1 };
        default:
          return { updated_by: 1 };
      }
    }),
  };

  const mockResultActors = {
    find: jest.fn().mockResolvedValue([]),
    customSaveInnovationUse: jest.fn().mockResolvedValue(undefined),
  };

  const mockResultInstitutionTypes = {
    find: jest.fn().mockResolvedValue([]),
    customSaveInnovationUse: jest.fn().mockResolvedValue(undefined),
  };

  const mockResultQuantifications = {
    findByResultIdAndRoles: jest.fn().mockResolvedValue([]),
    upsertByCompositeKeys: jest.fn().mockResolvedValue([]),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn().mockResolvedValue(undefined),
  };

  // T-06 (design.md §5.1 step 4c / step 9b, R-IUL-005/006/008) — wired for
  // real now. `filterResultByIndicators` defaults to a match (so tests that
  // don't care about the link target don't have to arrange it); `create`
  // defaults to resolving, and its call args are asserted per-test.
  const mockFilterResultByIndicators = jest
    .fn()
    .mockResolvedValue([1] as number[]);
  const mockLinkResultsCreate = jest.fn().mockResolvedValue(undefined);
  // T-07 (R-IUL-007, design.md §5.2) — `findOne`'s fourth `Promise.all`
  // entry. Defaults to an empty array so every pre-existing `findOne` test
  // (none of which cares about the link) keeps working unchanged.
  const mockFindAndDetails = jest.fn().mockResolvedValue([]);
  const mockResultsService = {
    filterResultByIndicators: mockFilterResultByIndicators,
  };
  const mockLinkResultsService = {
    create: mockLinkResultsCreate,
    findAndDetails: mockFindAndDetails,
  };

  // A single, stable manager instance for every transaction run in this
  // file — so an assertion that a child call received *this* object (rather
  // than `undefined`) is a real, falsifiable check on manager-threading
  // (DD-10), not a tautology against whatever the mock happened to produce.
  const managerUpdate = jest.fn().mockResolvedValue(undefined);
  const fakeManager = {
    getRepository: jest.fn().mockReturnValue({ update: managerUpdate }),
  };

  // Part B.1 (Lens B, T-06 attempt 2) — the `transaction` double previously
  // just resolved its callback inline and never modelled `COMMIT`, so an
  // ordering assertion comparing the re-read against `transaction()`'s own
  // *invocation* could not tell "after the callback resolves" from "after
  // transaction() was merely called". `postCommitFindOneCallsAtCommit`
  // captures how many times `mainFindOne` had been called at the exact
  // instant the callback resolved (i.e. right before "COMMIT"), BEFORE the
  // real, correct re-read (which happens only after `transaction()` itself
  // resolves) can have run. A mutation that moves the re-read inside the
  // callback inflates this to 2; the correct implementation leaves it at 1
  // (step 2's existence check only).
  let postCommitFindOneCallsAtCommit = 0;

  beforeEach(async () => {
    jest.clearAllMocks();
    loggerWarnSpy = jest
      .spyOn(CgiarLogger.prototype, 'warn')
      .mockImplementation(() => undefined);
    // `clearAllMocks()` clears call history but NOT a queued
    // `mockResolvedValueOnce` implementation — a test that throws before
    // consuming a second queued value (e.g. the post-commit re-read) would
    // otherwise leak that value into the next test's first call. Explicit
    // `mockReset()` on the two mocks driven by chained `...Once()` calls
    // across this file closes that leak.
    mainFindOne.mockReset();
    levelFindOne.mockReset();
    // T-01 — same `...Once()` leak-closing discipline: `getOne` is driven
    // by `mockResolvedValueOnce` in every case below.
    resultQueryBuilderGetOne.mockReset();
    resultQueryBuilderLeftJoinAndSelect.mockReturnThis();
    resultQueryBuilderWhere.mockReturnThis();
    resultCreateQueryBuilder.mockReturnValue(resultQueryBuilder);
    // Part C.4 (fold-in, T-06 attempt 2) — `clearAllMocks()` clears call
    // history but NOT a queued `mockResolvedValueOnce` implementation. The
    // isolation fix above covered only `mainFindOne` / `levelFindOne`; these
    // three also receive `...Once()` values in the full-transaction test
    // below and need the same explicit `mockReset()` before their default is
    // reinstated, or a leaked queued value could override a later test's
    // first call with no warning.
    mockResultActors.find.mockReset();
    mockResultInstitutionTypes.find.mockReset();
    mockResultQuantifications.findByResultIdAndRoles.mockReset();
    // T-06 — `mockFilterResultByIndicators` receives `...Once()` values in
    // the R-IUL-006 clauses below; same leak-closing discipline as above.
    mockFilterResultByIndicators.mockReset();
    mockLinkResultsCreate.mockReset();
    mockFindAndDetails.mockReset();
    getRepository.mockImplementation((entity: unknown) => {
      if (entity === ClarisaInnovationUseLevel) {
        return levelRepo;
      }
      if (entity === Result) {
        return resultRepo;
      }
      return mainRepo;
    });
    mockResultActors.find.mockResolvedValue([]);
    mockResultActors.customSaveInnovationUse.mockResolvedValue(undefined);
    mockResultInstitutionTypes.find.mockResolvedValue([]);
    mockResultInstitutionTypes.customSaveInnovationUse.mockResolvedValue(
      undefined,
    );
    mockResultQuantifications.findByResultIdAndRoles.mockResolvedValue([]);
    mockResultQuantifications.upsertByCompositeKeys.mockResolvedValue([]);
    mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);
    mockFilterResultByIndicators.mockResolvedValue([1]);
    mockLinkResultsCreate.mockResolvedValue(undefined);
    mockFindAndDetails.mockResolvedValue([]);
    levelFindOne.mockResolvedValue(null);
    managerUpdate.mockResolvedValue(undefined);
    fakeManager.getRepository.mockReturnValue({ update: managerUpdate });
    postCommitFindOneCallsAtCommit = 0;
    transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
      const result = await cb(fakeManager);
      // Captured BEFORE the callback's caller (the real `update()`) gets a
      // chance to run its own post-commit re-read — so a mutation that
      // moves that re-read *inside* the callback is already reflected here,
      // while the correct implementation (re-read after `transaction()`
      // resolves) has not touched `mainFindOne` again yet.
      postCommitFindOneCallsAtCommit = mainFindOne.mock.calls.length;
      return result;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInnovationUseService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ResultActorsService, useValue: mockResultActors },
        {
          provide: ResultInstitutionTypesService,
          useValue: mockResultInstitutionTypes,
        },
        {
          provide: ResultQuantificationsService,
          useValue: mockResultQuantifications,
        },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        { provide: ResultsService, useValue: mockResultsService },
        { provide: LinkResultsService, useValue: mockLinkResultsService },
      ],
    }).compile();

    service = module.get<ResultInnovationUseService>(
      ResultInnovationUseService,
    );
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  describe('create', () => {
    it('saves a new row with the result id and audit(NEW) fields', async () => {
      const saved = { result_id: 42 } as ResultInnovationUse;
      mainSave.mockResolvedValue(saved);

      const out = await service.create(42);

      expect(mainSave).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 42, created_by: 1 }),
      );
      // Pinned by exact call, not merely by the resulting shape (mirrors the
      // update-path pin at line ~689) — a regression to `audit(BOTH)` would
      // also produce `created_by: 1` and hide behind the `objectContaining`
      // check above alone (M17, T-06 attempt 3).
      expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.NEW);
      expect(out).toBe(saved);
    });
  });

  describe('update — existence check (design.md §5.1 step 2)', () => {
    const resultId = 42;

    it('throws NotFoundException before BEGIN when no detail row exists — no level lookup, no transaction', async () => {
      mainFindOne.mockResolvedValueOnce(null);

      await expect(
        service.update(resultId, {} as CreateResultInnovationUseDto),
      ).rejects.toThrow(NotFoundException);

      expect(transaction).not.toHaveBeenCalled();
      expect(levelFindOne).not.toHaveBeenCalled();
    });
  });

  describe('update — validation runs entirely before BEGIN (DD-3)', () => {
    const resultId = 42;

    it('a duplicate actor type throws BadRequestException naming actor_type_id, before BEGIN — zero child-service calls (R-IUA-003 AC.2, R-IUA-005 AC.1/AC.4)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });

      const dto = {
        actors: [{ actor_type_id: 2 }, { actor_type_id: 2 }],
      } as CreateResultInnovationUseDto;

      let caught: BadRequestException | undefined;
      try {
        await service.update(resultId, dto);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual(
        expect.arrayContaining([expect.stringContaining('actor_type_id')]),
      );

      // The scenario's negative constraint: NOTHING was written.
      expect(transaction).not.toHaveBeenCalled();
      expect(mockResultActors.customSaveInnovationUse).not.toHaveBeenCalled();
      expect(
        mockResultInstitutionTypes.customSaveInnovationUse,
      ).not.toHaveBeenCalled();
      expect(
        mockResultQuantifications.upsertByCompositeKeys,
      ).not.toHaveBeenCalled();
      expect(mockUpdateDataUtil.updateLastUpdatedDate).not.toHaveBeenCalled();
    });

    it('T-01 (docs/specs/bugfix/innovation-use-draft-save): a missing justification at level >= 6 no longer blocks the save — it proceeds to BEGIN and every child service is invoked with the payload (R-IUD-001 AC.3)', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      const dto = {
        innovation_use_level_id: 7,
      } as CreateResultInnovationUseDto;

      await expect(service.update(resultId, dto)).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(mockResultActors.customSaveInnovationUse).toHaveBeenCalledWith(
        resultId,
        [],
        fakeManager,
      );
      expect(
        mockResultInstitutionTypes.customSaveInnovationUse,
      ).toHaveBeenCalledWith(resultId, [], fakeManager);
      expect(
        mockResultQuantifications.upsertByCompositeKeys,
      ).toHaveBeenCalledWith(
        resultId,
        [],
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.INNOVATION_USE,
        fakeManager,
      );
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
        fakeManager,
      );
    });
  });

  /**
   * `validation-report.md` **FAIL-1** (2026-08-20). An organization row with
   * no identity field at all reached
   * `ResultInstitutionTypesService.constructWhereClause`, where all three
   * `if` branches are false, so the predicate degenerated to
   * `{ result_id, institution_type_role_id }` — `findOne` returned an
   * ARBITRARY existing organization row of this result, its primary key was
   * adopted, and it was overwritten with nulls while every sibling row was
   * deactivated. A `200`, unrecoverable.
   *
   * All three id-keyed protections were structurally inert (the payload
   * submits no id), so the gate has to be the identity rule itself. These
   * tests pin it BEFORE `BEGIN` — zero child-service calls — which is what
   * makes R-IUA-003 AC.2 hold by ordering rather than by rollback.
   */
  describe('update — an organization row must identify its organization (R-IUA-007 AC.6, FAIL-1)', () => {
    const resultId = 42;

    const expectRejectedBeforeBegin = async (
      organizations: unknown[],
    ): Promise<BadRequestException> => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });

      let caught: BadRequestException | undefined;
      try {
        await service.update(resultId, {
          organizations,
        } as CreateResultInnovationUseDto);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      // Nothing was written — the whole point of running before BEGIN.
      expect(transaction).not.toHaveBeenCalled();
      expect(
        mockResultInstitutionTypes.customSaveInnovationUse,
      ).not.toHaveBeenCalled();
      expect(mockResultActors.customSaveInnovationUse).not.toHaveBeenCalled();
      expect(
        mockResultQuantifications.upsertByCompositeKeys,
      ).not.toHaveBeenCalled();
      expect(mockUpdateDataUtil.updateLastUpdatedDate).not.toHaveBeenCalled();
      return caught;
    };

    it('rejects the exact reported payload — a count with no identity field — naming the offending row index', async () => {
      const caught = await expectRejectedBeforeBegin([
        { organization_count: 12 },
      ]);

      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'organizations.0.institution_type_id: an organization row must identify its organization — supply institution_type_id, or is_organization_known together with institution_id',
      ]);
    });

    it('rejects a wholly empty organization row', async () => {
      await expectRejectedBeforeBegin([{}]);
    });

    it('rejects is_organization_known: true with no institution_id — the known-organization branch of the same lookup', async () => {
      await expectRejectedBeforeBegin([{ is_organization_known: true }]);
    });

    it('rejects institution_id supplied WITHOUT the known flag — buildWhereClause only takes the institution_id branch on `=== true`, so this row would fall through to the degenerate predicate', async () => {
      await expectRejectedBeforeBegin([{ institution_id: 123 }]);
    });

    it('rejects a sub_institution_type_id with no parent institution_type_id — which would otherwise emit `institution_type_id: undefined` into the where clause', async () => {
      await expectRejectedBeforeBegin([{ sub_institution_type_id: 7 }]);
    });

    it('names the offending row index when a valid row precedes an invalid one', async () => {
      const caught = await expectRejectedBeforeBegin([
        { institution_type_id: 5 },
        { organization_count: 3 },
      ]);

      expect(
        (caught.getResponse() as { message: string[] }).message[0],
      ).toContain('organizations.1.');
    });

    const expectAccepted = async (organizations: unknown[]) => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true }) // step 2
        .mockResolvedValueOnce({ result_id: resultId }); // step 12 re-read
      mockResultActors.find.mockResolvedValueOnce([]);
      mockResultInstitutionTypes.find.mockResolvedValueOnce([]);
      mockResultQuantifications.findByResultIdAndRoles.mockResolvedValueOnce(
        [],
      );

      await service.update(resultId, {
        organizations,
      } as CreateResultInnovationUseDto);

      expect(
        mockResultInstitutionTypes.customSaveInnovationUse,
      ).toHaveBeenCalled();
    };

    it('ACCEPTS institution_type_id alone — the rule must not reject a legitimate draft-save', async () => {
      await expectAccepted([{ institution_type_id: 5 }]);
    });

    it('ACCEPTS a known organization carrying its institution_id', async () => {
      await expectAccepted([
        { is_organization_known: true, institution_id: 123 },
      ]);
    });

    it('ACCEPTS an empty organizations array — clearing the collection is not an unidentified row', async () => {
      await expectAccepted([]);
    });
  });

  describe('update — duplicate actor identity (R-IUA-005)', () => {
    const resultId = 42;

    it('rejects two OTHER rows sharing the same custom name (AC.3)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });

      const dto = {
        actors: [
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: 'Cooperative A',
          },
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: 'Cooperative A',
          },
        ],
      } as CreateResultInnovationUseDto;

      await expect(service.update(resultId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('accepts two OTHER rows with DIFFERENT custom names — distinct identities, not a duplicate (AC.2)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: null,
          innovation_use_level_explanation: null,
          innovation_use_level: null,
        });

      const dto = {
        actors: [
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: 'Cooperative A',
          },
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: 'Cooperative B',
          },
        ],
      } as CreateResultInnovationUseDto;

      await expect(service.update(resultId, dto)).resolves.toBeDefined();
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(mockResultActors.customSaveInnovationUse).toHaveBeenCalledWith(
        resultId,
        dto.actors,
        fakeManager,
      );
    });

    it('a single previously-saved actor row (result_actors_id set), re-sent once, is not a duplicate of itself (AC.5)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: null,
          innovation_use_level_explanation: null,
          innovation_use_level: null,
        });

      // The persisted fixture carries the SAME identity (actor_type_id: 3)
      // the payload re-sends. A dedup rule that (incorrectly) folds
      // persisted rows into the identity set collides the re-sent row with
      // its own stored copy and throws; the correct rule validates the
      // payload only and must resolve regardless of what is already stored
      // (M16, T-06 attempt 3).
      mockResultActors.find.mockResolvedValue([
        { result_actors_id: 11, actor_type_id: 3 },
      ]);

      const dto = {
        actors: [{ result_actors_id: 11, actor_type_id: 3 }],
      } as CreateResultInnovationUseDto;

      await expect(service.update(resultId, dto)).resolves.toBeDefined();
      expect(mockResultActors.customSaveInnovationUse).toHaveBeenCalledWith(
        resultId,
        dto.actors,
        fakeManager,
      );
    });
  });

  describe('update — level ≥ 6 justification (R-IUA-006, trap 2)', () => {
    const resultId = 42;

    it('T-01: BOTH catalog id 6 (level 5) and catalog id 7 (level 6) without explanation are ACCEPTED — the save-time guard that used to discriminate this pair is deleted; only the green check (innovation_use_validation) discriminates completeness now (AC.1, AC.2, AC.6)', async () => {
      // Half A — id 6 → level 5 → accepted (unchanged).
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 6,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 5 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 6, level: 5 });

      const acceptA = await service.update(resultId, {
        innovation_use_level_id: 6,
      } as CreateResultInnovationUseDto);
      expect(acceptA.innovation_use_level).toBe(5);

      // Half B — id 7 → level 6 → NOW ALSO accepted. This is the exact
      // inversion R-IUD-001 requires: pre-fix, this half rejected 400.
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      const acceptB = await service.update(resultId, {
        innovation_use_level_id: 7,
      } as CreateResultInnovationUseDto);
      expect(acceptB.innovation_use_level).toBe(6);
      expect(transaction).toHaveBeenCalledTimes(2);
    });

    it('T-01: a whitespace-only explanation at level >= 6 no longer blocks the save — it is written through verbatim (R-IUD-001 sc.2)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '   ',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '   ',
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_explanation: '   ',
        }),
      );
    });

    it('T-01: an empty-string explanation at level >= 6 no longer blocks the save — it is written through verbatim (R-IUD-001)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '',
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_explanation: '',
        }),
      );
    });

    it('accepts no level at all — the explanation rule does not fire (draft-save, AC.5) — and never queries the catalog', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: null,
          innovation_use_level_explanation: null,
          innovation_use_level: null,
        });

      await expect(
        service.update(resultId, {} as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();
      expect(levelFindOne).not.toHaveBeenCalled();
    });

    it('resolves the level by querying the catalog on its primary key id, never by name (trap 2, AC.6)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 6,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 5 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 6, level: 5 });

      await service.update(resultId, {
        innovation_use_level_id: 6,
      } as CreateResultInnovationUseDto);

      expect(getRepository).toHaveBeenCalledWith(ClarisaInnovationUseLevel);
      // No `is_active` filter (fold-in, T-06 attempt 2) — see the dedicated
      // test below for why.
      expect(levelFindOne).toHaveBeenCalledWith({ where: { id: 6 } });
    });
  });

  describe('update — level resolution guards (fold-in, T-06 attempt 2)', () => {
    const resultId = 42;

    it('does not filter the catalog lookup by is_active — a stored FK level is a fact about the row, not catalog currency (would-be-M14 falsifier)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'valid justification',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'valid justification',
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      // A query carrying `is_active: true` would not equal this literal —
      // restoring that filter reds this assertion (M14).
      expect(levelFindOne).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('rejects with 400 naming innovation_use_level_id, before BEGIN, when the id resolves to no catalog row at all (400 guard replaces the FK-constraint 500)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce(null);

      let caught: BadRequestException | undefined;
      try {
        await service.update(resultId, {
          innovation_use_level_id: 999,
        } as CreateResultInnovationUseDto);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('innovation_use_level_id'),
        ]),
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    // T-01 (docs/specs/bugfix/innovation-use-draft-save): this test used to
    // prove a string-typed bigint level still "tripped" the level >= 6
    // justification rule. That rule (and its only consumer of the resolved
    // `level` scalar) is deleted — there is nothing left to trip. Inverted
    // to its positive counterpart: the save proceeds regardless of the
    // driver's string-vs-number level representation.
    it('a string-typed bigint level from the MySQL driver no longer rejects the save — T-01 deleted the level >= 6 justification rule that used to compare against it', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({
        id: 7,
        level: '6',
      } as unknown as { id: number; level: number });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("update — DD-14 effective-row resolution survives T-01's guard deletion; only the write-through behavior remains observable", () => {
    const resultId = 42;

    // T-01 (docs/specs/bugfix/innovation-use-draft-save): these two used to
    // prove DD-14's bypass-closure — that an explicit null/empty explanation
    // against a stored level >= 6 was rejected even though `create()`'s
    // partial-merge write would otherwise have left the stored level in
    // place. The rule they proved is deleted; there is no rejection left to
    // observe. What remains observable, and still matters (R-IUD-001 sc.1's
    // BUT clause), is that an EXPLICIT null/empty is written straight
    // through as a real clearing — never silently dropped — while `:168-171`
    // (untouched by T-01) still exists to resolve the effective row for
    // whichever future consumer needs it.
    it('an explicit null explanation against a stored level 6 now saves — the update statement clears the column to null (the level >= 6 guard that used to intercept this is deleted)', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'a previously valid justification',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_explanation: null,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({ innovation_use_level_explanation: null }),
      );
    });

    it('the same clearing via an empty-string explanation also saves and is written through verbatim', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'a previously valid justification',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_explanation: '',
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({ innovation_use_level_explanation: '' }),
      );
    });

    it("omitting the level id resolves the level lookup against the STORED level, not a silent skip (DD-14's effective-row resolution, unaffected by T-01)", async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'kept',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'kept',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          actors: [],
        } as unknown as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      // The level id resolved for the rule was the STORED 7, not `undefined`.
      expect(levelFindOne).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });

  describe('update — clear justification when effective catalog level is < 6 or absent (R-IUJ-001; not Bug-Mode evidence, DD-6)', () => {
    const resultId = 42;

    it('writes explanation null when the resolved catalog level is 2, ignoring a present DTO string', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'stale justification',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 3,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 2 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 3, level: 2 });

      await service.update(resultId, {
        innovation_use_level_id: 3,
        innovation_use_level_explanation: 'stale justification',
      } as CreateResultInnovationUseDto);

      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_id: 3,
          innovation_use_level_explanation: null,
        }),
      );
    });

    it('writes explanation null when the resolved catalog level is 5 (catalog id 6 — family D-1)', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'stale justification',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 6,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 5 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 6, level: 5 });

      await service.update(resultId, {
        innovation_use_level_id: 6,
        innovation_use_level_explanation: 'stale justification',
      } as CreateResultInnovationUseDto);

      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_id: 6,
          innovation_use_level_explanation: null,
        }),
      );
    });

    it('passes the DTO explanation through when the resolved catalog level is 6', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'kept',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'kept',
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await service.update(resultId, {
        innovation_use_level_id: 7,
        innovation_use_level_explanation: 'kept',
      } as CreateResultInnovationUseDto);

      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_id: 7,
          innovation_use_level_explanation: 'kept',
        }),
      );
    });

    it('writes explanation null when there is no effective catalog level', async () => {
      mainFindOne
        .mockResolvedValueOnce({
          result_id: resultId,
          is_active: true,
          innovation_use_level_id: null,
          innovation_use_level_explanation: 'leftover',
        })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: null,
          innovation_use_level_explanation: null,
          innovation_use_level: null,
        });

      await service.update(resultId, {
        innovation_use_level_explanation: 'leftover',
      } as CreateResultInnovationUseDto);

      expect(levelFindOne).not.toHaveBeenCalled();
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({ innovation_use_level_explanation: null }),
      );
    });
  });

  describe('update — full write transaction (design.md §5.1, R-IUA-003)', () => {
    const resultId = 42;

    it('persists all five parts inside one transaction, threads the manager through every child call (DD-10), and returns the post-commit re-read — never the request body (AC.1, AC.4, AC.6, AC.7)', async () => {
      const dto: CreateResultInnovationUseDto = {
        innovation_use_level_id: 6,
        actors: [{ actor_type_id: 1 }] as InnovationUseActorDto[],
        // `is_organization_known: true` added 2026-08-20 alongside the FAIL-1
        // fix. `{ institution_id: 5 }` alone is now rejected by
        // `validateOrganizationsAreIdentified`, and rightly so: `buildWhereClause`
        // takes its `institution_id` branch only on `=== true`, so this payload
        // used to fall through to the degenerate `constructWhereClause` predicate
        // — i.e. this test was itself written in one of the vulnerable shapes,
        // and passed only because the organization service is mocked here.
        organizations: [
          { is_organization_known: true, institution_id: 5 },
        ] as unknown as CreateResultInnovationUseDto['organizations'],
        quantifications: [
          { quantification_number: 3, unit: 'ha' },
        ] as unknown as CreateResultInnovationUseDto['quantifications'],
      };

      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true }) // step 2
        .mockResolvedValueOnce({
          // step 12 — post-commit re-read
          result_id: resultId,
          innovation_use_level_id: 6,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 5 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 6, level: 5 });
      mockResultActors.find.mockResolvedValueOnce([
        {
          result_actors_id: 1,
          actor_type_id: 1,
          sex_age_disaggregation_not_apply: true,
          actors_count: 4,
        },
      ]);
      mockResultInstitutionTypes.find.mockResolvedValueOnce([
        { result_institution_type_id: 9 },
      ]);
      mockResultQuantifications.findByResultIdAndRoles.mockResolvedValueOnce([
        { id: 1, quantification_number: 3, unit: 'ha' },
      ]);

      const out = await service.update(resultId, dto);

      // Steps 6–10, each threaded with the SAME transaction manager (DD-10).
      expect(fakeManager.getRepository).toHaveBeenCalledWith(
        ResultInnovationUse,
      );
      expect(managerUpdate).toHaveBeenCalledWith(
        resultId,
        expect.objectContaining({
          innovation_use_level_id: 6,
          updated_by: 1,
        }),
      );
      expect(mockResultActors.customSaveInnovationUse).toHaveBeenCalledWith(
        resultId,
        dto.actors,
        fakeManager,
      );
      expect(
        mockResultInstitutionTypes.customSaveInnovationUse,
      ).toHaveBeenCalledWith(resultId, dto.organizations, fakeManager);
      expect(
        mockResultQuantifications.upsertByCompositeKeys,
      ).toHaveBeenCalledWith(
        resultId,
        dto.quantifications,
        ['quantification_number', 'unit', 'description'],
        QuantificationRolesEnum.INNOVATION_USE,
        fakeManager,
      );
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        resultId,
        fakeManager,
      );

      // The update statement carries `audit(UPDATE)`, never `audit(BOTH)` —
      // pinned by exact call, not merely by the resulting shape, so a
      // regression to `audit(BOTH)` (which would also clobber `created_by`)
      // cannot hide behind `managerUpdate`'s `objectContaining` check above
      // (fold-in, T-06 attempt 2).
      expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.UPDATE);

      // Ordering (Part B.1, T-06 attempt 2). Two checks, because one alone
      // cannot tell "after the callback resolves" from "after transaction()
      // was merely called" — the double previously resolved its callback
      // inline and never modelled `COMMIT`:
      //  (a) the re-read's call order is after `transaction()`'s own
      //      invocation order — necessary, not sufficient;
      //  (b) at the instant the callback itself resolved, `mainFindOne` had
      //      been called exactly ONCE (step 2's existence check) —
      //      `postCommitFindOneCallsAtCommit` is captured before the real
      //      re-read (which happens only once `transaction()` resolves) can
      //      have run. A mutation moving the re-read inside the callback
      //      leaves (a) untouched but inflates (b) to 2.
      const transactionCallOrder = transaction.mock.invocationCallOrder[0];
      const postCommitReadOrder = mainFindOne.mock.invocationCallOrder[1];
      expect(postCommitReadOrder).toBeGreaterThan(transactionCallOrder);
      expect(postCommitFindOneCallsAtCommit).toBe(1);

      // AC.4 — response is the post-commit re-read, never the request body.
      expect(out.innovation_use_level_id).toBe(6);
      expect(out.innovation_use_level).toBe(5);
      expect(out.actors[0]).toMatchObject({
        result_actors_id: 1,
        actor_type_id: 1,
        total: 4,
      });
      expect(out.organizations).toEqual([{ result_institution_type_id: 9 }]);
      expect(out.quantifications).toEqual([
        { id: 1, quantification_number: 3, unit: 'ha' },
      ]);
    });
  });

  /**
   * T-06 (`docs/specs/innovation-use/link-innovation-dev`; R-IUL-001,
   * R-IUL-005, R-IUL-006, R-IUL-008; `design.md` §5.1 step 4c / step 9b,
   * §3.2, DD-2, DD-3, DD-4). Every row of `tasks.md`'s T-06 clause table
   * owns exactly one assertion below.
   *
   * **Cannot prove (tasks.md).** `_linkResultsService.create` is mocked in
   * this file, so the reactivation and single-active-row properties cannot
   * be observed against a real database here — that DB truth rides on
   * `create`'s own already-tested behavior (`base-service.ts`, per §3.2)
   * plus T-03's fixture harness. The two R-IUL-001 tests below assert only
   * the call arguments this service passes to `create`, never a row count
   * or a persisted `link_result_id`.
   */
  describe('update — Innovation Dev link (design.md §5.1 step 4c / step 9b, R-IUL-001/005/006/008)', () => {
    const resultId = 42;
    const linkedResultId = 500;

    const postCommitReadRow = {
      result_id: resultId,
      innovation_use_level_id: null,
      innovation_use_level_explanation: null,
      innovation_use_level: null,
    };

    // R-IUL-005 `AND IT MUST thread the manager`.
    it('threads the transaction manager into the link write, never undefined', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true }) // step 2
        .mockResolvedValueOnce(postCommitReadRow); // step 12

      await expect(
        service.update(resultId, {
          innovation_dev_result_id: linkedResultId,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(mockLinkResultsCreate).toHaveBeenCalledWith(
        resultId,
        [{ other_result_id: linkedResultId }],
        'other_result_id',
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
        fakeManager,
      );
      // Pinned separately: the 5th positional argument is the real
      // manager, not `undefined` — the exact OICR-style defect DD-10 names.
      expect(mockLinkResultsCreate.mock.calls[0][4]).toBe(fakeManager);
    });

    // R-IUL-006 `AND IT MUST validate before BEGIN`.
    it('an invalid link target is rejected before BEGIN — dataSource.transaction is never entered', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      }); // step 2 only
      mockFilterResultByIndicators.mockResolvedValueOnce([]); // empty = not a valid target

      await expect(
        service.update(resultId, {
          innovation_dev_result_id: 999,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

      expect(transaction).not.toHaveBeenCalled();
      expect(mockLinkResultsCreate).not.toHaveBeenCalled();
    });

    // R-IUL-006 `BUT must NOT report success with the link dropped`.
    it('an invalid link target fails with 400, never 200', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      mockFilterResultByIndicators.mockResolvedValueOnce([]);

      let caught: BadRequestException | undefined;
      try {
        await service.update(resultId, {
          innovation_dev_result_id: 999,
        } as CreateResultInnovationUseDto);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect(caught.getStatus()).toBe(400);
    });

    // R-IUL-008 omitted.
    it('an omitted key does not call create at all — the stored link survives untouched', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);

      await expect(
        service.update(resultId, {} as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(mockLinkResultsCreate).not.toHaveBeenCalled();
      // The omitted key also skips step 4c's validation entirely — there is
      // no target to validate.
      expect(mockFilterResultByIndicators).not.toHaveBeenCalled();
    });

    // R-IUL-008 explicit null.
    it('an explicit null calls create with an empty array — deactivates all', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);

      await expect(
        service.update(resultId, {
          innovation_dev_result_id: null,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(mockLinkResultsCreate).toHaveBeenCalledWith(
        resultId,
        [],
        'other_result_id',
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
        fakeManager,
      );
      // Explicit null is a clear signal, not a target — step 4c must not
      // run its DB validation for it either.
      expect(mockFilterResultByIndicators).not.toHaveBeenCalled();
    });

    // R-IUL-001 reactivation (call-argument level only — see the describe
    // block's doc comment on "Cannot prove").
    it("clearing A then re-selecting A reaches `create` with the same generalCompareKey and role both times, so create's own tested reactivation applies (R-IUL-001 reactivation)", async () => {
      const resultA = 700;

      // Call 1 — clear A.
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);
      await service.update(resultId, {
        innovation_dev_result_id: null,
      } as CreateResultInnovationUseDto);

      expect(mockLinkResultsCreate).toHaveBeenNthCalledWith(
        1,
        resultId,
        [],
        'other_result_id',
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
        fakeManager,
      );

      // Call 2 — re-select A.
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);
      await service.update(resultId, {
        innovation_dev_result_id: resultA,
      } as CreateResultInnovationUseDto);

      expect(mockLinkResultsCreate).toHaveBeenNthCalledWith(
        2,
        resultId,
        [{ other_result_id: resultA }],
        'other_result_id',
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
        fakeManager,
      );
    });

    // R-IUL-001 other roles untouched (call-argument level only — see the
    // describe block's doc comment on "Cannot prove").
    it("the link write always carries role 5 (INNOVATION_USE_LINKED_DEV) — never a role that would let create's dataRole-scoped deactivation touch a role-4 row for the same result", async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);

      await service.update(resultId, {
        innovation_dev_result_id: linkedResultId,
      } as CreateResultInnovationUseDto);

      expect(mockLinkResultsCreate.mock.calls[0][3]).toBe(
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      );
      expect(mockLinkResultsCreate.mock.calls[0][3]).not.toBe(
        LinkResultRolesEnum.LINK_RESULT_SECTION, // role 4
      );
    });

    // Not a table row, but the step 4c call-shape itself (R-IUL-006):
    // pins the exact real signature so a future signature change is caught
    // here rather than silently degrading the validation.
    it('validates the target via filterResultByIndicators([id], [INNOVATION_DEV], false)', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce(postCommitReadRow);

      await service.update(resultId, {
        innovation_dev_result_id: linkedResultId,
      } as CreateResultInnovationUseDto);

      expect(mockFilterResultByIndicators).toHaveBeenCalledWith(
        [linkedResultId],
        [IndicatorsEnum.INNOVATION_DEV],
        false,
      );
    });
  });

  describe('findOne — role-discriminated collection reads', () => {
    it('reads actors filtered by the INNOVATION_USE actor role', async () => {
      mainFindOne.mockResolvedValue(null);

      await service.findOne(7);

      expect(mockResultActors.find).toHaveBeenCalledWith(
        7,
        ActorRolesEnum.INNOVATION_USE,
      );
    });

    it('reads organizations filtered by the INNOVATION_USE institution-type role', async () => {
      mainFindOne.mockResolvedValue(null);

      await service.findOne(7);

      expect(mockResultInstitutionTypes.find).toHaveBeenCalledWith(
        7,
        InstitutionTypeRoleEnum.INNOVATION_USE,
      );
    });

    it('reads quantifications filtered by the INNOVATION_USE quantification role', async () => {
      mainFindOne.mockResolvedValue(null);

      await service.findOne(7);

      expect(
        mockResultQuantifications.findByResultIdAndRoles,
      ).toHaveBeenCalledWith(7, [QuantificationRolesEnum.INNOVATION_USE]);
    });
  });

  describe('findOne — empty children', () => {
    it('returns [] for all three collections and does not throw when the detail row has no children', async () => {
      mainFindOne.mockResolvedValue({
        result_id: 9,
        innovation_use_level_id: null,
        innovation_use_level: null,
        innovation_use_level_explanation: null,
      });
      mockResultActors.find.mockResolvedValue([]);
      mockResultInstitutionTypes.find.mockResolvedValue([]);
      mockResultQuantifications.findByResultIdAndRoles.mockResolvedValue([]);

      const result = await service.findOne(9);

      expect(result.actors).toEqual([]);
      expect(result.organizations).toEqual([]);
      expect(result.quantifications).toEqual([]);
    });
  });

  /**
   * T-07 (R-IUL-007, design.md §4.1/§5.2) — the fourth `Promise.all` entry.
   * `findAndDetails` itself is mocked, so "must not return a deactivated
   * link row" is asserted the way it is reachable from `findOne`'s
   * perspective: `findAndDetails` already filters `is_active` on the link
   * row (proven separately in `link-results.service.spec.ts`) and resolves
   * an empty array when the only row is deactivated — indistinguishable,
   * from here, from no link at all. What `findOne` owns is (a) calling
   * `findAndDetails` with the right role and (b) projecting that emptiness
   * to present-and-`null`, never absent.
   */
  describe('findOne — T-07 linked Innovation Dev (R-IUL-007)', () => {
    beforeEach(() => {
      mainFindOne.mockResolvedValue(null);
    });

    it('calls findAndDetails with the resultId and role 5 (INNOVATION_USE_LINKED_DEV), not another role', async () => {
      await service.findOne(9);

      expect(mockFindAndDetails).toHaveBeenCalledWith(
        9,
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      );
      expect(LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV).toBe(5);
    });

    it('returns both keys present-and-null when unlinked, never absent — asserted by key presence after JSON serialization (the actual wire shape), not by falsiness', async () => {
      mockFindAndDetails.mockResolvedValue([]);

      const result = await service.findOne(9);
      // `JSON.stringify` drops a key whose value is `undefined` but keeps
      // one whose value is `null` — this is the exact mechanism R-IUL-007
      // guards against, so the presence check has to run on the serialized
      // shape, not the in-memory object (where a bare `undefined` value is
      // still an "own" key).
      const wire = JSON.parse(JSON.stringify(result));

      expect('innovation_dev_result_id' in wire).toBe(true);
      expect('linked_innovation_dev' in wire).toBe(true);
      expect(wire.innovation_dev_result_id).toBeNull();
      expect(wire.linked_innovation_dev).toBeNull();
    });

    it('does not throw when unlinked — findOne resolves normally with an empty findAndDetails result', async () => {
      mockFindAndDetails.mockResolvedValue([]);

      await expect(service.findOne(9)).resolves.toEqual(
        expect.objectContaining({
          innovation_dev_result_id: null,
          linked_innovation_dev: null,
        }),
      );
    });

    it('does not surface a deactivated link row — an empty findAndDetails resolution (what a deactivated-only link row produces) projects to null, not a stale value', async () => {
      mockFindAndDetails.mockResolvedValue([]);

      const result = await service.findOne(9);

      expect(mockFindAndDetails).toHaveBeenCalledWith(
        9,
        LinkResultRolesEnum.INNOVATION_USE_LINKED_DEV,
      );
      expect(result.innovation_dev_result_id).toBeNull();
      expect(result.linked_innovation_dev).toBeNull();
    });

    it('still returns a link whose target is soft-deleted (design.md §5.2 — this is what makes C12 possible)', async () => {
      mockFindAndDetails.mockResolvedValue([
        {
          link_result_id: 501,
          result_id: 9,
          other_result_id: 284,
          other_result: {
            result_id: 284,
            result_official_code: 284,
            title: 'A soft-deleted Innovation Dev result',
            platform_code: 'STAR',
            is_active: false,
          },
        },
      ]);
      // T-02 — this scenario is about the four pre-existing sub-keys, not
      // about the three new facts, so `readInnovationDevCardFacts` (T-01) is
      // stubbed explicitly rather than left to fall through to the
      // QueryBuilder mock's shared, order-dependent default.
      jest
        .spyOn(
          service as unknown as {
            readInnovationDevCardFacts: (id: number) => Promise<unknown>;
          },
          'readInnovationDevCardFacts',
        )
        .mockResolvedValue({
          innovation_readiness: null,
          description: null,
          geo_scope: null,
        });

      const result = await service.findOne(9);

      expect(result.innovation_dev_result_id).toBe(284);
      expect(result.linked_innovation_dev).toEqual({
        result_id: 284,
        result_official_code: 284,
        title: 'A soft-deleted Innovation Dev result',
        platform_code: 'STAR',
        innovation_readiness: null,
        description: null,
        geo_scope: null,
      });
    });

    // Both nullable sub-keys are exercised by ONE stimulus: `results.title` is
    // `@Column('text', { nullable: true })` and `platform_code` a nullable
    // varchar, so each can arrive `undefined` and each must reach the wire as
    // `null` rather than be dropped by `JSON.stringify` (R-IUL-007). Covering
    // them together means deleting EITHER `?? null` reddens this test.
    it('coerces a platform_code AND a title that arrive undefined to null, never leaving either key absent from the wire shape', async () => {
      mockFindAndDetails.mockResolvedValue([
        {
          link_result_id: 502,
          result_id: 9,
          other_result_id: 285,
          other_result: {
            result_id: 285,
            result_official_code: 285,
            title: undefined,
            platform_code: undefined,
          },
        },
      ]);

      const result = await service.findOne(9);
      const wire = JSON.parse(JSON.stringify(result));

      expect('platform_code' in wire.linked_innovation_dev).toBe(true);
      expect(wire.linked_innovation_dev.platform_code).toBeNull();
      expect('title' in wire.linked_innovation_dev).toBe(true);
      expect(wire.linked_innovation_dev.title).toBeNull();
    });
  });

  /**
   * `docs/specs/innovation-use/dev-card-details` T-02 (`design.md` §4.1,
   * §5.2; `R-IUC-001`, `R-IUC-002`, `R-IUC-006`; `DC-1`, `DC-3`). Wires T-01's
   * private `readInnovationDevCardFacts` into `findOne`'s
   * `linked_innovation_dev`. `readInnovationDevCardFacts` itself is spied at
   * the instance (it stays private) rather than re-exercised — its own 9
   * acceptance criteria are covered by the describe block below this one;
   * this block owns only the wiring: which id it is called with, whether it
   * is called at all, and that the four pre-existing sub-keys survive
   * untouched.
   */
  describe('findOne — T-02 wiring the three Innovation Dev card facts into linked_innovation_dev', () => {
    const sectionResultId = 9;
    const linkedOtherResultId = 500;

    const linkRow = {
      link_result_id: 501,
      result_id: sectionResultId,
      other_result_id: linkedOtherResultId,
      other_result: {
        result_id: linkedOtherResultId,
        result_official_code: 19707,
        title: 'STAR 19707 - Climate Information Services',
        platform_code: 'STAR',
      },
    };

    beforeEach(() => {
      mainFindOne.mockResolvedValue(null);
    });

    // Named falsifier (K-012, tasks.md T-02): two results whose readiness,
    // description and scope all differ — the Innovation Use result (keyed
    // by the section's own resultId, 9) at level 3, the linked Innovation
    // Dev result (keyed by other_result_id, 500) at level 7. If the
    // production code were changed to call
    // `readInnovationDevCardFacts(resultId)` instead of
    // `readInnovationDevCardFacts(innovationDevLink.other_result_id)`, this
    // spy would be invoked with 9, resolve to the level-3 facts, and the
    // `.level).toBe(7)` assertion below would go red. A single-result
    // fixture, or one where both ids resolved to the same values, could not
    // falsify this (DC-1's disqualifier, named in tasks.md).
    it("DC-1 — keys the read off other_result_id, never the section's own resultId: the level-7 linked facts appear, not the level-3 section-id facts", async () => {
      mockFindAndDetails.mockResolvedValue([linkRow]);
      const readCardFactsSpy = jest
        .spyOn(
          service as unknown as {
            readInnovationDevCardFacts: (id: number) => Promise<unknown>;
          },
          'readInnovationDevCardFacts',
        )
        .mockImplementation(async (id: number) => {
          if (id === sectionResultId) {
            return {
              innovation_readiness: { id: 1, level: 3, name: 'Piloted' },
              description: 'Innovation Use result description',
              geo_scope: { code: 1, name: 'National' },
            };
          }
          if (id === linkedOtherResultId) {
            return {
              innovation_readiness: { id: 2, level: 7, name: 'Widely used' },
              description: 'Innovation Dev result description',
              geo_scope: { code: 2, name: 'Regional' },
            };
          }
          throw new Error(`unexpected id ${id}`);
        });

      const result = await service.findOne(sectionResultId);

      expect(readCardFactsSpy).toHaveBeenCalledWith(linkedOtherResultId);
      expect(readCardFactsSpy).not.toHaveBeenCalledWith(sectionResultId);
      expect(result.linked_innovation_dev.innovation_readiness).toEqual({
        id: 2,
        level: 7,
        name: 'Widely used',
      });
      expect(result.linked_innovation_dev.description).toBe(
        'Innovation Dev result description',
      );
      expect(result.linked_innovation_dev.geo_scope).toEqual({
        code: 2,
        name: 'Regional',
      });
    });

    it('DC-3 — the four pre-existing sub-keys are unchanged in name, type and null semantics, alongside the three new facts', async () => {
      mockFindAndDetails.mockResolvedValue([linkRow]);
      jest
        .spyOn(
          service as unknown as {
            readInnovationDevCardFacts: (id: number) => Promise<unknown>;
          },
          'readInnovationDevCardFacts',
        )
        .mockResolvedValue({
          innovation_readiness: { id: 2, level: 7, name: 'Widely used' },
          description: 'A description',
          geo_scope: { code: 2, name: 'Regional' },
        });

      const result = await service.findOne(sectionResultId);

      expect(result.linked_innovation_dev).toEqual({
        result_id: linkedOtherResultId,
        result_official_code: 19707,
        title: 'STAR 19707 - Climate Information Services',
        platform_code: 'STAR',
        innovation_readiness: { id: 2, level: 7, name: 'Widely used' },
        description: 'A description',
        geo_scope: { code: 2, name: 'Regional' },
      });
    });

    it('with no link, linked_innovation_dev stays null (not an object of nulls) and readInnovationDevCardFacts is NOT invoked at all', async () => {
      mockFindAndDetails.mockResolvedValue([]);
      const readCardFactsSpy = jest.spyOn(
        service as unknown as {
          readInnovationDevCardFacts: (id: number) => Promise<unknown>;
        },
        'readInnovationDevCardFacts',
      );

      const result = await service.findOne(sectionResultId);

      expect(result.linked_innovation_dev).toBeNull();
      expect(readCardFactsSpy).not.toHaveBeenCalled();
    });

    it('with a link, readInnovationDevCardFacts is invoked at most once per read', async () => {
      mockFindAndDetails.mockResolvedValue([linkRow]);
      const readCardFactsSpy = jest
        .spyOn(
          service as unknown as {
            readInnovationDevCardFacts: (id: number) => Promise<unknown>;
          },
          'readInnovationDevCardFacts',
        )
        .mockResolvedValue({
          innovation_readiness: null,
          description: null,
          geo_scope: null,
        });

      await service.findOne(sectionResultId);

      expect(readCardFactsSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne — DD-9 level resolution', () => {
    it('exposes the resolved level scalar via the catalog relation join, not the whole catalog object', async () => {
      mainFindOne.mockResolvedValue({
        result_id: 9,
        innovation_use_level_id: 7,
        innovation_use_level_explanation: 'because reasons',
        innovation_use_level: {
          id: 7,
          level: 6,
          name: 'Widely used',
          definition: 'A long definition text',
        },
      });

      const result = await service.findOne(9);

      expect(result.innovation_use_level_id).toBe(7);
      expect(result.innovation_use_level).toBe(6);
      expect(mainFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { innovation_use_level: true },
        }),
      );
    });

    it('returns null for the level scalar when no level has been selected', async () => {
      mainFindOne.mockResolvedValue({
        result_id: 9,
        innovation_use_level_id: null,
        innovation_use_level: null,
        innovation_use_level_explanation: null,
      });

      const result = await service.findOne(9);

      expect(result.innovation_use_level_id).toBeNull();
      expect(result.innovation_use_level).toBeNull();
    });
  });

  describe('findOne — unit passthrough (R-IUA-008 AC.4)', () => {
    it('returns the quantification unit verbatim, with no catalog lookup', async () => {
      mainFindOne.mockResolvedValue(null);
      mockResultQuantifications.findByResultIdAndRoles.mockResolvedValue([
        { id: 1, quantification_number: 5, unit: 'hectares', description: 'd' },
      ]);

      const result = await service.findOne(9);

      expect(result.quantifications).toEqual([
        { id: 1, quantification_number: 5, unit: 'hectares', description: 'd' },
      ]);
    });
  });

  describe('findOne — actor total derivation (design.md §5.5)', () => {
    it('case 1: aggregate mode — total equals actors_count', async () => {
      mainFindOne.mockResolvedValue(null);
      mockResultActors.find.mockResolvedValue([
        {
          result_actors_id: 1,
          sex_age_disaggregation_not_apply: true,
          actors_count: 15,
          women_youth_count: null,
          women_not_youth_count: null,
          men_youth_count: null,
          men_not_youth_count: null,
        },
      ]);

      const result = await service.findOne(9);

      expect(result.actors[0].total).toBe(15);
    });

    it('case 2: disaggregated mode with some counts — total is the sum, NULL treated as absent', async () => {
      mainFindOne.mockResolvedValue(null);
      mockResultActors.find.mockResolvedValue([
        {
          result_actors_id: 2,
          sex_age_disaggregation_not_apply: false,
          actors_count: null,
          women_youth_count: 2,
          women_not_youth_count: 3,
          men_youth_count: 4,
          men_not_youth_count: 1,
        },
      ]);

      const result = await service.findOne(9);

      // R-IUA-004 scenario "A client-supplied total is not trusted" worked
      // example: counts 2, 3, 4, 1 → total 10, regardless of any client-sent
      // total (which never reaches this layer — total is not a DTO field).
      expect(result.actors[0].total).toBe(10);
    });

    it('case 3 (THE TRAP): disaggregated mode with all four counts NULL — total is null, never 0', async () => {
      mainFindOne.mockResolvedValue(null);
      mockResultActors.find.mockResolvedValue([
        {
          result_actors_id: 3,
          sex_age_disaggregation_not_apply: false,
          actors_count: null,
          women_youth_count: null,
          women_not_youth_count: null,
          men_youth_count: null,
          men_not_youth_count: null,
        },
      ]);

      const result = await service.findOne(9);

      expect(result.actors[0].total).toBeNull();
      expect(result.actors[0].total).not.toBe(0);
    });

    it('classifies the mode by === true, not truthiness, on a non-boolean truthy flag', async () => {
      mainFindOne.mockResolvedValue(null);
      mockResultActors.find.mockResolvedValue([
        {
          result_actors_id: 4,
          // a row written before the write-side strict-boolean fix (T-03),
          // or by any other path, can still hold a truthy non-boolean here
          sex_age_disaggregation_not_apply: 1 as unknown as boolean,
          actors_count: null,
          women_youth_count: 6,
          women_not_youth_count: null,
          men_youth_count: null,
          men_not_youth_count: null,
        },
      ]);

      const result = await service.findOne(9);

      // `1 === true` is false, so this must be classified disaggregated and
      // sum the populated count rather than reading `actors_count` (null).
      expect(result.actors[0].total).toBe(6);
    });
  });

  // FAIL-2 remediation (`design.md` §9 Observability,
  // `validation-report.md` 2026-08-20). §9 carries no requirement id, so
  // these are grouped by the design section rather than an R-IUA-xxx id.
  // Each test targets one of the four rejection sites this closure
  // instruments in `result-innovation-use.service.ts`, and each also proves
  // the "never the payload" constraint by asserting a submitted value is
  // ABSENT from the logged message.
  describe('§9 Observability — warn on a rejected save, result_id and rule only, never the payload', () => {
    const resultId = 42;

    it('logs a warn with result_id and the rule when no detail row exists (NotFoundException)', async () => {
      mainFindOne.mockResolvedValueOnce(null);

      await expect(
        service.update(resultId, {} as CreateResultInnovationUseDto),
      ).rejects.toThrow(NotFoundException);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = loggerWarnSpy.mock.calls[0];
      expect(message).toEqual(expect.stringContaining(String(resultId)));
    });

    it('logs a warn with result_id and the rule when innovation_use_level_id resolves to no catalog row — the submitted level id is NOT in the message', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce(null);
      const unknownLevelId = 999888;

      await expect(
        service.update(resultId, {
          innovation_use_level_id: unknownLevelId,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = loggerWarnSpy.mock.calls[0];
      expect(message).toEqual(expect.stringContaining(String(resultId)));
      expect(message).toEqual(
        expect.stringContaining('innovation_use_level_id'),
      );
      // Payload-leak guard: the submitted (unknown) id itself never appears.
      expect(message).not.toEqual(
        expect.stringContaining(String(unknownLevelId)),
      );
    });

    // T-01 (docs/specs/bugfix/innovation-use-draft-save): R-IUA-006's
    // save-time guard and its warn call are deleted — there is no rejection
    // and no warn left to log for this case. Inverted to the positive
    // counterpart already established by "does NOT log a warn on a
    // successful save" below, but pinned to this exact former rejection
    // site (level >= 6, blank justification) rather than the generic case.
    it('does NOT log a warn when a level >= 6 justification is blank — R-IUA-006 and its warn call were deleted by T-01; the save now proceeds silently to BEGIN', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: 7,
          innovation_use_level_explanation: null,
          innovation_use_level: { level: 6 },
        });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('logs a warn with result_id and R-IUA-005 when two actor rows share an identity — the actor_type_id / custom name are NOT in the message even though the thrown exception does carry them', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      const secretCustomName = 'SECRET_CUSTOM_ORG_NAME_NOT_TO_BE_LOGGED';

      const dto = {
        actors: [
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: secretCustomName,
          },
          {
            actor_type_id: ClarisaActorTypesEnum.OTHER,
            actor_type_custom_name: secretCustomName,
          },
        ],
      } as CreateResultInnovationUseDto;

      await expect(service.update(resultId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = loggerWarnSpy.mock.calls[0];
      expect(message).toEqual(expect.stringContaining(String(resultId)));
      expect(message).toEqual(expect.stringContaining('R-IUA-005'));
      // Payload-leak guard: the custom name reaches the thrown exception's
      // message array (client-facing 400), never the log.
      expect(message).not.toEqual(expect.stringContaining(secretCustomName));
    });

    it('does NOT log a warn on a successful save', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: resultId, is_active: true })
        .mockResolvedValueOnce({
          result_id: resultId,
          innovation_use_level_id: null,
          innovation_use_level_explanation: null,
          innovation_use_level: null,
        });

      await expect(
        service.update(resultId, {} as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * `docs/specs/innovation-use/dev-card-details` T-01 —
   * `readInnovationDevCardFacts`'s 9 acceptance criteria. The method is
   * private (not yet wired into `findOne` — that is T-02's scope), so it is
   * invoked here via bracket-notation cast, the standard way this repo
   * reaches a private method under test.
   *
   * **What this describe block CANNOT prove (`NFR-IUC-001`'s disqualifier,
   * `design.md` §11 limit 3).** `resultQueryBuilder` above is a plain mock:
   * `getOne` returns whatever fixture object each `it` hands it, so these
   * tests prove the METHOD'S OWN branching (the `[0] ?? null`, the
   * `hasReadiness` guard, the `?? null` projections) given a shape the join
   * COULD produce — never that the real `QueryBuilder` produces that shape,
   * and never the emitted SQL. The `is_active`-in-`ON`-not-`WHERE`
   * assertion at the end of this block is a call-argument check on the
   * mocked builder, which is evidence the method CALLS `leftJoinAndSelect`
   * correctly — not evidence of what MySQL receives. `DC-14`'s real gate is
   * `innovation-dev-card-facts.fixture-spec.ts` (`test:fixtures`), against
   * a REAL `getQuery()` over a REAL connection — see that file.
   */
  describe('readInnovationDevCardFacts (T-01 shared read, dev-card-details)', () => {
    const resultId = 900;

    it('AC.1 — active detail row + readiness present: all three facts return', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: 'A digital advisory service.',
        geo_scope: { code: 2, name: 'Regional' },
        result_innovation_dev: [
          {
            result_id: resultId,
            innovation_readiness_id: 7,
            innovationReadiness: { id: 7, level: 7, name: 'Widely used' },
          },
        ],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts).toEqual({
        innovation_readiness: { id: 7, level: 7, name: 'Widely used' },
        description: 'A digital advisory service.',
        geo_scope: { code: 2, name: 'Regional' },
      });
    });

    it('AC.2 — no detail row at all: readiness is null, description and geo_scope still return', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: 'Still returned.',
        geo_scope: { code: 2, name: 'Regional' },
        result_innovation_dev: [],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.innovation_readiness).toBeNull();
      expect(facts.description).toBe('Still returned.');
      expect(facts.geo_scope).toEqual({ code: 2, name: 'Regional' });
    });

    it('AC.3 — a detail row exists but is_active = FALSE: same as no row (the ON-clause join already excludes it, so it never reaches `result_innovation_dev`)', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: 'Still returned.',
        geo_scope: null,
        // What the ON-clause join produces for an inactive detail row: the
        // parent survives, the child array is empty — indistinguishable
        // from AC.2 from this method's perspective, which is the point of
        // DD-3/DD-4.
        result_innovation_dev: [],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.innovation_readiness).toBeNull();
      expect(facts.description).toBe('Still returned.');
    });

    it('AC.4 — innovation_readiness_id is NULL on the detail row: innovation_readiness is null', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: null,
        geo_scope: null,
        result_innovation_dev: [
          {
            result_id: resultId,
            innovation_readiness_id: null,
            innovationReadiness: null,
          },
        ],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.innovation_readiness).toBeNull();
    });

    it('AC.5 — level NULL, name present: the object returns with level: null — NOT collapsed to a bare null (DD-9)', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: null,
        geo_scope: null,
        result_innovation_dev: [
          {
            result_id: resultId,
            innovation_readiness_id: 9,
            innovationReadiness: { id: 9, level: null, name: 'Piloted' },
          },
        ],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.innovation_readiness).toEqual({
        id: 9,
        level: null,
        name: 'Piloted',
      });
    });

    it("AC.6 — description NULL: the key is null, never ''", async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: null,
        geo_scope: null,
        result_innovation_dev: [],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.description).toBeNull();
      expect(facts.description).not.toBe('');
    });

    it("AC.7 — geo_scope_id = 50 (THIS_IS_YET_TO_BE_DETERMINED): that scope's CLARISA name returns like any other, not suppressed as a sentinel", async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: null,
        geo_scope: { code: 50, name: 'This is yet to be determined' },
        result_innovation_dev: [],
      });

      const facts = await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(facts.geo_scope).toEqual({
        code: 50,
        name: 'This is yet to be determined',
      });
    });

    it('AC.8 — a non-existent target id: all three facts are null and nothing throws', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce(undefined);

      await expect(
        (
          service as unknown as {
            readInnovationDevCardFacts: (
              id: number,
            ) => Promise<Record<string, unknown>>;
          }
        ).readInnovationDevCardFacts(999999),
      ).resolves.toEqual({
        innovation_readiness: null,
        description: null,
        geo_scope: null,
      });
    });

    it('AC.9 (design-conformance only — the real gate is the fixtures-tier getQuery() assertion) — the is_active predicate is attached to the leftJoinAndSelect ON-clause argument, and where() carries only the parent id, never is_active', async () => {
      resultQueryBuilderGetOne.mockResolvedValueOnce({
        result_id: resultId,
        description: null,
        geo_scope: null,
        result_innovation_dev: [],
      });

      await (
        service as unknown as {
          readInnovationDevCardFacts: (
            id: number,
          ) => Promise<Record<string, unknown>>;
        }
      ).readInnovationDevCardFacts(resultId);

      expect(resultQueryBuilderLeftJoinAndSelect).toHaveBeenCalledWith(
        'result.result_innovation_dev',
        'detail',
        'detail.is_active = :isActive',
        { isActive: true },
      );
      expect(resultQueryBuilderWhere).toHaveBeenCalledWith(
        'result.result_id = :resultId',
        { resultId },
      );
      // The where() call carries no is_active reference at all.
      const whereArgs = resultQueryBuilderWhere.mock.calls[0];
      expect(JSON.stringify(whereArgs)).not.toContain('is_active');
    });
  });
});
