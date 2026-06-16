import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultsUtil } from '../../shared/utils/results.util';
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

  it('returns PDF report sections for the current result', async () => {
    buildReport.mockResolvedValue({
      general_information: { result_code: 8245 },
      alliance_alignment: {},
      results_partners: {},
      geographic_scope: {},
      evidence: {},
      ip_rights: {},
    });

    const response = await controller.findPdfReportSections();

    expect(buildReport).toHaveBeenCalledWith(321);
    expect(response).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          general_information: { result_code: 8245 },
        }),
      }),
    );
  });
});
