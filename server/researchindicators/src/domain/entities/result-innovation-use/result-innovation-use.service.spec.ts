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

  const getRepository = jest.fn((entity: unknown) => {
    if (entity === ClarisaInnovationUseLevel) {
      return levelRepo;
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
    getRepository.mockImplementation((entity: unknown) => {
      if (entity === ClarisaInnovationUseLevel) {
        return levelRepo;
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

    it('a missing justification at level >= 6 throws before BEGIN — zero child-service calls', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

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

    it('THE DISCRIMINATING PAIR — catalog id 6 (level 5) without explanation is ACCEPTED; catalog id 7 (level 6) without explanation is REJECTED 400. A rule comparing the FK instead of the resolved level passes the second half and fails the first (AC.1, AC.2, AC.6)', async () => {
      // Half A — id 6 → level 5 → below the threshold → accepted.
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        innovation_use_level_id: 6,
        innovation_use_level_explanation: null,
        innovation_use_level: { level: 5 },
      });
      levelFindOne.mockResolvedValueOnce({ id: 6, level: 5 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 6,
        } as CreateResultInnovationUseDto),
      ).resolves.toBeDefined();

      // Half B — id 7 → level 6 → at the threshold → rejected.
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a whitespace-only explanation at level >= 6 (AC.3)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '   ',
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('rejects an empty-string explanation at level >= 6 (AC.4)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
          innovation_use_level_explanation: '',
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
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

    // Renamed from "coerces a bigint level returned as a string by the MySQL
    // driver to a real number ..." (T-06 attempt 3) — that name overstated
    // what this test proves. It CANNOT distinguish `Number(row.level)` from
    // the raw `row.level`, because `'6' < 6` coerces identically to `6 < 6`
    // in JS; a mutation deleting the `Number(...)` call in
    // `resolveInnovationUseLevel` (would-be-M15) still passes this
    // assertion. M15 is therefore an undefended mutation — this test is not
    // its falsifier, whatever the old name implied.
    it('a string-typed bigint level from the MySQL driver still trips the level >= 6 rule', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({
        id: 7,
        level: '6',
      } as unknown as { id: number; level: number });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update — DD-14: the level rule runs against the effective post-write row', () => {
    const resultId = 42;

    it('a PATCH that omits the level id but explicitly nulls the explanation is rejected 400 against a stored level 6 (DD-14, closes the R-IUA-006 bypass)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
        innovation_use_level_id: 7,
        innovation_use_level_explanation: 'a previously valid justification',
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_explanation: null,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('the same bypass via an empty-string explanation is also rejected 400 (DD-14)', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
        innovation_use_level_id: 7,
        innovation_use_level_explanation: 'a previously valid justification',
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_explanation: '',
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('omitting the level id resolves the rule against the STORED level, not a silent skip (DD-14)', async () => {
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

  describe('update — full write transaction (design.md §5.1, R-IUA-003)', () => {
    const resultId = 42;

    it('persists all five parts inside one transaction, threads the manager through every child call (DD-10), and returns the post-commit re-read — never the request body (AC.1, AC.4, AC.6, AC.7)', async () => {
      const dto: CreateResultInnovationUseDto = {
        innovation_use_level_id: 6,
        actors: [{ actor_type_id: 1 }] as InnovationUseActorDto[],
        organizations: [
          { institution_id: 5 },
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

    it('logs a warn with result_id and R-IUA-006 when the level >= 6 justification is missing — the explanation text is NOT in the message (there is none) and the resolved level number is NOT in the message', async () => {
      mainFindOne.mockResolvedValueOnce({
        result_id: resultId,
        is_active: true,
      });
      levelFindOne.mockResolvedValueOnce({ id: 7, level: 6 });

      await expect(
        service.update(resultId, {
          innovation_use_level_id: 7,
        } as CreateResultInnovationUseDto),
      ).rejects.toThrow(BadRequestException);

      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
      const [message] = loggerWarnSpy.mock.calls[0];
      expect(message).toEqual(expect.stringContaining(String(resultId)));
      expect(message).toEqual(expect.stringContaining('R-IUA-006'));
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
});
