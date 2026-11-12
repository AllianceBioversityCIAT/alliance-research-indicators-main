import { BadRequestException } from '@nestjs/common';
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
import { ReportMsApp } from '../../../../tools/broker/report-ms.app';
import { PortfoliosService } from '../../../portfolios/portfolios.service';
import { ResultSdg } from '../../../result-sdgs/entities/result-sdg.entity';
import { ResultStrategicObjective } from '../../../result-strategic-objectives/entities/result-strategic-objective.entity';
import { ResultImpactOutcome } from '../../../result-impact-outcomes/entities/result-impact-outcome.entity';
import { LeverRolesEnum } from '../../../lever-roles/enum/lever-roles.enum';

describe('ResultPdfReportService', () => {
  let service: ResultPdfReportService;

  const resultsService = {
    findGeneralInfo: jest.fn(),
    findMetadataResult: jest.fn(),
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
  const resultSdgRepo = { find: jest.fn() };
  const strategicObjectiveRepo = { find: jest.fn() };
  const impactOutcomeRepo = { find: jest.fn() };
  const portfoliosService = { findByYear: jest.fn() };
  const PORTFOLIO_1 = {
    id: 1,
    name: 'Portfolio 1',
    start_year: 2021,
    end_year: 2025,
  };
  const PORTFOLIO_2 = {
    id: 2,
    name: 'Portfolio 2',
    start_year: 2026,
    end_year: 2030,
  };
  const pdfViewerService = {
    postData: jest.fn(),
    renderPdf: jest.fn(),
  };
  const reportMsApp = {
    getPdfReport: jest.fn(),
  };

  const mockReportDependencies = () => {
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
      report_year: 2025,
    });
    portfoliosService.findByYear.mockResolvedValue(PORTFOLIO_1);
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
    resultSdgRepo.find.mockResolvedValue([]);
    strategicObjectiveRepo.find.mockResolvedValue([]);
    impactOutcomeRepo.find.mockResolvedValue([]);
    indicatorSectionRegistry.buildSections.mockResolvedValue({});
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
              if (entity === ResultSdg) return resultSdgRepo;
              if (entity === ResultStrategicObjective)
                return strategicObjectiveRepo;
              if (entity === ResultImpactOutcome) return impactOutcomeRepo;
              throw new Error(`Unexpected repository for ${entity?.name}`);
            }),
          },
        },
        {
          provide: AppConfig,
          useValue: { BUCKET_URL: 'https://bucket.example' },
        },
        { provide: PdfViewerService, useValue: pdfViewerService },
        { provide: ReportMsApp, useValue: reportMsApp },
        { provide: PortfoliosService, useValue: portfoliosService },
      ],
    }).compile();

    service = module.get(ResultPdfReportService);
  });

  it('builds all PDF sections and generates URL via report MS by default', async () => {
    mockReportDependencies();
    reportMsApp.getPdfReport.mockResolvedValue('https://s3.example/pdf');

    const pdfUrl = await service.buildReport(10, PdfTemplates.CAP_SHARING);

    expect(indicatorSectionRegistry.buildSections).toHaveBeenCalledWith(10, 4);
    expect(reportMsApp.getPdfReport).toHaveBeenCalledWith(
      PdfTemplates.CAP_SHARING,
      10,
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
      { paperWidth: undefined, paperHeight: undefined },
    );
    expect(
      reportMsApp.getPdfReport.mock.calls[0][2].cap_sharing,
    ).toBeUndefined();
    expect(Object.keys(reportMsApp.getPdfReport.mock.calls[0][2])).toEqual([
      'general_information',
      'alliance_alignment',
      'results_partners',
      'geographic_scope',
      'evidence',
      'ip_rights',
    ]);
    expect(pdfViewerService.postData).not.toHaveBeenCalled();
    expect(pdfViewerService.renderPdf).not.toHaveBeenCalled();
    expect(pdfUrl).toBe('https://s3.example/pdf');
  });

  it('renders HTML via pdf viewer when isHtml is true', async () => {
    mockReportDependencies();
    pdfViewerService.postData.mockResolvedValue('uuid-123');
    pdfViewerService.renderPdf.mockResolvedValue('<html>report</html>');

    const html = await service.buildReport(10, PdfTemplates.CAP_SHARING, true, {
      paperWidth: '600px',
      paperHeight: '1000px',
    });

    expect(reportMsApp.getPdfReport).not.toHaveBeenCalled();
    expect(pdfViewerService.postData).toHaveBeenCalledWith(
      expect.objectContaining({
        general_information: expect.objectContaining({
          title: 'Title',
          result_code: 8245,
        }),
      }),
    );
    expect(pdfViewerService.renderPdf).toHaveBeenCalledWith(
      PdfTemplates.CAP_SHARING,
      'uuid-123',
    );
    expect(html).toBe('<html>report</html>');
  });

  it('merges indicator-specific sections from the registry', async () => {
    mockReportDependencies();
    resultsService.findMetadataResult.mockResolvedValue({
      result_id: 17898,
      result_official_code: 8245,
      indicator_id: 1,
      indicator_name: 'Capacity Sharing for Development',
    });
    indicatorSectionRegistry.buildSections.mockResolvedValue({
      cap_sharing: {
        session_format_id: 1,
        individual: { trainee_name: 'test' },
        session_format_label: 'Individual training',
      },
    });
    reportMsApp.getPdfReport.mockResolvedValue(
      'https://s3.example/cap-sharing',
    );

    const pdfUrl = await service.buildReport(17898, PdfTemplates.CAP_SHARING);

    expect(indicatorSectionRegistry.buildSections).toHaveBeenCalledWith(
      17898,
      1,
    );
    expect(reportMsApp.getPdfReport).toHaveBeenCalledWith(
      PdfTemplates.CAP_SHARING,
      17898,
      expect.objectContaining({
        cap_sharing: {
          session_format_id: 1,
          individual: { trainee_name: 'test' },
          session_format_label: 'Individual training',
        },
      }),
      { paperWidth: undefined, paperHeight: undefined },
    );
    expect(pdfUrl).toBe('https://s3.example/cap-sharing');
  });

  it('renders the inn_dev template when the report asked is Innovation Development', async () => {
    mockReportDependencies();
    pdfViewerService.postData.mockResolvedValue('uuid-9');
    pdfViewerService.renderPdf.mockResolvedValue('<html>inn</html>');

    await service.buildReport(10, PdfTemplates.INN_DEV, true);

    expect(pdfViewerService.renderPdf).toHaveBeenCalledWith(
      PdfTemplates.INN_DEV,
      'uuid-9',
    );
  });

  it('resolves the portfolio from the reporting year and reads Portfolio 1 levers', async () => {
    mockReportDependencies();
    reportMsApp.getPdfReport.mockResolvedValue('url');

    await service.buildReport(10, PdfTemplates.CAP_SHARING);

    expect(portfoliosService.findByYear).toHaveBeenCalledWith(2025);
    expect(leverRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lever_role_id: LeverRolesEnum.ALIGNMENT,
        }),
      }),
    );
    expect(strategicObjectiveRepo.find).not.toHaveBeenCalled();
    const alignment =
      reportMsApp.getPdfReport.mock.calls[0][2].alliance_alignment;
    expect(alignment.portfolio).toEqual(PORTFOLIO_1);
    expect(alignment.primary_levers).toEqual([]);
  });

  it('reads Research Areas, Strategic Objectives and Impact Outcomes on Portfolio 2', async () => {
    mockReportDependencies();
    portfoliosService.findByYear.mockResolvedValue(PORTFOLIO_2);
    resultsService.findMetadataResult.mockResolvedValue({
      result_official_code: 8245,
      indicator_id: 4,
      indicator_name: 'Policy Change',
      report_year: 2026,
    });
    leverRepo.find.mockResolvedValue([
      {
        result_lever_id: 7,
        lever_id: '12',
        lever_role_id: 3,
        is_primary: true,
        lever: { short_name: 'Biodiversity' },
      },
    ]);
    strategicObjectiveRepo.find.mockResolvedValue([
      { strategic_objective: { id: 1, name: 'Objective' } },
    ]);
    impactOutcomeRepo.find.mockResolvedValue([
      { impact_outcome: { id: 2, name: 'Outcome' } },
    ]);
    reportMsApp.getPdfReport.mockResolvedValue('url');

    await service.buildReport(10, PdfTemplates.CAP_SHARING);

    expect(portfoliosService.findByYear).toHaveBeenCalledWith(2026);
    expect(leverRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lever_role_id: LeverRolesEnum.RESEARCH_AREAS_ALIGNMENT,
        }),
      }),
    );
    const alignment =
      reportMsApp.getPdfReport.mock.calls[0][2].alliance_alignment;
    expect(alignment.portfolio.id).toBe(2);
    expect(alignment.research_areas[0].short_name).toBe('Biodiversity');
    expect(alignment.strategic_objectives).toEqual([
      { id: 1, name: 'Objective' },
    ]);
    expect(alignment.impact_outcomes).toEqual([{ id: 2, name: 'Outcome' }]);
    expect(alignment.primary_levers).toBeUndefined();
  });

  it('sends no portfolio when the result has no reporting year', async () => {
    mockReportDependencies();
    resultsService.findMetadataResult.mockResolvedValue({
      result_official_code: 8245,
      indicator_id: 1,
      report_year: null,
    });
    reportMsApp.getPdfReport.mockResolvedValue('url');

    await service.buildReport(10, PdfTemplates.CAP_SHARING);

    expect(portfoliosService.findByYear).not.toHaveBeenCalled();
    expect(
      reportMsApp.getPdfReport.mock.calls[0][2].alliance_alignment.portfolio,
    ).toBeNull();
  });

  it('throws BadRequestException for unsupported report names', async () => {
    await expect(
      service.buildReport(10, 'unknown_report' as PdfTemplates),
    ).rejects.toThrow(BadRequestException);
  });
});
