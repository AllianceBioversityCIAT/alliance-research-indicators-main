import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ResultInnovationDevService } from './result-innovation-dev.service';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import { ClarisaInnovationReadinessLevel } from '../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { ClarisaActorTypesService } from '../../tools/clarisa/entities/clarisa-actor-types/clarisa-actor-types.service';
import { LinkResultsService } from '../link-results/link-results.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ClarisaInnovationCharacteristicsService } from '../../tools/clarisa/entities/clarisa-innovation-characteristics/clarisa-innovation-characteristics.service';
import { ClarisaInnovationTypesService } from '../../tools/clarisa/entities/clarisa-innovation-types/clarisa-innovation-types.service';
import { ClarisaInnovationReadinessLevelsService } from '../../tools/clarisa/entities/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.service';
import { InnovationDevAnticipatedUsersService } from '../innovation-dev-anticipated-users/innovation-dev-anticipated-users.service';
import { ClarisaInstitutionsService } from '../../tools/clarisa/entities/clarisa-institutions/clarisa-institutions.service';
import { ClarisaInstitutionTypesService } from '../../tools/clarisa/entities/clarisa-institution-types/clarisa-institution-types.service';
import { ResultInnovationToolFunctionService } from '../result-innovation-tool-function/result-innovation-tool-function.service';
import { CreateResultInnovationDevDto } from './dto/create-result-innovation-dev.dto';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';

