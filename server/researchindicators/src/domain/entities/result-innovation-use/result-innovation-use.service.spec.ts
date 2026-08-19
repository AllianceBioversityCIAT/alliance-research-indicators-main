import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { ResultInnovationUse } from './entities/result-innovation-use.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ResultQuantificationsService } from '../result-quantifications/result-quantifications.service';
import { QuantificationRolesEnum } from '../quantification-roles/enum/quantification-roles.enum';

describe('ResultInnovationUseService', () => {
  let service: ResultInnovationUseService;

  const mainFindOne = jest.fn();
  const mainSave = jest.fn();

  const mainRepo = {
    findOne: mainFindOne,
    save: mainSave,
    target: ResultInnovationUse,
  };

  const getRepository = jest.fn(() => mainRepo);

  const mockDataSource = {
    getRepository,
  };

  const mockCurrentUser = {
    audit: jest.fn(() => ({ created_by: 1 })),
  };

  const mockResultActors = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockResultInstitutionTypes = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockResultQuantifications = {
    findByResultIdAndRoles: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    getRepository.mockImplementation(() => mainRepo);
    mockResultActors.find.mockResolvedValue([]);
    mockResultInstitutionTypes.find.mockResolvedValue([]);
    mockResultQuantifications.findByResultIdAndRoles.mockResolvedValue([]);

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
      ],
    }).compile();

    service = module.get<ResultInnovationUseService>(
      ResultInnovationUseService,
    );
  });

  describe('create', () => {
    it('saves a new row with the result id and audit(NEW) fields', async () => {
      const saved = { result_id: 42 } as ResultInnovationUse;
      mainSave.mockResolvedValue(saved);

      const out = await service.create(42);

      expect(mainSave).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 42, created_by: 1 }),
      );
      expect(out).toBe(saved);
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
});
