import { PayloadTooLargeException } from '@nestjs/common';
import type { ExcelWorkbookSpec } from './excel-workbook.types';

/** Maximum rows per worksheet in Excel (.xlsx), inclusive. */
export const EXCEL_WORKSHEET_ROW_LIMIT = 1_048_576;

/**
 * Rows used before the first data row when the sheet preamble runs (rows 1–3) plus the
 * column-header row (row 4). Must match `ExcelWorkbookBuilder.renderPreamble` + header row.
 */
export const EXCEL_RESERVED_ROWS_WITH_PRESENTATION = 4;

/** Single header row when the sheet has no preamble. */
export const EXCEL_RESERVED_ROWS_WITHOUT_PRESENTATION = 1;

export function maxDataRowsForExcelSheet(hasPresentation: boolean): number {
  return (
    EXCEL_WORKSHEET_ROW_LIMIT -
    (hasPresentation
      ? EXCEL_RESERVED_ROWS_WITH_PRESENTATION
      : EXCEL_RESERVED_ROWS_WITHOUT_PRESENTATION)
  );
}

/**
 * Ensures no sheet would exceed the Excel row cap once preamble and headers are written.
 */
export function validateExcelWorkbookRowLimits(spec: ExcelWorkbookSpec): void {
  for (const sheet of spec.sheets) {
    const hasPresentation = !!sheet.presentation;
    const maxData = maxDataRowsForExcelSheet(hasPresentation);
    const n = sheet.rows.length;
    if (n > maxData) {
      throw new PayloadTooLargeException(
        `The Excel worksheet row limit (${EXCEL_WORKSHEET_ROW_LIMIT.toLocaleString('en-US')}) would be exceeded ` +
          `for sheet "${sheet.name}" with the current export (${n.toLocaleString('en-US')} data rows). ` +
          `The maximum number of data rows for this layout is ${maxData.toLocaleString('en-US')}. ` +
          'Narrow your filters and try again.',
      );
    }
  }
}
