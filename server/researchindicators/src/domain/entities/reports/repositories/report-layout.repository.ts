import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { WorkbookSheetRow } from '../core/excel-workbook.types';

export type ReportDataDictionaryRow = {
  section: string | null;
  field_label: string;
  explanation: string | null;
  section_fill_argb: string | null;
};

export type ReportWorkbookColumnGroupRow = {
  from_col: number;
  to_col: number;
  label: string;
  fill_argb: string;
};

@Injectable()
export class ReportLayoutRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findActiveSheets(workbookKey: string): Promise<WorkbookSheetRow[]> {
    return this.dataSource.query(
      `
      SELECT sheet_key, sheet_name, sort_order
      FROM report_workbook_sheet
      WHERE workbook_key = ? AND is_active = TRUE
      ORDER BY sort_order ASC
    `,
      [workbookKey],
    ) as Promise<WorkbookSheetRow[]>;
  }

  async findDataDictionaryRows(
    workbookKey: string,
  ): Promise<ReportDataDictionaryRow[]> {
    return this.dataSource.query(
      `
      SELECT section, field_label, explanation, section_fill_argb
      FROM report_data_dictionary
      WHERE workbook_key = ? AND is_active = TRUE
      ORDER BY sort_order ASC
    `,
      [workbookKey],
    ) as Promise<ReportDataDictionaryRow[]>;
  }

  async findColumnGroups(
    workbookKey: string,
    sheetKey: string,
  ): Promise<ReportWorkbookColumnGroupRow[]> {
    return this.dataSource.query(
      `
      SELECT from_col, to_col, label, fill_argb
      FROM report_workbook_column_group
      WHERE workbook_key = ? AND sheet_key = ? AND is_active = TRUE
      ORDER BY sort_order ASC
    `,
      [workbookKey, sheetKey],
    ) as Promise<ReportWorkbookColumnGroupRow[]>;
  }
}
