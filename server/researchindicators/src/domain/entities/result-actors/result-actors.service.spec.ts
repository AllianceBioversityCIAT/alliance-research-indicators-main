import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { ResultActorsService } from './result-actors.service';
import { ResultActor } from './entities/result-actor.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
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
});
