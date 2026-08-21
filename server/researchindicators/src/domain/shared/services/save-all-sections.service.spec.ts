import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SaveResultService } from './save-all-sections.service';
import { ResultsService } from '../../entities/results/results.service';
import { ResultKnowledgeProductService } from '../../entities/result-knowledge-product/result-knowledge-product.service';
import { ResultInstitutionsService } from '../../entities/result-institutions/result-institutions.service';
import { ResultEvidencesService } from '../../entities/result-evidences/result-evidences.service';
import { QueryService } from '../utils/query.service';
import { CurrentUserUtil } from '../utils/current-user.util';
import { ResultsUtil } from '../utils/results.util';
import { ExternalMappersDto } from '../global-dto/external-mappers.dto';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import {
  CounterResults,
  CounterResultsEnum,
} from '../../tools/tip-integration/dto/response-year-tip.dto';
import { LinkResult } from '../../entities/link-results/entities/link-result.entity';
import { ResultPolicyChangeService } from '../../entities/result-policy-change/result-policy-change.service';
import { ResultCapacitySharingService } from '../../entities/result-capacity-sharing/result-capacity-sharing.service';
import { ResultInnovationDevService } from '../../entities/result-innovation-dev/result-innovation-dev.service';
import { ResultIpRightsService } from '../../entities/result-ip-rights/result-ip-rights.service';

