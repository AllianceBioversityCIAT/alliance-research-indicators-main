import {
  BadRequestException,
  HttpStatus,
  INestApplication,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { PdfTemplates } from '../../tools/pdf-viewer/enums/pdf-templates.enum';
import { ResultSortEnum } from '../results/enum/result-sort.enum';
import { ReportsController } from './reports.controller';
import { ReportsGenerationService } from './reports-generation.service';
import { ResultPdfReportService } from './handlers/result-pdf-report/result-pdf-report.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  const buildWorkbookXlsxBuffer = jest.fn();
  const buildReport = jest.fn();

  beforeEach(async () => {
    buildWorkbookXlsxBuffer.mockReset();
    buildReport.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsGenerationService,
          useValue: { buildWorkbookXlsxBuffer },
        },
        {
          provide: ResultPdfReportService,
          useValue: { buildReport },
        },
        {
          provide: CurrentUserUtil,
          useValue: {
            user_id: 99,
            user: {
              sec_user_id: 99,
              first_name: 'Jane',
              last_name: 'Tester',
              email: 'jane@example.org',
              roles: [],
            },
          },
        },
        {
          provide: ResultsUtil,
          useValue: {
            setup: jest.fn().mockResolvedValue(undefined),
            resultId: 321,
          },
        },
        mockPortfolioUtilProvider,
        SetUpInterceptor,
      ],
    }).compile();
    controller = module.get(ReportsController);
  });

  it('returns StreamableFile with xlsx buffer and dated filename', async () => {
    buildWorkbookXlsxBuffer.mockResolvedValue(Buffer.from('blob'));
    const file = await controller.downloadWorkbook(
      '',
      'DESC',
      ResultSortEnum.CODE,
      [],
      [],
      [],
      [],
      [],
      false,
    );
    expect(file.getStream()).toBeDefined();
    expect(buildWorkbookXlsxBuffer).toHaveBeenCalledWith(
      'star_results_metadata',
      expect.objectContaining({
        filters: expect.objectContaining({
          currentUserId: 99,
          onlyOwnResults: false,
        }),
        sorting: { sortOrder: 'DESC', sortField: ResultSortEnum.CODE },
      }),
    );
  });

  it('passes currentUserDisplayName when only own results is enabled', async () => {
    buildWorkbookXlsxBuffer.mockResolvedValue(Buffer.from('blob'));
    await controller.downloadWorkbook(
      '',
      'DESC',
      ResultSortEnum.CODE,
      [],
      [],
      [],
      [],
      [],
      true,
    );
    expect(buildWorkbookXlsxBuffer).toHaveBeenCalledWith(
      'star_results_metadata',
      expect.objectContaining({
        filters: expect.objectContaining({
          onlyOwnResults: true,
          currentUserDisplayName: 'Jane Tester',
        }),
      }),
    );
  });

  it('throws BadRequestException when workbook key is not allowed', async () => {
    (
      controller as unknown as { allowedWorkbookKeys: Set<string> }
    ).allowedWorkbookKeys = new Set();
    await expect(
      controller.downloadWorkbook(
        '',
        'DESC',
        ResultSortEnum.CODE,
        [],
        [],
        [],
        [],
        [],
        false,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  describe('findPdfReportSections', () => {
    it('returns PDF URL from report MS by default', async () => {
      buildReport.mockResolvedValue('https://s3.example/pdf');

      const response = await controller.findPdfReportSections(
        TrueFalseEnum.FALSE,
        '600px',
        '1000px',
        PdfTemplates.CAP_SHARING,
      );

      expect(buildReport).toHaveBeenCalledWith(
        321,
        PdfTemplates.CAP_SHARING,
        false,
        { paperWidth: '600px', paperHeight: '1000px' },
      );
      expect(response).toEqual(
        expect.objectContaining({
          data: 'https://s3.example/pdf',
          status: 200,
          description: 'PDF report sections were found correctly',
        }),
      );
    });

    it('requests HTML report when is-html is true', async () => {
      buildReport.mockResolvedValue('<html>report</html>');

      await controller.findPdfReportSections(
        TrueFalseEnum.TRUE,
        '800px',
        '1200px',
        PdfTemplates.CAP_SHARING,
      );

      expect(buildReport).toHaveBeenCalledWith(
        321,
        PdfTemplates.CAP_SHARING,
        true,
        { paperWidth: '800px', paperHeight: '1200px' },
      );
    });
  });
});

describe('GET bilateralMapping/xlsx (R-MFE-001, NFR-MFE-002)', () => {
  const buildBilateralMappingWorkbook = jest.fn();
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsGenerationService,
          useValue: { buildBilateralMappingWorkbook },
        },
        {
          provide: ResultPdfReportService,
          useValue: { buildReport: jest.fn() },
        },
        {
          provide: CurrentUserUtil,
          useValue: { user_id: 7, user: { roles: [] } },
        },
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        mockPortfolioUtilProvider,
        SetUpInterceptor,
        Reflector,
        RolesGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req, _res, next) => {
      const header = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 7,
        roles: header ? JSON.parse(String(header)) : [],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    buildBilateralMappingWorkbook.mockReset();
    buildBilateralMappingWorkbook.mockResolvedValue({
      buffer: Buffer.from('xlsx'),
      fileName: 'Bilateral_Mapping_2031_20261020.xlsx',
    });
  });

  it('declares CENTER_ADMIN and SYSTEM_ADMIN on the handler', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ReportsController.prototype.downloadBilateralMapping,
    );
    expect(roles).toEqual([
      SecRolesEnum.CENTER_ADMIN,
      SecRolesEnum.SYSTEM_ADMIN,
    ]);
  });

  it('documents the route under Reports with one query per filter', () => {
    const tags = Reflect.getMetadata(DECORATORS.API_TAGS, ReportsController);
    const operation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      ReportsController.prototype.downloadBilateralMapping,
    );
    const parameters = Reflect.getMetadata(
      DECORATORS.API_PARAMETERS,
      ReportsController.prototype.downloadBilateralMapping,
    ) as Array<{ name?: string }>;

    expect(tags).toEqual(['Reports']);
    expect(operation.summary).toEqual(expect.any(String));
    expect(parameters.map((parameter) => parameter.name).sort()).toEqual([
      'search',
      'source',
      'status',
    ]);
  });

  it('is outside the result-code pdf capture', () => {
    const pdfPath = Reflect.getMetadata(
      PATH_METADATA,
      ReportsController.prototype.findPdfReportSections,
    );
    const exportPath = Reflect.getMetadata(
      PATH_METADATA,
      ReportsController.prototype.downloadBilateralMapping,
    );

    expect(RESULT_CODE).toBe(':resultCode(\\d+)');
    expect(pdfPath).toBe(`${RESULT_CODE}/pdf`);
    expect(exportPath).toBe('bilateralMapping/xlsx');
    expect(String(exportPath)).not.toMatch(/^\d+\/pdf$/);
    expect('15/pdf').toMatch(/^\d+\/pdf$/);
  });

  it.each([
    ['CENTER_ADMIN', [SecRolesEnum.CENTER_ADMIN]],
    ['SYSTEM_ADMIN', [SecRolesEnum.SYSTEM_ADMIN]],
  ])('returns the server file name for %s', async (_label, roles) => {
    const response = await request(app.getHttpServer())
      .get('/bilateralMapping/xlsx')
      .set('x-test-roles', JSON.stringify(roles));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="Bilateral_Mapping_2031_20261020.xlsx"',
    );
    expect(buildBilateralMappingWorkbook).toHaveBeenCalledTimes(1);
  });

  it('forbids a user without the role and does not build the file', async () => {
    const response = await request(app.getHttpServer())
      .get('/bilateralMapping/xlsx')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]));

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(buildBilateralMappingWorkbook).not.toHaveBeenCalled();
  });

  it('rejects an unknown query param with 400 and does not build the file', async () => {
    const response = await request(app.getHttpServer())
      .get('/bilateralMapping/xlsx')
      .query({ page: '1' })
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]));

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(buildBilateralMappingWorkbook).not.toHaveBeenCalled();
  });
});