describe('ResultInnovationDevService', () => {
  let service: ResultInnovationDevService;

  const mainFindOne = jest.fn();
  const mainSave = jest.fn();
  const readinessFindOne = jest.fn();

  const mainRepo = {
    findOne: mainFindOne,
    save: mainSave,
    target: ResultInnovationDev,
  };

  const readinessRepo = {
    findOne: readinessFindOne,
  };

  const getRepository = jest.fn((entity: unknown) => {
    if (entity === ClarisaInnovationReadinessLevel) {
      return readinessRepo;
    }
    return mainRepo;
  });

  const transaction = jest.fn();

  const mockDataSource = {
    getRepository,
    transaction,
  };

  const mockCurrentUser = {
    audit: jest.fn((flag: SetAuditEnum) =>
      flag === SetAuditEnum.NEW
        ? { created_by: 1 }
        : { updated_by: 1, updated_at: new Date() },
    ),
  };

  const mockResultActors = {
    customSaveInnovationDev: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockResultInstitutionTypes = {
    customSaveInnovationDev: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockClarisaActorTypes = {
    validateActorTypes: jest.fn().mockResolvedValue([]),
    findByName: jest.fn().mockResolvedValue({ code: 1 }),
  };

  const mockLinkResults = {
    create: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn().mockResolvedValue(undefined),
  };

  const mockClarisaInnovationCharacteristic = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockClarisaInnovationTypes = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockClarisaReadinessLevels = {
    findByValue: jest.fn().mockResolvedValue(null),
  };

  const mockAnticipatedUsers = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockClarisaInstitutions = {
    findOne: jest.fn().mockResolvedValue({ code: 'INST' }),
  };

  const mockClarisaInstitutionTypes = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockToolFunction = {
    create: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    getRepository.mockImplementation((entity: unknown) => {
      if (entity === ClarisaInnovationReadinessLevel) {
        return readinessRepo;
      }
      return mainRepo;
    });
    readinessFindOne.mockResolvedValue({ level: 10 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInnovationDevService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ResultActorsService, useValue: mockResultActors },
        {
          provide: ResultInstitutionTypesService,
          useValue: mockResultInstitutionTypes,
        },
        { provide: ClarisaActorTypesService, useValue: mockClarisaActorTypes },
        { provide: LinkResultsService, useValue: mockLinkResults },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        {
          provide: ClarisaInnovationCharacteristicsService,
          useValue: mockClarisaInnovationCharacteristic,
        },
        {
          provide: ClarisaInnovationTypesService,
          useValue: mockClarisaInnovationTypes,
        },
        {
          provide: ClarisaInnovationReadinessLevelsService,
          useValue: mockClarisaReadinessLevels,
        },
        {
          provide: InnovationDevAnticipatedUsersService,
          useValue: mockAnticipatedUsers,
        },
        {
          provide: ClarisaInstitutionsService,
          useValue: mockClarisaInstitutions,
        },
        {
          provide: ClarisaInstitutionTypesService,
          useValue: mockClarisaInstitutionTypes,
        },
        {
          provide: ResultInnovationToolFunctionService,
          useValue: mockToolFunction,
        },
      ],
    }).compile();

    service = module.get<ResultInnovationDevService>(ResultInnovationDevService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processDataArrayString', () => {
    it('should trim array elements', () => {
      expect(service.processDataArrayString([' a ', 'b'])).toEqual(['a', 'b']);
    });

    it('should split and trim comma-separated string', () => {
      expect(service.processDataArrayString('x, y')).toEqual(['x', 'y']);
    });

    it('should return empty array for other input', () => {
      expect(service.processDataArrayString(null as unknown as string)).toEqual(
        [],
      );
    });
  });

  describe('processedCenters', () => {
    it('should return empty when centers empty', async () => {
      await expect(service.processedCenters([])).resolves.toEqual([]);
    });

    it('should map valid institution id to institution type dto', async () => {
      const out = await service.processedCenters([
        {
          institution_id: 5,
          similarity_score: 0.9,
        } as any,
      ]);

      expect(mockClarisaInstitutions.findOne).toHaveBeenCalledWith(5);
      expect(out).toEqual([
        expect.objectContaining({
          institution_id: 'INST',
          is_organization_known: true,
        }),
      ]);
    });
  });

  describe('processedInstitutionTypes', () => {
    it('should set OTHER when other_type present', async () => {
      const out = await service.processedInstitutionTypes({
        other_type: 'Custom org',
      } as any);

      expect(out).toEqual(
        expect.objectContaining({
          institution_type_id: ClarisaInstitutionTypeEnum.OTHER,
          institution_type_custom_name: 'Custom org',
          is_organization_known: false,
        }),
      );
    });
  });

  describe('processedAiInfo', () => {
    it('should build dto from raw AI payload with empty nested arrays', async () => {
      const raw = {
        short_title: 'T',
        innovation_actors_detailed: [],
        organizations_detailed: [],
      } as any;

      const dto = await service.processedAiInfo(raw);

      expect(dto.short_title).toBe('T');
      expect(dto.actors).toEqual([]);
      expect(dto.institution_types).toEqual([]);
    });
  });

  describe('create', () => {
    it('should save new row with audit fields', async () => {
      const saved = { result_id: 3 } as ResultInnovationDev;
      mainSave.mockResolvedValue(saved);

      const out = await service.create(3);

      expect(mainSave).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 3,
          created_by: 1,
        }),
      );
      expect(out).toBe(saved);
    });
  });

  describe('update', () => {
    it('should throw when innovation dev not found', async () => {
      mainFindOne.mockResolvedValue(null);

      await expect(
        service.update(1, { actors: [], institution_types: [] } as any),
      ).rejects.toThrow(NotFoundException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('should run transaction and return final entity', async () => {
      mainFindOne
        .mockResolvedValueOnce({ result_id: 5, is_active: true })
        .mockResolvedValueOnce({
          result_id: 5,
          short_title: 'S',
          innovation_nature_id: 1,
          innovation_type_id: 2,
          innovation_readiness_id: 3,
          innovation_readiness_explanation: null,
          no_sex_age_disaggregation: false,
          anticipated_users_id: 1,
          expected_outcome: null,
          intended_beneficiaries_description: null,
          is_new_or_improved_variety: false,
          new_or_improved_varieties_count: null,
          is_knowledge_sharing: false,
          dissemination_qualification_id: null,
          tool_useful_context: null,
          results_achieved_expected: null,
          is_used_beyond_original_context: false,
          adoption_adaptation_context: null,
          other_tools: null,
          other_tools_integration: null,
          is_cheaper_than_alternatives: null,
          is_simpler_to_use: null,
          does_perform_better: null,
          is_desirable_to_users: null,
          has_commercial_viability: null,
          has_suitable_enabling_environment: null,
          has_evidence_of_uptake: null,
          expansion_potential_id: null,
          expansion_adaptation_details: null,
        } as ResultInnovationDev);

      const innovationUpdate = jest.fn().mockResolvedValue(undefined);
      transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            update: innovationUpdate,
          }),
        };
        return cb(manager);
      });

      const dto: CreateResultInnovationDevDto = {
        anticipated_users_id: 1,
        innovation_readiness_id: 3,
        actors: [],
        institution_types: [],
        knowledge_sharing_form: {},
        scaling_potential_form: {},
      } as CreateResultInnovationDevDto;

      const out = await service.update(5, dto);

      expect(transaction).toHaveBeenCalled();
      expect(mockResultActors.customSaveInnovationDev).toHaveBeenCalledWith(
        5,
        [],
        expect.anything(),
      );
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        5,
        expect.anything(),
      );
      expect(out?.short_title).toBe('S');
    });
  });

  describe('findOne', () => {
    it('should aggregate innovation dev with related collections', async () => {
      const entity = {
        result_id: 8,
        short_title: 'X',
        innovation_nature_id: 1,
        innovation_type_id: 2,
        innovation_readiness_id: 3,
        innovation_readiness_explanation: 'e',
        no_sex_age_disaggregation: true,
        anticipated_users_id: 2,
        expected_outcome: 'o',
        intended_beneficiaries_description: 'b',
        is_new_or_improved_variety: true,
        new_or_improved_varieties_count: 1,
        is_knowledge_sharing: false,
        dissemination_qualification_id: 4,
        tool_useful_context: 't',
        results_achieved_expected: 'r',
        is_used_beyond_original_context: false,
        adoption_adaptation_context: 'a',
        other_tools: 'ot',
        other_tools_integration: 'oi',
        is_cheaper_than_alternatives: 1,
        is_simpler_to_use: 1,
        does_perform_better: 1,
        is_desirable_to_users: 1,
        has_commercial_viability: 1,
        has_suitable_enabling_environment: 1,
        has_evidence_of_uptake: 1,
        expansion_potential_id: 2,
        expansion_adaptation_details: 'd',
      } as ResultInnovationDev;

      mainFindOne.mockResolvedValue(entity);
      mockLinkResults.find.mockResolvedValue([{ id: 10 }]);
      mockResultInstitutionTypes.find.mockResolvedValue([{ id: 20 }]);
      mockResultActors.find.mockResolvedValue([{ id: 30 }]);
      mockToolFunction.find.mockResolvedValue([{ tool_function_id: 40 }]);

      const out = await service.findOne(8);

      expect(mainFindOne).toHaveBeenCalledWith({
        where: { result_id: 8, is_active: true },
      });
      expect(mockLinkResults.find).toHaveBeenCalledWith(
        8,
        LinkResultRolesEnum.INNOVATION_DEV,
      );
      expect(mockResultInstitutionTypes.find).toHaveBeenCalledWith(
        8,
        InstitutionTypeRoleEnum.INNOVATION_DEV,
      );
      expect(mockResultActors.find).toHaveBeenCalledWith(
        8,
        ActorRolesEnum.INNOVATION_DEV,
      );
      expect(mockToolFunction.find).toHaveBeenCalledWith(8, null);
      expect(out.short_title).toBe('X');
      expect(out.knowledge_sharing_form.link_to_result).toEqual([{ id: 10 }]);
      expect(out.knowledge_sharing_form.tool_function_id).toEqual([
        { tool_function_id: 40 },
      ]);
    });
  });
});
