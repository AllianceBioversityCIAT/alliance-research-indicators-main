import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, IsNull } from 'typeorm';
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
      const tempRepo = { findOne: jest.fn(), update, save };
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
});
