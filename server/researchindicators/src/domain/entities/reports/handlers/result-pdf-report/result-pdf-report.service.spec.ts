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
import { ResultLeverSdgTarget } from '../../../result-lever-sdg-targets/entities/result-lever-sdg-target.entity';
import { ResultInstitution } from '../../../result-institutions/entities/result-institution.entity';
import { Result } from '../../../results/entities/result.entity';
import { ResultPdfIndicatorSectionRegistry } from './indicator-sections/result-pdf-indicator-section.registry';
import { PdfViewerService } from '../../../../tools/pdf-viewer/pdf-viewer.service';
import { PdfTemplates } from '../../../../tools/pdf-viewer/enums/pdf-templates.enum';

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
  const indicatorSectionRegistry = {
    buildSections: jest.fn(),
  };
  const clarisaLeversService = {
    homologatedData: jest.fn(),
    findByShortName: jest.fn(),
  };
  const contractRepo = { find: jest.fn() };
  const leverRepo = { find: jest.fn() };
  const sdgTargetRepo = { find: jest.fn() };
  const institutionRepo = { find: jest.fn() };
  const resultRepo = { findOne: jest.fn() };
  const pdfViewerService = {
    postData: jest.fn(),
    renderPdf: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultPdfReportService,
        { provide: ResultsService, useValue: resultsService },
        { provide: ResultEvidencesService, useValue: resultEvidencesService },
        { provide: ResultIpRightsService, useValue: resultIpRightsService },
        {
          provide: ResultPdfIndicatorSectionRegistry,
          useValue: indicatorSectionRegistry,
        },
        { provide: ClarisaLeversService, useValue: clarisaLeversService },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity) => {
              if (entity === ResultContract) return contractRepo;
              if (entity === ResultLever) return leverRepo;
              if (entity === ResultLeverSdgTarget) return sdgTargetRepo;
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
        { provide: PdfViewerService, useValue: pdfViewerService },
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
    sdgTargetRepo.find.mockResolvedValue([]);
    institutionRepo.find.mockResolvedValue([]);
    resultRepo.findOne.mockResolvedValue({ is_partner_not_applicable: false });
    indicatorSectionRegistry.buildSections.mockResolvedValue({});
    pdfViewerService.postData.mockResolvedValue('uuid-123');
    pdfViewerService.renderPdf.mockResolvedValue('pdf-base64-string');

    const pdf = await service.buildReport(10);

    expect(indicatorSectionRegistry.buildSections).toHaveBeenCalledWith(10, 4);
    expect(pdfViewerService.postData).toHaveBeenCalledWith(
      expect.objectContaining({
        general_information: expect.objectContaining({
          title: 'Title',
          result_code: 8245,
        }),
        geographic_scope: expect.objectContaining({
          geo_scope_id: '1',
        }),
        evidence: expect.objectContaining({
          evidence: [],
        }),
        results_partners: expect.objectContaining({
          is_partner_not_applicable: false,
        }),
        ip_rights: expect.objectContaining({
          potential_asset: true,
        }),
      }),
    );
    expect(
      pdfViewerService.postData.mock.calls[0][0].cap_sharing,
    ).toBeUndefined();
    expect(Object.keys(pdfViewerService.postData.mock.calls[0][0])).toEqual([
      'general_information',
      'alliance_alignment',
      'results_partners',
      'geographic_scope',
      'evidence',
      'ip_rights',
    ]);
    expect(pdfViewerService.renderPdf).toHaveBeenCalledWith(
      PdfTemplates.CAP_SHARING,
      'uuid-123',
    );
    expect(pdf).toBe('pdf-base64-string');
  });

  it('merges indicator-specific sections from the registry', async () => {
    resultsService.findGeneralInfo.mockResolvedValue({
      title: 'Cap sharing title',
      description: 'Description',
      year: 2026,
      keywords: [],
      main_contact_person: null,
    });
    resultsService.findMetadataResult.mockResolvedValue({
      result_id: 17898,
      result_official_code: 8245,
      indicator_id: 1,
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
    resultIpRightsService.findByResultId.mockResolvedValue({});
    contractRepo.find.mockResolvedValue([]);
    leverRepo.find.mockResolvedValue([]);
    sdgTargetRepo.find.mockResolvedValue([]);
    institutionRepo.find.mockResolvedValue([]);
    resultRepo.findOne.mockResolvedValue({ is_partner_not_applicable: false });
    indicatorSectionRegistry.buildSections.mockResolvedValue({
      cap_sharing: {
        session_format_id: 1,
        individual: { trainee_name: 'test' },
        session_format_label: 'Individual training',
      },
    });
    pdfViewerService.postData.mockResolvedValue('uuid-cap');
    pdfViewerService.renderPdf.mockResolvedValue('pdf-cap-sharing');

    const pdf = await service.buildReport(17898);

    expect(indicatorSectionRegistry.buildSections).toHaveBeenCalledWith(
      17898,
      1,
    );
    expect(pdfViewerService.postData).toHaveBeenCalledWith(
      expect.objectContaining({
        cap_sharing: {
          session_format_id: 1,
          individual: { trainee_name: 'test' },
          session_format_label: 'Individual training',
        },
      }),
    );
    expect(pdfViewerService.renderPdf).toHaveBeenCalledWith(
      PdfTemplates.CAP_SHARING,
      'uuid-cap',
    );
    expect(pdf).toBe('pdf-cap-sharing');
  });
});
