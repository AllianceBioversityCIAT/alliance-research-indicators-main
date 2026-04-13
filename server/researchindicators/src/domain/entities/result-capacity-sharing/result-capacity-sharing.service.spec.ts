import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultCapacitySharing } from './entities/result-capacity-sharing.entity';
import { Result } from '../results/entities/result.entity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { ResultUsersService } from '../result-users/result-users.service';
import { ResultLanguagesService } from '../result-languages/result-languages.service';
import { ResultInstitutionsService } from '../result-institutions/result-institutions.service';
import { ResultCountriesService } from '../result-countries/result-countries.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { SessionLengthsService } from '../session-lengths/session-lengths.service';
import { DeliveryModalitiesService } from '../delivery-modalities/delivery-modalities.service';
import { SessionFormatsService } from '../session-formats/session-formats.service';
import { DegreesService } from '../degrees/degrees.service';
import { SessionTypesService } from '../session-types/session-types.service';
import { SessionPurposesService } from '../session-purposes/session-purposes.service';
import { ClarisaCountriesService } from '../../tools/clarisa/entities/clarisa-countries/clarisa-countries.service';
import { GendersService } from '../genders/genders.service';
import { AllianceUserStaffService } from '../alliance-user-staff/alliance-user-staff.service';
import { ClarisaLanguagesService } from '../../tools/clarisa/entities/clarisa-languages/clarisa-languages.service';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';
import { ResultRawAi } from '../results/dto/result-ai.dto';
import { SessionFormatEnum } from '../session-formats/enums/session-format.enum';
import { InstitutionRolesEnum } from '../institution-roles/enums/institution-roles.enum';

