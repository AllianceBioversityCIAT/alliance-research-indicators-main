import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ReportDataDictionaryRow = {
  section: string | null;
  field_label: string;
  explanation: string | null;
  section_fill_argb: string | null;
};

@Injectable()
export class ReportLayoutRepository {
  constructor(private readonly dataSource: DataSource) {}

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
}
