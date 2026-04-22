import { PayloadTooLargeException } from '@nestjs/common';
import {
  EXCEL_RESERVED_ROWS_WITH_PRESENTATION,
  EXCEL_RESERVED_ROWS_WITHOUT_PRESENTATION,
  EXCEL_WORKSHEET_ROW_LIMIT,
  maxDataRowsForExcelSheet,
  validateExcelWorkbookRowLimits,
} from './excel-workbook.row-limit';
import type { ExcelWorkbookSpec } from './excel-workbook.types';

describe('excel-workbook.row-limit', () => {
  it('reserves four rows when the sheet has presentation', () => {
    expect(
      EXCEL_WORKSHEET_ROW_LIMIT - EXCEL_RESERVED_ROWS_WITH_PRESENTATION,
    ).toBe(maxDataRowsForExcelSheet(true));
  });

  it('reserves one row when the sheet has no presentation', () => {
    expect(
      EXCEL_WORKSHEET_ROW_LIMIT - EXCEL_RESERVED_ROWS_WITHOUT_PRESENTATION,
    ).toBe(maxDataRowsForExcelSheet(false));
  });

  it('throws when data rows would exceed the Excel cap (with presentation)', () => {
    const max = maxDataRowsForExcelSheet(true);
    const rows: Record<string, unknown>[] = [];
    rows.length = max + 1;
    const spec: ExcelWorkbookSpec = {
      sheets: [
        {
          name: 'Raw data',
          columns: [{ key: 'a', header: 'A' }],
          rows,
          presentation: {
            bannerTitle: 'T',
            bannerTitleMergeFromCol: 1,
            bannerTitleMergeToCol: 1,
            columnGroups: [
              { fromCol: 1, toCol: 1, label: 'G', fillArgb: 'FF000000' },
            ],
          },
        },
      ],
    };
    expect(() => validateExcelWorkbookRowLimits(spec)).toThrow(
      PayloadTooLargeException,
    );
    expect(() => validateExcelWorkbookRowLimits(spec)).toThrow(
      /row limit \(1,048,576\) would be exceeded/,
    );
    expect(() => validateExcelWorkbookRowLimits(spec)).toThrow(/Raw data/);
  });

  it('allows exactly max data rows with presentation', () => {
    const max = maxDataRowsForExcelSheet(true);
    const rows: Record<string, unknown>[] = [];
    rows.length = max;
    const spec: ExcelWorkbookSpec = {
      sheets: [
        {
          name: 'S',
          columns: [{ key: 'a', header: 'A' }],
          rows,
          presentation: {
            bannerTitle: 'T',
            bannerTitleMergeFromCol: 1,
            bannerTitleMergeToCol: 1,
            columnGroups: [
              { fromCol: 1, toCol: 1, label: 'G', fillArgb: 'FF000000' },
            ],
          },
        },
      ],
    };
    expect(() => validateExcelWorkbookRowLimits(spec)).not.toThrow();
  });
});
