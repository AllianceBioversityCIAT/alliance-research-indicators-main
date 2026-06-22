import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultsUtil } from '../../shared/utils/results.util';
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
