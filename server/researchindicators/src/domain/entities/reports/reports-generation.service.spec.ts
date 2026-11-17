import { Test, TestingModule } from '@nestjs/testing';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { ReportHandlerRegistry } from './report-handler.registry';
import type { FullFiltersReportDto } from './dto/filters-report.dto';
import { BilateralMappingWorkbookHandler } from './handlers/bilateral-mapping-workbook.handler';
import { ReportsGenerationService } from './reports-generation.service';
import { ResultSortEnum } from '../results/enum/result-sort.enum';

describe('ReportsGenerationService', () => {
  let service: ReportsGenerationService;
  const buildWorkbookSpec = jest.fn();
  const toBuffer = jest.fn();
  const buildBilateral = jest.fn();

  beforeEach(async () => {
    buildWorkbookSpec.mockReset();
    toBuffer.mockReset();
    buildBilateral.mockReset();
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
        {
          provide: BilateralMappingWorkbookHandler,
          useValue: { build: buildBilateral },
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

  it('returns the bilateral buffer and the handler file name', async () => {
    const spec = { sheets: [] };
    buildBilateral.mockResolvedValue({
      spec,
      fileName: 'Bilateral_Mapping_2031_20261020.xlsx',
    });
    toBuffer.mockResolvedValue(Buffer.from('xlsx-bytes'));

    const out = await service.buildBilateralMappingWorkbook({
      status: 'mapped',
    });

    expect(buildBilateral).toHaveBeenCalledWith({ status: 'mapped' });
    expect(toBuffer).toHaveBeenCalledWith(spec);
    expect(out.fileName).toBe('Bilateral_Mapping_2031_20261020.xlsx');
    expect(out.buffer.equals(Buffer.from('xlsx-bytes'))).toBe(true);
  });
});
