import { Test, TestingModule } from '@nestjs/testing';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { ReportHandlerRegistry } from './report-handler.registry';
import type { FullFiltersReportDto } from './dto/filters-report.dto';
import { ReportsGenerationService } from './reports-generation.service';
import { ResultSortEnum } from '../results/enum/result-sort.enum';

describe('ReportsGenerationService', () => {
  let service: ReportsGenerationService;
  const buildWorkbookSpec = jest.fn();
  const toBuffer = jest.fn();

  beforeEach(async () => {
    buildWorkbookSpec.mockReset();
    toBuffer.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsGenerationService,
        {
          provide: ReportHandlerRegistry,
          useValue: {
            getHandler: jest.fn(() => ({
              workbookKey: 'star_results_metadata',
              buildWorkbookSpec,
            })),
          },
        },
        {
          provide: ExcelWorkbookBuilder,
          useValue: { toBuffer },
        },
      ],
    }).compile();
    service = module.get(ReportsGenerationService);
  });

  it('merges filters, builds spec, and returns xlsx buffer', async () => {
    const spec = { sheets: [] };
    buildWorkbookSpec.mockResolvedValue(spec);
    toBuffer.mockResolvedValue(Buffer.from('xlsx'));
    const filters: FullFiltersReportDto = {
      filters: {
        search: 'q',
        statusCodes: [],
        contractCodes: [],
        years: [],
        platformCode: [],
        indicators: [],
        onlyOwnResults: false,
      },
      sorting: { sortOrder: 'ASC', sortField: ResultSortEnum.RESULT_TITLE },
    };
    const buf = await service.buildWorkbookXlsxBuffer(
      'star_results_metadata',
      filters,
    );
    expect(buf.equals(Buffer.from('xlsx'))).toBe(true);
    expect(buildWorkbookSpec).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ search: 'q' }),
        sorting: { sortOrder: 'ASC', sortField: ResultSortEnum.RESULT_TITLE },
      }),
    );
    expect(toBuffer).toHaveBeenCalledWith(spec);
  });
});
