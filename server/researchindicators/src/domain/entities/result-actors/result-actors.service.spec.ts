import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm';
import { ResultActorsService } from './result-actors.service';
import { ResultActor } from './entities/result-actor.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { InnovationUseActorDto } from '../result-innovation-use/dto/create-result-innovation-use.dto';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';

describe('ResultActorsService', () => {
  let service: ResultActorsService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    metadata: {
      primaryColumns: [{ propertyName: 'result_actors_id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = {
    user_id: 1,
    audit: jest.fn((set: SetAuditEnum) =>
      set === SetAuditEnum.NEW ? { created_by: 1 } : { updated_by: 1 },
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultActorsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultActorsService>(ResultActorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveInnovationDev', () => {
    it('should call create once for non-OTHER actors only', async () => {
      const manager = {} as EntityManager;
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue([] as any);

      const data = [
        { actor_type_id: 1, men_youth: false },
      ] as CreateResultActorDto[];

      await service.saveInnovationDev(10, data, manager);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(
        10,
        data,
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        expect.arrayContaining([
          'sex_age_disaggregation_not_apply',
          'men_youth',
          'men_not_youth',
          'women_youth',
          'women_not_youth',
        ]),
        undefined,
        [],
      );
      createSpy.mockRestore();
    });

    it('should create OTHER rows first then pass notDeleteIds to actors create', async () => {
      const manager = {} as EntityManager;
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValueOnce([{ result_actors_id: 99 } as ResultActor])
        .mockResolvedValueOnce([] as any);

      const data = [
        {
          actor_type_id: ClarisaActorTypesEnum.OTHER,
          actor_type_custom_name: 'Custom',
        },
        { actor_type_id: 2 },
      ] as CreateResultActorDto[];

      await service.saveInnovationDev(7, data, manager);

      expect(createSpy).toHaveBeenNthCalledWith(
        1,
        7,
        [data[0]],
        'actor_type_custom_name',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        expect.arrayContaining(['actor_type_id']),
      );
      expect(createSpy).toHaveBeenNthCalledWith(
        2,
        7,
        [data[1]],
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        expect.any(Array),
        undefined,
        [99],
      );
      createSpy.mockRestore();
    });
  });

  describe('customSaveInnovationDev', () => {
    it('should update soft-delete scope then save payload for existing ids', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const tempRepo = { findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 50,
        actor_type_id: 1,
        men_youth: true,
        men_not_youth: false,
        women_youth: false,
        women_not_youth: false,
        sex_age_disaggregation_not_apply: false,
      } as CreateResultActorDto;

      await service.customSaveInnovationDev(3, [row], manager);

      expect(manager.getRepository).toHaveBeenCalledWith(ResultActor);
      expect(update).toHaveBeenCalledWith(
        {
          result_id: 3,
          is_active: true,
          actor_role_id: ActorRolesEnum.INNOVATION_DEV,
        },
        { is_active: false },
      );
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 50,
            actor_role_id: ActorRolesEnum.INNOVATION_DEV,
            updated_by: 1,
          }),
        ]),
      );
    });
  });

  describe('customSaveInnovationUse', () => {
    it('deactivates by the role-scoped predicate — the R-IUA-009 AC.4 falsifying input is removing actor_role_id from this object', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation (2026-08-20): `customSaveInnovationUse` now runs
      // `assertInnovationUseOwnership` first, which calls `tempRepo.find(...)`
      // to confirm a submitted `result_actors_id` belongs to this
      // `(result_id, role)` before proceeding. Resolving a matching row here
      // simulates ownership being confirmed, so the id-present branch below
      // still executes as it did before the fix.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 50 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 50,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 2,
        women_not_youth_count: 1,
        men_youth_count: 3,
        men_not_youth_count: 0,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(manager.getRepository).toHaveBeenCalledWith(ResultActor);
      // R-IUA-009 AC.4 / T-03's named falsifying input: dropping `actor_role_id`
      // from this predicate silently deactivates another indicator's rows.
      expect(update).toHaveBeenCalledWith(
        {
          result_id: 3,
          is_active: true,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
        },
        { is_active: false },
      );
    });

    it('soft-deletes only — is_active: false, never a hard delete (R-IUA-003 scenario)', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // Faithful double: a real Repository<ResultActor> carries delete/remove/
      // softDelete, so asserting they exist-and-were-not-called is falsifiable
      // against a future hard-delete edit — unlike re-reading the test's own
      // fixture shape, which can never disagree with the production code.
      const del = jest.fn();
      const remove = jest.fn();
      const softDelete = jest.fn();
      const tempRepo = {
        findOne: jest.fn(),
        update,
        save,
        delete: del,
        remove,
        softDelete,
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      // One row, not an empty array: a `delete`/`remove`/`softDelete` call
      // placed inside the per-row loop body (rather than the post-loop
      // deactivation predicate) would never execute — and therefore never be
      // caught by this test — against an empty `data` array.
      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(update).toHaveBeenCalledWith(expect.anything(), {
        is_active: false,
      });
      expect(del).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('aggregate mode (sex_age_disaggregation_not_apply === true) writes actors_count and nulls the four disaggregated columns, on the update-path', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 50 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 50,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 12,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 50,
            is_active: true,
            actors_count: 12,
            women_youth_count: null,
            women_not_youth_count: null,
            men_youth_count: null,
            men_not_youth_count: null,
          }),
        ]),
      );
    });

    it('disaggregated mode (sex_age_disaggregation_not_apply falsy) writes the four counts and nulls actors_count, on the update-path', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 51 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 51,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 2,
        women_not_youth_count: 1,
        men_youth_count: 3,
        men_not_youth_count: 0,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 51,
            is_active: true,
            actors_count: null,
            women_youth_count: 2,
            women_not_youth_count: 1,
            men_youth_count: 3,
            men_not_youth_count: 0,
          }),
        ]),
      );
    });

    it('treats a truthy-but-not-true sex_age_disaggregation_not_apply (e.g. 1) as disaggregated, never as aggregate', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 52 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 52,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: 1 as unknown as boolean,
        women_youth_count: 5,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 52,
            actors_count: null,
            women_youth_count: 5,
          }),
        ]),
      );
    });

    it('keeps actor_type_custom_name only when actor_type_id is OTHER, nulling it otherwise, on the update-path', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      // Both rows below carry a `result_actors_id`, so both must resolve as
      // owned.
      const find = jest
        .fn()
        .mockResolvedValue([
          { result_actors_id: 60 },
          { result_actors_id: 61 },
        ]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const rows = [
        {
          result_actors_id: 60,
          actor_type_id: ClarisaActorTypesEnum.OTHER,
          actor_type_custom_name: 'Custom actor',
          sex_age_disaggregation_not_apply: true,
          actors_count: 4,
        },
        {
          result_actors_id: 61,
          actor_type_id: 1,
          actor_type_custom_name: 'ignored for non-OTHER',
          sex_age_disaggregation_not_apply: true,
          actors_count: 7,
        },
      ] as InnovationUseActorDto[];

      await service.customSaveInnovationUse(3, rows, manager);

      expect(save.mock.calls[0][0]).toHaveLength(2);
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 60,
            is_active: true,
            actor_type_custom_name: 'Custom actor',
          }),
          expect.objectContaining({
            result_actors_id: 61,
            is_active: true,
            actor_type_custom_name: null,
          }),
        ]),
      );
    });

    it('populates audit fields via CurrentUserUtil on the update path (existing result_actors_id)', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 70 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 70,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.UPDATE);
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 70,
            is_active: true,
            updated_by: 1,
          }),
        ]),
      );
    });

    it('regression: an update-path row with NO sex_age_disaggregation_not_apply key writes the flag as false (never undefined), consistent with the disaggregated counts it also writes — a stale-TRUE flag from a prior aggregate save would otherwise survive untouched and desync from innovation_use_validation', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      // FAIL-1 remediation: ownership check — see comment on the first test.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 80 }]);
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      // No `sex_age_disaggregation_not_apply` key at all — legal, the DTO
      // field is `@IsOptional()` with no `@IsBoolean()`. The row carries a
      // disaggregated count, matching the mode resolveInnovationUseCounts
      // derives when the flag is not `=== true`.
      const row = {
        result_actors_id: 80,
        actor_type_id: 1,
        women_youth_count: 4,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 80,
            sex_age_disaggregation_not_apply: false,
            actors_count: null,
            women_youth_count: 4,
          }),
        ]),
      );
    });

    it('populates audit fields via CurrentUserUtil on the insert path (no result_actors_id), role-scopes the lookup where-clause, and writes the full normalised aggregate-mode payload', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 9,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 3,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          actor_type_id: 1,
          actor_type_custom_name: IsNull(),
        },
      });
      expect(mockCurrentUser.audit).toHaveBeenCalledWith(SetAuditEnum.NEW);
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_id: 3,
            actor_role_id: ActorRolesEnum.INNOVATION_USE,
            created_by: 1,
            is_active: true,
            actors_count: 9,
            women_youth_count: null,
            women_not_youth_count: null,
            men_youth_count: null,
            men_not_youth_count: null,
            sex_age_disaggregation_not_apply: true,
            actor_type_custom_name: null,
          }),
        ]),
      );
    });

    it('disaggregated mode on the insert path writes the four counts and nulls actors_count', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 2,
        women_not_youth_count: 1,
        men_youth_count: 3,
        men_not_youth_count: 0,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_id: 3,
            is_active: true,
            actors_count: null,
            women_youth_count: 2,
            women_not_youth_count: 1,
            men_youth_count: 3,
            men_not_youth_count: 0,
          }),
        ]),
      );
    });

    it('OTHER custom-name rule on the insert path: keeps the custom name for OTHER and role-scopes the OTHER branch of the lookup where-clause', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        actor_type_id: ClarisaActorTypesEnum.OTHER,
        actor_type_custom_name: 'Custom insert actor',
        sex_age_disaggregation_not_apply: true,
        actors_count: 3,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 3,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          actor_type_id: ClarisaActorTypesEnum.OTHER,
          actor_type_custom_name: 'Custom insert actor',
        },
      });
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_id: 3,
            is_active: true,
            actor_type_custom_name: 'Custom insert actor',
          }),
        ]),
      );
    });

    it('regression: an insert-path row with a truthy-but-not-boolean sex_age_disaggregation_not_apply (e.g. 1) writes the flag as false (never raw-truthy), consistent with the disaggregated counts it also writes — mirrors the update-path regression above; without this fix the insert path could persist sex_age_disaggregation_not_apply: TRUE alongside a populated disaggregated count and actors_count: null, which innovation_use_validation reads as a permanently-FALSE aggregate row', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      // No `result_actors_id` (insert path). The flag is truthy but not
      // strictly `true`, and the row carries a disaggregated count — the
      // insert path must normalise the flag with the same `=== true`
      // predicate the update path uses, not write it raw.
      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: 1 as unknown as boolean,
        women_youth_count: 6,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sex_age_disaggregation_not_apply: false,
            actors_count: null,
            women_youth_count: 6,
          }),
        ]),
      );
    });

    it('reuses the existing row id when the insert-path lookup finds one (existData branch)', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest.fn().mockResolvedValue([]);
      const findOne = jest.fn().mockResolvedValue({ result_actors_id: 88 });
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 5,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_actors_id: 88,
            is_active: true,
            actors_count: 5,
          }),
        ]),
      );
    });
  });

  // FAIL-1 remediation, attempt 2 (2026-08-20, `validation-report.md`).
  // Attempt 1 shipped `assertInnovationUseOwnership` proven only at the
  // fixture tier (needs a live MySQL container) — `npm test` alone never
  // exercised its throw branch. These tests close that gap directly against
  // this service, with no DB involved.
  describe('customSaveInnovationUse — assertInnovationUseOwnership (FAIL-1 remediation, attempt 2)', () => {
    it('rejects with BadRequestException carrying the design.md §4 error string, and persists nothing, when a submitted result_actors_id resolves to no owned row', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 999,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(3, [row], manager);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_actors_id: unknown or unauthorized actor row — 999',
      ]);
      // "Persists nothing in this method" made falsifiable, not narrated.
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    // Mutation-survivor pair. Unlike the test above (find() resolves an
    // unconditional value), `find` here re-implements real WHERE-clause
    // semantics against ONE seeded row: a condition present in the query
    // narrows the match; a condition ABSENT from the query (as it would be
    // if a future edit deleted it from `assertInnovationUseOwnership`)
    // matches unconditionally — mirroring how dropping a clause from a real
    // SQL WHERE widens the result set instead of narrowing it. Each test
    // seeds a row that fails exactly one of the two guard columns, so if
    // that column's condition is ever removed from the query, the row
    // wrongly resolves as owned, no exception is thrown, and
    // `.rejects.toThrow(...)` below fails — turning the falsification-table
    // finding in this task's report into something the suite re-proves.
    const buildRealisticFindMock = (seededRow: {
      result_actors_id: number;
      result_id: number;
      actor_role_id: ActorRolesEnum;
    }) =>
      jest.fn().mockImplementation(({ where }) => {
        const resultIdOk =
          !('result_id' in where) || where.result_id === seededRow.result_id;
        const roleOk =
          !('actor_role_id' in where) ||
          where.actor_role_id === seededRow.actor_role_id;
        return Promise.resolve(resultIdOk && roleOk ? [seededRow] : []);
      });

    it('mutation-survivor: a row belonging to a DIFFERENT result_id (correct role) is rejected — proves result_id is load-bearing in the ownership predicate', async () => {
      const find = buildRealisticFindMock({
        result_actors_id: 50,
        result_id: 999,
        actor_role_id: ActorRolesEnum.INNOVATION_USE,
      });
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 50,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;

      await expect(
        service.customSaveInnovationUse(3, [row], manager),
      ).rejects.toThrow(BadRequestException);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('mutation-survivor: a row belonging to the SAME result but a DIFFERENT role (Innovation Dev) is rejected — proves actor_role_id is load-bearing in the ownership predicate', async () => {
      const find = buildRealisticFindMock({
        result_actors_id: 51,
        result_id: 3,
        actor_role_id: ActorRolesEnum.INNOVATION_DEV,
      });
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        result_actors_id: 51,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;

      await expect(
        service.customSaveInnovationUse(3, [row], manager),
      ).rejects.toThrow(BadRequestException);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    // Rework attempt 3 (2026-08-20). `assertInnovationUseOwnership` derives
    // `idsPresent` straight off the raw payload (the identity-keyed-dedup
    // variant of this hazard is `result-institution-types.service.spec.ts`'s
    // "sees the RAW payload, not the deduplicated one (FAIL-B remediation)"
    // block; `ResultActorsService` has no such dedup). Without a
    // `[...new Set(...)]` on `idsPresent` itself, a payload that repeats the
    // SAME unauthorized id twice produced a `400` message listing it twice
    // (`— 999, 999`).
    //
    // **Superseded 2026-08-20 (item 1, the data-corruption defect closed
    // below by the duplicate-PK check).** This exact payload shape — the
    // same `result_actors_id` on two id-present rows — is now caught by
    // that NEW check BEFORE `assertInnovationUseOwnership` ever runs the
    // `find()` this test's mock stubs to `[]`. `expect(find).not.toHaveBeenCalled()`
    // below makes that ordering falsifiable: reverting the duplicate check
    // (or moving it after the `find()` call) sends this payload back
    // through the old unauthorized-row path, `find` gets called, and both
    // this assertion and the message assertion redden. The single-occurrence
    // guarantee this test always protected still holds — now backed by the
    // duplicate-PK message's own `Set`, not `idsPresent`'s.
    it('rejects two id-present rows sharing one result_actors_id as a duplicate-PK collision, naming it once, before the ownership check ever runs', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row1 = {
        result_actors_id: 999,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;
      const row2 = {
        result_actors_id: 999,
        actor_type_id: 2,
        sex_age_disaggregation_not_apply: true,
        actors_count: 2,
      } as InnovationUseActorDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(3, [row1, row2], manager);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_actors_id: same id submitted by more than one row — 999',
      ]);
      expect(find).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    // The actual reproduction shape for item 1's data-corruption defect
    // (Reviewer advisory, verified): unlike the test above, `50` genuinely
    // IS owned — `buildRealisticFindMock` (declared above in this describe
    // block) seeds a row scoped to `(result_id: 3, actor_role_id:
    // INNOVATION_USE)` that a real WHERE clause would match. Before this
    // fix, `assertInnovationUseOwnership`'s `idsPresent` counted id `50`
    // ONCE (`[...new Set(...)]`), found it genuinely owned, and returned
    // normally — the ownership check has nothing to reject when the id is
    // legitimately owned by both rows. `dataToSave` would then carry two
    // `Partial<ResultActor>` objects both keyed on `result_actors_id: 50`,
    // and `save()` below would never run in this test because the
    // assertion below expects it not to — the falsification for "what
    // happens if it did" lives in this task's report and the fixture file.
    it('rejects two id-present rows sharing one GENUINELY OWNED result_actors_id — the id-less fix does not cover this, since both rows already submit their own id', async () => {
      const find = buildRealisticFindMock({
        result_actors_id: 50,
        result_id: 3,
        actor_role_id: ActorRolesEnum.INNOVATION_USE,
      });
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = { find, findOne: jest.fn(), update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row1 = {
        result_actors_id: 50,
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 1,
      } as InnovationUseActorDto;
      const row2 = {
        result_actors_id: 50,
        actor_type_id: 2,
        sex_age_disaggregation_not_apply: true,
        actors_count: 2,
      } as InnovationUseActorDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(3, [row1, row2], manager);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_actors_id: same id submitted by more than one row — 50',
      ]);
      expect(find).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });
  });

  // PK-collision remediation (2026-08-20,
  // `test/fixtures/innovation-use/innovation-use-edit-plus-add-id-collision.fixture-spec.ts`).
  // Ordinary UI edit-plus-add: row 1 submits `result_actors_id` and a NEW
  // type; row 2 is id-less and submits the type row 1 is moving AWAY FROM —
  // exactly the type the seeded row still carries in the DB, since nothing
  // has been written yet when row 2's lookup runs.
  describe('customSaveInnovationUse — an id-less row must never adopt a PK another row in the same payload explicitly submitted (edit-plus-add PK collision fix)', () => {
    // Mutation-survivor: re-implements the real semantics of the id-less
    // lookup against ONE seeded row that still carries its ORIGINAL type —
    // the row row 1 is editing away from. `Not(In([...]))` on `findOne`'s
    // `where.result_actors_id` is what excludes it; remove that clause (the
    // reverted state) and this mock resolves the seeded row, reproducing the
    // exact collision the fixture proves.
    const buildRealisticFindOneMock = (seededRow: {
      result_actors_id: number;
      actor_type_id: number;
    }) =>
      jest.fn().mockImplementation(({ where }) => {
        const typeMatches = where.actor_type_id === seededRow.actor_type_id;
        const exclusion = where.result_actors_id as
          | { value?: unknown }
          | undefined;
        const excludedIds = Array.isArray(exclusion?.value)
          ? (exclusion.value as number[])
          : [];
        const isExcluded = excludedIds.includes(seededRow.result_actors_id);
        return Promise.resolve(typeMatches && !isExcluded ? seededRow : null);
      });

    it("excludes every explicitly-submitted result_actors_id from the id-less lookup, so the added row inserts as new instead of adopting the edited row's PK", async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest
        .fn()
        .mockImplementation((rows: unknown[]) => Promise.resolve(rows));
      // Ownership guard: row 1's submitted id genuinely belongs to this
      // (result_id, role) — untouched, unmocked-around, genuinely satisfied.
      const find = jest.fn().mockResolvedValue([{ result_actors_id: 50 }]);
      const findOne = buildRealisticFindOneMock({
        result_actors_id: 50,
        actor_type_id: 1,
      });
      const tempRepo = { find, findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const editedRow = {
        result_actors_id: 50,
        actor_type_id: 2,
        sex_age_disaggregation_not_apply: true,
        actors_count: 10,
      } as InnovationUseActorDto;
      const addedRow = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 20,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [editedRow, addedRow], manager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 3,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          actor_type_id: 1,
          actor_type_custom_name: IsNull(),
          result_actors_id: Not(In([50])),
        },
      });

      const savedRows = save.mock.calls[0][0] as Partial<ResultActor>[];
      expect(savedRows).toHaveLength(2);
      // Push order mirrors payload order (`editedRow` first, `addedRow`
      // second) regardless of whether the fix is present — the assertions
      // below are what distinguish fixed from reverted, not this indexing.
      const editedSaved = savedRows[0];
      const addedSaved = savedRows[1];
      expect(editedSaved).toMatchObject({
        result_actors_id: 50,
        actor_type_id: 2,
        actors_count: 10,
      });
      // The collision this fixture proves: without the fix, `addedSaved`
      // would carry `result_actors_id: 50` too, and `save()` would receive
      // two PK-keyed objects sharing one primary key instead of an
      // UPDATE plus an INSERT.
      expect(addedSaved.result_actors_id).toBeUndefined();
      expect(addedSaved).toMatchObject({
        actor_type_id: 1,
        actors_count: 20,
      });
    });

    it('a genuinely unrelated existing row (not claimed by any row in this payload) is still adopted normally — the exclusion is scoped to this payload only', async () => {
      const update = jest.fn().mockResolvedValue({});
      const save = jest
        .fn()
        .mockImplementation((rows: unknown[]) => Promise.resolve(rows));
      // No id-present row in this payload at all — `idsAlreadyClaimed` is
      // empty, so the where-clause carries no `result_actors_id` key
      // (asserted below) and the pre-existing adoption behaviour for a
      // stale/soft-deleted row of the same type is untouched by this fix.
      const findOne = jest.fn().mockResolvedValue({ result_actors_id: 91 });
      const tempRepo = { findOne, update, save };
      const manager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as unknown as EntityManager;

      const row = {
        actor_type_id: 1,
        sex_age_disaggregation_not_apply: true,
        actors_count: 30,
      } as InnovationUseActorDto;

      await service.customSaveInnovationUse(3, [row], manager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 3,
          actor_role_id: ActorRolesEnum.INNOVATION_USE,
          actor_type_id: 1,
          actor_type_custom_name: IsNull(),
        },
      });
      expect(save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ result_actors_id: 91, actors_count: 30 }),
        ]),
      );
    });
  });
});
