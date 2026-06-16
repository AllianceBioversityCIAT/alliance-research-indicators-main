import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultPdfReportService } from './result-pdf-report.service';
import { ResultsService } from '../../../results/results.service';
import { ResultEvidencesService } from '../../../result-evidences/result-evidences.service';
import { ResultIpRightsService } from '../../../result-ip-rights/result-ip-rights.service';
import { ClarisaLeversService } from '../../../../tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { ResultContract } from '../../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../../result-levers/entities/result-lever.entity';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { Result } from '../../../results/entities/result.entity';

describe('ResultPdfReportService', () => {
  let service: ResultPdfReportService;

  const resultsService = {
    findGeneralInfo: jest.fn(),
    findMetadataResult: jest.fn(),
    findResultAlignment: jest.fn(),
    findGeoLocation: jest.fn(),
  };
  const resultEvidencesService = {
    findPrincipalEvidence: jest.fn(),
  };
  const resultIpRightsService = {
    findByResultId: jest.fn(),
  };
  const clarisaLeversService = {
    homologatedData: jest.fn(),
    findByShortName: jest.fn(),
  };
  const contractRepo = { find: jest.fn() };
  const leverRepo = { find: jest.fn() };
  const institutionRepo = { find: jest.fn() };
  const resultRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultPdfReportService,
        { provide: ResultsService, useValue: resultsService },
        { provide: ResultEvidencesService, useValue: resultEvidencesService },
        { provide: ResultIpRightsService, useValue: resultIpRightsService },
        { provide: ClarisaLeversService, useValue: clarisaLeversService },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity) => {
              if (entity === ResultContract) return contractRepo;
              if (entity === ResultLever) return leverRepo;
              if (entity === ResultInstitution) return institutionRepo;
              if (entity === Result) return resultRepo;
              throw new Error(`Unexpected repository for ${entity?.name}`);
            }),
          },
        },
        {
          provide: AppConfig,
          useValue: { BUCKET_URL: 'https://bucket.example' },
        },
      ],
    }).compile();

    service = module.get(ResultPdfReportService);
  });

  it('builds all PDF sections for a result', async () => {
    resultsService.findGeneralInfo.mockResolvedValue({
      title: 'Title',
      description: 'Description',
      year: 2025,
      keywords: [],
      main_contact_person: null,
    });
    resultsService.findMetadataResult.mockResolvedValue({
      result_id: 10,
      result_official_code: 8245,
      indicator_id: 4,
      indicator_name: 'Capacity Sharing for Development',
    });
    resultsService.findResultAlignment.mockResolvedValue({
      contracts: [],
      primary_levers: [],
      contributor_levers: [],
      result_sdgs: [],
    });
    resultsService.findGeoLocation.mockResolvedValue({
      geo_scope_id: 1,
      regions: [],
      countries: [],
      comment_geo_scope: null,
    });
    resultEvidencesService.findPrincipalEvidence.mockResolvedValue({
      evidence: [],
      notable_references: [],
    });
    resultIpRightsService.findByResultId.mockResolvedValue({
      potential_asset: true,
    });
    contractRepo.find.mockResolvedValue([]);
    leverRepo.find.mockResolvedValue([]);
    institutionRepo.find.mockResolvedValue([]);
    resultRepo.findOne.mockResolvedValue({ is_partner_not_applicable: false });

    const report = await service.buildReport(10);

    expect(report.general_information.title).toBe('Title');
    expect(report.general_information.result_code).toBe(8245);
    expect(report.geographic_scope.geo_scope_id).toBe('1');
    expect(report.evidence.evidence).toEqual([]);
    expect(report.results_partners.is_partner_not_applicable).toBe(false);
    expect(report.ip_rights.potential_asset).toBe(true);
    expect(Object.keys(report)).toEqual([
      'general_information',
      'alliance_alignment',
      'results_partners',
      'geographic_scope',
      'evidence',
      'ip_rights',
    ]);
  });
});