describe('ResultCapacitySharingService', () => {
  let service: ResultCapacitySharingService;

  const capacityFindOne = jest.fn();
  const capacitySave = jest.fn();
  const resultFindOne = jest.fn();
  const repoUpdateInTx = jest.fn().mockResolvedValue(undefined);
  const transaction = jest.fn();

  const capacityRepo = {
    findOne: capacityFindOne,
    save: capacitySave,
    target: ResultCapacitySharing,
  };

  const mockDataSource = {
    getRepository: jest.fn((entity) => {
      if (entity === Result) {
        return { findOne: resultFindOne };
      }
      return capacityRepo;
    }),
    transaction,
  };

  const mockCurrentUser = {
    user_id: 1,
    audit: jest.fn((set: SetAuditEnum) =>
      set === SetAuditEnum.NEW ? { created_by: 1 } : { updated_by: 1 },
    ),
  };

  const mockResultUsers = {
    filterInstitutionsAi: jest.fn().mockReturnValue({ acept: [], pending: [] }),
    findUsersByRoleResult: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue(undefined),
    insertUserAi: jest.fn().mockResolvedValue(undefined),
  };

  const mockResultLanguages = {
    create: jest.fn().mockResolvedValue(undefined),
    findLanguageByRoleResult: jest.fn().mockResolvedValue([]),
  };

  const mockResultInstitutions = {
    filterInstitutionsAi: jest.fn().mockReturnValue({ acept: [], pending: [] }),
    findInstitutionsByRoleResult: jest.fn().mockResolvedValue([]),
    findOneInstitutionByRoleResult: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
    insertInstitutionsAi: jest.fn().mockResolvedValue(undefined),
  };

  const mockResultCountries = {
    findOneCountryByRoleResult: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn().mockResolvedValue(undefined),
  };

  const mockAiRoar = {
    cleanDataNotProvided: jest.fn((v: unknown) => v),
  };

  const mockSessionLengths = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockDeliveryModalities = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockSessionFormats = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockDegrees = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockSessionTypes = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockSessionPurposes = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockClarisaCountries = {
    findByIso2: jest.fn().mockResolvedValue([]),
  };

  const mockGenders = {
    findByName: jest.fn().mockResolvedValue(null),
  };

  const mockAllianceUserStaff = {};

  const mockClarisaLanguages = {
    findOneByiso3: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction.mockImplementation(async (cb: (m: unknown) => Promise<void>) => {
      const manager = {
        getRepository: jest.fn().mockReturnValue({
          update: repoUpdateInTx,
        }),
      };
      await cb(manager);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultCapacitySharingService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ResultUsersService, useValue: mockResultUsers },
        { provide: ResultLanguagesService, useValue: mockResultLanguages },
        {
          provide: ResultInstitutionsService,
          useValue: mockResultInstitutions,
        },
        { provide: ResultCountriesService, useValue: mockResultCountries },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
        { provide: AiRoarMiningApp, useValue: mockAiRoar },
        { provide: SessionLengthsService, useValue: mockSessionLengths },
        {
          provide: DeliveryModalitiesService,
          useValue: mockDeliveryModalities,
        },
        { provide: SessionFormatsService, useValue: mockSessionFormats },
        { provide: DegreesService, useValue: mockDegrees },
        { provide: SessionTypesService, useValue: mockSessionTypes },
        { provide: SessionPurposesService, useValue: mockSessionPurposes },
        { provide: ClarisaCountriesService, useValue: mockClarisaCountries },
        { provide: GendersService, useValue: mockGenders },
        {
          provide: AllianceUserStaffService,
          useValue: mockAllianceUserStaff,
        },
        { provide: ClarisaLanguagesService, useValue: mockClarisaLanguages },
      ],
    }).compile();

    service = module.get<ResultCapacitySharingService>(
      ResultCapacitySharingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw when capacity sharing already exists', async () => {
      capacityFindOne.mockResolvedValue({ result_id: 1 });

      await expect(service.create(1)).rejects.toThrow(ConflictException);
      expect(capacitySave).not.toHaveBeenCalled();
    });

    it('should save new row when none exists', async () => {
      capacityFindOne.mockResolvedValue(null);
      const saved = { result_id: 9 };
      capacitySave.mockResolvedValue(saved);

      const out = await service.create(9);

      expect(capacitySave).toHaveBeenCalledWith({
        result_id: 9,
        created_by: 1,
      });
      expect(out).toBe(saved);
    });
  });

  describe('update', () => {
    it('should throw when active record missing', async () => {
      capacityFindOne.mockResolvedValue(null);

      await expect(
        service.update(1, new UpdateResultCapacitySharingDto()),
      ).rejects.toThrow(ConflictException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('should run transaction and update header plus related creates', async () => {
      capacityFindOne.mockResolvedValue({
        result_id: 44,
        is_active: true,
      });

      const dto = new UpdateResultCapacitySharingDto();
      dto.session_format_id = 99;
      dto.training_supervisor = null;
      dto.training_supervisor_languages = null;

      await service.update(44, dto, false);

      expect(transaction).toHaveBeenCalled();
      expect(repoUpdateInTx).toHaveBeenCalledWith(
        44,
        expect.objectContaining({
          session_format_id: 99,
          updated_by: 1,
        }),
      );
      expect(mockResultUsers.create).toHaveBeenCalled();
      expect(mockResultLanguages.create).toHaveBeenCalled();
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(
        44,
        expect.anything(),
      );
    });
  });

  describe('findByResultId', () => {
    it('should throw when result is not capacity-sharing indicator', async () => {
      resultFindOne.mockResolvedValue(null);

      await expect(service.findByResultId(1)).rejects.toThrow(ConflictException);
    });

    it('should build group payload when session is GROUP', async () => {
      resultFindOne.mockResolvedValue({ result_id: 1 });
      const institutions = [{ institution_id: 5 } as any];
      mockResultInstitutions.findInstitutionsByRoleResult.mockResolvedValue(
        institutions,
      );
      capacityFindOne.mockResolvedValue({
        result_id: 2,
        session_format_id: SessionFormatEnum.GROUP,
        delivery_modality_id: 1,
        end_date: null,
        session_type_id: 1,
        start_date: null,
        session_length_id: 1,
        is_attending_organization: true,
        session_participants_female: 1,
        session_participants_male: 2,
        session_participants_non_binary: 0,
        session_participants_total: 3,
        session_purpose_description: 'x',
        session_purpose_id: 1,
        degree_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockResultUsers.findUsersByRoleResult.mockResolvedValue([
        { user_id: 'u1' } as any,
      ]);
      mockResultLanguages.findLanguageByRoleResult.mockResolvedValue([
        { language_id: 1 } as any,
      ]);

      const res = await service.findByResultId(2);

      expect(res.session_format_id).toBe(SessionFormatEnum.GROUP);
      expect(res.group?.trainee_organization_representative).toBe(institutions);
      expect(res.training_supervisor).toEqual({ user_id: 'u1' });
      expect(res.training_supervisor_languages).toEqual({ language_id: 1 });
    });
  });

  describe('processedAiInfo', () => {
    it('should map raw AI fields using injected services', async () => {
      mockSessionFormats.findByName.mockResolvedValue({
        session_format_id: 10,
      });
      mockSessionLengths.findByName.mockResolvedValue({
        session_length_id: 20,
      });
      mockSessionTypes.findByName.mockResolvedValue({
        session_type_id: 30,
      });
      mockDeliveryModalities.findByName.mockResolvedValue({
        delivery_modality_id: 40,
      });
      mockDegrees.findByName.mockResolvedValue({ degree_id: 50 });
      mockClarisaLanguages.findOneByiso3.mockResolvedValue({ id: 60 });
      mockResultUsers.filterInstitutionsAi.mockReturnValue({
        acept: [{ user_id: 'sup' } as any],
        pending: [],
      });

      const raw = {
        end_date: new Date('2025-01-01'),
        start_date: new Date('2025-02-01'),
        training_type: 'Workshop',
        length_of_training: '1 day',
        training_supervisor: { code: 'x', similarity_score: '80' },
        training_category: 'Cat',
        delivery_modality: 'Online',
        degree: 'MSc',
        language: { code: 'eng' },
      } as unknown as ResultRawAi;

      const out = await service.processedAiInfo(raw);

      expect(out.session_format_id).toBe(10);
      expect(out.session_length_id).toBe(20);
      expect(out.session_type_id).toBe(30);
      expect(out.delivery_modality_id).toBe(40);
      expect(out.degree_id).toBe(50);
      expect(out.training_supervisor).toEqual({ user_id: 'sup' });
      expect(out.training_supervisor_languages).toEqual({ language_id: 60 });
    });
  });

  describe('processedAiInfoIndividual', () => {
    it('should map trainee fields and affiliation AI split', async () => {
      mockClarisaCountries.findByIso2.mockResolvedValue([
        { isoAlpha2: 'CO' } as any,
      ]);
      mockGenders.findByName.mockResolvedValue({ gender_id: 7 });
      mockResultInstitutions.filterInstitutionsAi.mockReturnValue({
        acept: [{ institution_id: 1 } as any],
        pending: [],
      });

      const raw = {
        trainee_name: 'Jane',
        trainee_nationality: { code: 'CO' },
        trainee_gender: 'F',
        trainee_affiliation: { institution_id: 9, similarity_score: '90' },
      } as unknown as ResultRawAi;

      const out = await service.processedAiInfoIndividual(raw);

      expect(out.trainee_name).toBe('Jane');
      expect(out.nationality).toEqual({ isoAlpha2: 'CO' });
      expect(out.gender_id).toBe(7);
      expect(out.affiliation).toEqual({ institution_id: 1 });
    });
  });

  describe('processedAiInfoGroup', () => {
    it('should map participant counts and trainee organizations', async () => {
      mockAiRoar.cleanDataNotProvided.mockImplementation(
        (v: unknown, type?: string) => {
          if (type === 'number') return Number(v) || 0;
          return v;
        },
      );
      mockSessionPurposes.findByName.mockResolvedValue({
        session_purpose_id: 2,
      });
      mockResultInstitutions.filterInstitutionsAi.mockReturnValue({
        acept: [{ institution_id: 3 } as any],
        pending: [],
      });

      const raw = {
        female_participants: 2,
        male_participants: 3,
        non_binary_participants: 1,
        total_participants: 6,
        training_purpose: 'Capacity',
        trainees: 'Yes',
        trainees_description: [{} as any],
      } as unknown as ResultRawAi;

      const out = await service.processedAiInfoGroup(raw);

      expect(out.session_participants_female).toBe(2);
      expect(out.session_participants_male).toBe(3);
      expect(out.session_participants_non_binary).toBe(1);
      expect(out.session_participants_total).toBe(6);
      expect(out.session_purpose_id).toBe(2);
      expect(out.is_attending_organization).toBe(true);
      expect(mockResultInstitutions.filterInstitutionsAi).toHaveBeenCalledWith(
        raw.trainees_description,
        InstitutionRolesEnum.TRAINEE_AFFILIATION,
      );
      expect(out.trainee_organization_representative).toEqual([
        { institution_id: 3 },
      ]);
    });
  });
});