describe('SaveResultService', () => {
  let service: SaveResultService;
  let resultRepoHandle: {
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };
  let linkResultRepoHandle: { find: jest.Mock };
  let getRepository: jest.Mock;
  let resultsService: jest.Mocked<ResultsService>;
  let knowledgeProductService: jest.Mocked<ResultKnowledgeProductService>;
  let resultInstitutionsService: jest.Mocked<
    Pick<ResultInstitutionsService, 'updatePartners'>
  >;
  let resultEvidencesService: jest.Mocked<
    Pick<ResultEvidencesService, 'updateResultEvidences'>
  >;
  let resultPolicyChangeService: jest.Mocked<
    Pick<ResultPolicyChangeService, 'update'>
  >;
  let resultCapacitySharingService: jest.Mocked<
    Pick<ResultCapacitySharingService, 'update'>
  >;
  let resultInnovationDevService: jest.Mocked<
    Pick<ResultInnovationDevService, 'update'>
  >;
  let resultIpRightsService: jest.Mocked<Pick<ResultIpRightsService, 'update'>>;
  let queryService: jest.Mocked<QueryService>;
  let currentUser: jest.Mocked<CurrentUserUtil>;
  let resultsUtil: jest.Mocked<
    Pick<ResultsUtil, 'setCurrentResult' | 'clearManually'>
  >;

  const minimalResultDto = (): ExternalMappersDto => {
    const r = new ExternalMappersDto();
    r.official_code = 7001;
    r.external_link = 'e';
    r.created_at = new Date();
    r.status_id = ResultStatusEnum.SUBMITTED_IN_PRMS;
    r.userData = { sec_user_id: 1 } as any;
    r.createResult = {
      year: 2024,
      indicator_id: 1,
      title: 't',
      description: 'd',
      contract_id: 'c',
    } as any;
    r.generalInformation = {
      title: 't',
      description: 'd',
      keywords: [],
      main_contact_person: null,
      main_contact_person_ai: null,
      year: 2024,
    };
    r.alignments = {
      primary_levers: [],
      contracts: [],
      contributor_levers: [],
      result_sdgs: [],
    } as any;
    return r;
  };

  const prmsExtraData = (counters = new CounterResults()) => ({
    platformCode: ReportingPlatformEnum.PRMS,
    appliedVersion: true,
    counters,
    resultSaved: [] as number[],
    currentCode: { current: 0 },
  });

  const tipExtraData = (counters = new CounterResults()) => ({
    platformCode: ReportingPlatformEnum.TIP,
    appliedVersion: false,
    counters,
    resultSaved: [] as number[],
    currentCode: { current: 0 },
  });

  beforeEach(async () => {
    resultRepoHandle = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    linkResultRepoHandle = {
      find: jest.fn().mockResolvedValue([]),
    };
    getRepository = jest.fn((entity) => {
      if (entity === LinkResult) return linkResultRepoHandle;
      return resultRepoHandle;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveResultService,
        {
          provide: DataSource,
          useValue: {
            getRepository,
          },
        },
        {
          provide: ResultsService,
          useValue: {
            createResult: jest.fn(),
            updateGeneralInfo: jest.fn(),
            updateResultAlignment: jest.fn(),
            updateInactiveResult: jest.fn(),
            updateResultStatus: jest.fn().mockResolvedValue(undefined),
            newOfficialCode: jest.fn(),
            findResultAlignment: jest
              .fn()
              .mockResolvedValue({ primary_levers: [] }),
            saveGeoLocation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultKnowledgeProductService,
          useValue: { update: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: QueryService,
          useValue: {
            deleteFullResultById: jest.fn().mockResolvedValue(undefined),
            deleteLogicalResultById: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            setSystemUser: jest.fn(),
            clearSystemUser: jest.fn(),
          },
        },
        {
          provide: ResultsUtil,
          useValue: {
            setCurrentResult: jest.fn().mockResolvedValue(undefined),
            clearManually: jest.fn(),
          },
        },
        {
          provide: ResultInstitutionsService,
          useValue: {
            updatePartners: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultEvidencesService,
          useValue: {
            updateResultEvidences: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultPolicyChangeService,
          useValue: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultCapacitySharingService,
          useValue: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultInnovationDevService,
          useValue: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultIpRightsService,
          useValue: {
            update: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(SaveResultService);
    resultsService = module.get(ResultsService);
    knowledgeProductService = module.get(ResultKnowledgeProductService);
    resultInstitutionsService = module.get(ResultInstitutionsService);
    resultEvidencesService = module.get(ResultEvidencesService);
    resultPolicyChangeService = module.get(ResultPolicyChangeService);
    resultCapacitySharingService = module.get(ResultCapacitySharingService);
    resultInnovationDevService = module.get(ResultInnovationDevService);
    resultIpRightsService = module.get(ResultIpRightsService);
    queryService = module.get(QueryService);
    currentUser = module.get(CurrentUserUtil);
    resultsUtil = module.get(ResultsUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAllSections', () => {
    it('should create PRMS result and increment created counter', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.PRMS,
        expect.objectContaining({
          isSnapshot: false,
        }),
        7001,
      );
      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        1,
        ResultStatusEnum.SUBMITTED_IN_PRMS,
      );
      expect(counters[CounterResultsEnum.CREATED]).toBe(1);
      expect(currentUser.setSystemUser).toHaveBeenCalled();
      expect(currentUser.clearSystemUser).toHaveBeenCalled();
    });

    it('should mark snapshot when is_version_applied is true on the DTO', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 2,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      dtoSnapshot.is_version_applied = true;
      const counters = new CounterResults();
      const extraData = prmsExtraData(counters);

      await service.bulkSaveAllSections([dto, dtoSnapshot], extraData);

      const firstCallOpts = resultsService.createResult.mock.calls[0][2];
      const secondCallOpts = resultsService.createResult.mock.calls[1][2];
      expect(firstCallOpts.isSnapshot).toBe(false);
      expect(secondCallOpts.isSnapshot).toBe(true);
    });

    it('should not mark snapshot when appliedVersion is false even if official code repeats', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 10,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoDuplicate = minimalResultDto();
      const counters = new CounterResults();

      await service.bulkSaveAllSections(
        [dto, dtoDuplicate],
        tipExtraData(counters),
      );

      expect(resultsService.createResult).toHaveBeenCalledTimes(2);
      for (const call of resultsService.createResult.mock.calls) {
        expect(call[2].isSnapshot).toBe(false);
      }
    });

    it('should not mark snapshot for PRMS when each bulk item has a different official code', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);
      const dtoA = minimalResultDto();
      const dtoB = minimalResultDto();
      dtoB.official_code = 7002;
      const counters = new CounterResults();

      await service.bulkSaveAllSections([dtoA, dtoB], prmsExtraData(counters));

      expect(resultsService.createResult.mock.calls[0][2].isSnapshot).toBe(
        false,
      );
      expect(resultsService.createResult.mock.calls[1][2].isSnapshot).toBe(
        false,
      );
    });

    it('should create result with the platform code from extraData', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 20,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        7001,
      );
    });

    it('should generate a new official code when manageOfficialCode is enabled', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.newOfficialCode.mockResolvedValue(9999);
      resultsService.createResult.mockResolvedValue({
        result_id: 21,
        result_official_code: 9999,
      } as any);

      await service.saveAllSections(minimalResultDto(), {
        ...tipExtraData(),
        manageOfficialCode: true,
      });

      expect(resultsService.newOfficialCode).toHaveBeenCalledWith(
        ReportingPlatformEnum.TIP,
      );
      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        9999,
      );
    });

    it('should use the DTO official code when manageOfficialCode is disabled', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 22,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsService.newOfficialCode).not.toHaveBeenCalled();
      expect(resultsService.createResult).toHaveBeenCalledWith(
        expect.anything(),
        ReportingPlatformEnum.TIP,
        expect.anything(),
        7001,
      );
    });

    it('should search existing result by findOptions instead of official code', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 30,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/kp';

      await service.saveAllSections(dto, {
        ...tipExtraData(),
        findOptions: { public_link: 'public_link' },
      });

      expect(resultRepoHandle.findOne).toHaveBeenCalledWith({
        where: {
          platform_code: ReportingPlatformEnum.TIP,
          report_year_id: 2024,
          public_link: 'https://example.org/kp',
        },
      });
    });

    it('should search by official code when findOptions is not provided', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 31,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultRepoHandle.findOne).toHaveBeenCalledWith({
        where: {
          result_official_code: 7001,
          platform_code: ReportingPlatformEnum.TIP,
          report_year_id: 2024,
        },
      });
    });

    it('should update inactive result when PRMS row already exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(resultsService.updateInactiveResult).toHaveBeenCalledWith(
        9,
        false,
      );
      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        9,
        ResultStatusEnum.SUBMITTED_IN_PRMS,
      );
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('should apply statusMapper when provided in extraData', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 15,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.status_id = 99 as ResultStatusEnum;

      await service.saveAllSections(dto, {
        ...prmsExtraData(),
        statusMapper: {
          99: ResultStatusEnum.APPROVED,
        },
      });

      expect(resultsService.updateResultStatus).toHaveBeenCalledWith(
        15,
        ResultStatusEnum.APPROVED,
      );
    });

    it('should mark snapshot on update when is_version_applied is true', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 9,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoSnapshot = minimalResultDto();
      dtoSnapshot.is_version_applied = true;
      const counters = new CounterResults();
      const extraData = prmsExtraData(counters);

      await service.bulkSaveAllSections([dto, dtoSnapshot], extraData);

      expect(resultsService.updateInactiveResult).toHaveBeenCalledTimes(2);
      expect(resultsService.updateInactiveResult.mock.calls[0]).toEqual([
        9,
        false,
      ]);
      expect(resultsService.updateInactiveResult.mock.calls[1]).toEqual([
        9,
        true,
      ]);
    });

    it('should not mark snapshot on update when is_version_applied is false', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 11,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      const dtoDuplicate = minimalResultDto();
      const counters = new CounterResults();

      await service.bulkSaveAllSections(
        [dto, dtoDuplicate],
        tipExtraData(counters),
      );

      expect(resultsService.updateInactiveResult).toHaveBeenCalledTimes(2);
      for (const call of resultsService.updateInactiveResult.mock.calls) {
        expect(call).toEqual([11, false]);
      }
    });

    it('should increment error counter and rollback on failure after create', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 42,
        result_official_code: 7001,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('x'));
      const counters = new CounterResults();

      await service.saveAllSections(
        minimalResultDto(),
        prmsExtraData(counters),
      );

      expect(queryService.deleteFullResultById).toHaveBeenCalledWith(42);
      expect(counters[CounterResultsEnum.ERROR]).toBe(1);
    });

    it('should throw when platform code is missing', async () => {
      await expect(
        service.saveAllSections(minimalResultDto(), {
          counters: new CounterResults(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should persist public_link and sync geo location, partners, evidences and knowledge product', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 5,
        result_official_code: 7001,
      } as any);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/public';
      dto.geoScope = { geo_scope_id: 2, countries: [] } as any;
      dto.partners = { institutions: [{ institution_id: 10 }] } as any;
      dto.evidence = { evidence: [{ evidence_url: 'https://e.org' }] } as any;
      dto.knowledgeProduct = { open_access: true, citation: 'cite' } as any;

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(resultRepoHandle.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          public_link: 'https://example.org/public',
          external_link: 'e',
        }),
      );
      expect(resultsUtil.setCurrentResult).toHaveBeenCalledWith(5);
      expect(resultsService.saveGeoLocation).toHaveBeenCalledWith(
        5,
        dto.geoScope,
      );
      expect(resultInstitutionsService.updatePartners).toHaveBeenCalledWith(
        5,
        dto.partners,
      );
      expect(resultEvidencesService.updateResultEvidences).toHaveBeenCalledWith(
        5,
        dto.evidence,
      );
      expect(knowledgeProductService.update).toHaveBeenCalledWith(
        5,
        dto.knowledgeProduct,
      );
      expect(resultsUtil.clearManually).toHaveBeenCalled();
      expect(counters[CounterResultsEnum.UPDATED]).toBe(1);
    });

    it('should set and clear ResultsUtil context around section updates', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 60,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsUtil.setCurrentResult).toHaveBeenCalledWith(60);
      expect(resultsUtil.clearManually).toHaveBeenCalled();
    });

    it('should clear ResultsUtil context even when processing fails', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultsService.createResult.mockResolvedValue({
        result_id: 61,
        result_official_code: 7001,
      } as any);
      resultsService.updateGeneralInfo.mockRejectedValueOnce(new Error('boom'));

      await service.saveAllSections(minimalResultDto(), tipExtraData());

      expect(resultsUtil.setCurrentResult).toHaveBeenCalledWith(61);
      expect(resultsUtil.clearManually).toHaveBeenCalled();
    });

    it('should save policy change section when indicator is POLICY_CHANGE', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 70,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.createResult.indicator_id = IndicatorsEnum.POLICY_CHANGE;
      dto.policyChange = {
        policy_type_id: 1,
        policy_stage_id: 1,
        evidence_stage: undefined,
        implementing_organization: [{ institution_id: 8064 }] as any,
        innovation_development: undefined,
        innovation_use: undefined,
      };

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultPolicyChangeService.update).toHaveBeenCalledWith(
        70,
        dto.policyChange,
      );
    });

    it('should not save policy change section when policyChange payload is empty', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 71,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.createResult.indicator_id = IndicatorsEnum.POLICY_CHANGE;
      dto.policyChange = undefined;

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultPolicyChangeService.update).not.toHaveBeenCalled();
    });

    it('should save capacity sharing section when indicator is CAPACITY_SHARING', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 80,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.createResult.indicator_id =
        IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;
      dto.capacitySharing = {
        session_format_id: 2,
        delivery_modality_id: 3,
        session_length_id: 1,
        group: {
          session_participants_male: 59,
          session_participants_female: 16,
          session_participants_non_binary: 0,
          session_participants_total: 75,
          is_attending_organization: true,
          trainee_organization_representative: [{ institution_id: 21 }] as any,
        } as any,
      };

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultCapacitySharingService.update).toHaveBeenCalledWith(
        80,
        dto.capacitySharing,
      );
    });

    it('should save innovationDev and ipRights when indicator is INNOVATION_DEV', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 90,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.createResult.indicator_id = IndicatorsEnum.INNOVATION_DEV;
      dto.innovationDev = {
        short_title: 'Holistic framework',
        innovation_nature_id: 1,
        innovation_type_id: 13,
        innovation_readiness_id: 14,
        anticipated_users_id: 2,
      } as any;
      dto.ipRights = {
        private_sector_engagement_id: 3,
        formal_ip_rights_application_id: 2,
      } as any;

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultInnovationDevService.update).toHaveBeenCalledWith(
        90,
        dto.innovationDev,
      );
      expect(resultIpRightsService.update).toHaveBeenCalledWith(
        90,
        dto.ipRights,
      );
    });

    it('should merge STAR primary levers before updating alignment', async () => {
      resultRepoHandle.findOne.mockResolvedValue({
        result_id: 3,
        result_official_code: 7001,
      } as any);
      resultsService.findResultAlignment.mockResolvedValue({
        primary_levers: [{ lever_id: 1, is_primary: true }],
      } as any);
      const dto = minimalResultDto();
      dto.alignments.primary_levers = [
        { lever_id: 2, is_primary: false },
      ] as any;

      await service.saveAllSections(dto, prmsExtraData());

      expect(resultsService.findResultAlignment).toHaveBeenCalledWith(3);
      const alignmentArg =
        resultsService.updateResultAlignment.mock.calls[0][1];
      expect(alignmentArg.primary_levers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lever_id: 1, is_primary: true }),
          expect.objectContaining({ lever_id: 2, is_primary: false }),
        ]),
      );
    });
  });

  describe('duplicateResultValidation', () => {
    it('should omit PRMS when TIP duplicate exists for the same public link', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 99,
          platform_code: ReportingPlatformEnum.TIP,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.PRMS,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.shouldOmit).toBe(true);
      expect(result.resultsToDelete).toEqual([]);
      expect(resultRepoHandle.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            public_link: 'https://example.org/doc',
          }),
        }),
      );
    });

    it('should mark PRMS duplicate for deletion when incoming TIP wins', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 88,
          platform_code: ReportingPlatformEnum.PRMS,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.shouldOmit).toBe(false);
      expect(result.resultsToDelete).toEqual([88]);
    });

    it('should skip deduplication when only external_link would match', async () => {
      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: null,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result).toEqual({
        shouldOmit: false,
        resultsToDelete: [],
        protectedFromDeletion: [],
      });
      expect(resultRepoHandle.find).not.toHaveBeenCalled();
    });

    it('should protect duplicates referenced in link_results.other_result_id', async () => {
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 77,
          platform_code: ReportingPlatformEnum.PRMS,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);
      linkResultRepoHandle.find.mockResolvedValue([{ other_result_id: 77 }]);

      const result = await service.duplicateResultValidation({
        platformCode: ReportingPlatformEnum.TIP,
        publicLink: 'https://example.org/doc',
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
      });

      expect(result.resultsToDelete).toEqual([]);
      expect(result.protectedFromDeletion).toEqual([77]);
    });
  });

  describe('saveAllSections duplicate handling', () => {
    it('should skip PRMS save when a higher-priority duplicate exists', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 55,
          platform_code: ReportingPlatformEnum.TIP,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, prmsExtraData(counters));

      expect(resultsService.createResult).not.toHaveBeenCalled();
      expect(counters[CounterResultsEnum.CREATED]).toBe(0);
      expect(currentUser.clearSystemUser).toHaveBeenCalled();
    });

    it('should not deduplicate when incoming row has only external_link', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      const counters = new CounterResults();
      const dto = minimalResultDto();
      dto.public_link = null;
      dto.external_link = 'https://tip-platform.org/result/1';
      resultsService.createResult.mockResolvedValue({
        result_id: 1,
        result_official_code: 7001,
      } as any);

      await service.saveAllSections(dto, tipExtraData(counters));

      expect(resultRepoHandle.find).not.toHaveBeenCalled();
      expect(resultsService.createResult).toHaveBeenCalled();
    });

    it('should logically delete lower-priority duplicates after TIP wins', async () => {
      resultRepoHandle.findOne.mockResolvedValue(null);
      resultRepoHandle.find.mockResolvedValue([
        {
          result_id: 88,
          platform_code: ReportingPlatformEnum.PRMS,
          indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        },
      ]);
      resultsService.createResult.mockResolvedValue({
        result_id: 100,
        result_official_code: 7001,
      } as any);
      const dto = minimalResultDto();
      dto.public_link = 'https://example.org/doc';

      await service.saveAllSections(dto, tipExtraData());

      expect(resultsService.createResult).toHaveBeenCalled();
      expect(queryService.deleteLogicalResultById).toHaveBeenCalledWith(88);
      expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    });
  });

  describe('bulkSaveAllSections', () => {
    it('should process every result in the batch', async () => {
      const saveSpy = jest
        .spyOn(service, 'saveAllSections')
        .mockResolvedValue(undefined);
      const dtoA = minimalResultDto();
      const dtoB = minimalResultDto();
      dtoB.official_code = 7002;

      await service.bulkSaveAllSections([dtoA, dtoB], prmsExtraData());

      expect(saveSpy).toHaveBeenCalledTimes(2);
      saveSpy.mockRestore();
    });
  });
});
