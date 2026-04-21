import { Injectable } from '@nestjs/common';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { ReportHandlerRegistry } from './report-handler.registry';
import {
  FullFiltersReportDto,
  mergeFullFiltersReportDto,
} from './dto/filters-report.dto';

@Injectable()
export class ReportsGenerationService {
  constructor(
    private readonly registry: ReportHandlerRegistry,
    private readonly workbookBuilder: ExcelWorkbookBuilder,
  ) {}

  async buildWorkbookXlsxBuffer(
    workbookKey: string,
    filters: FullFiltersReportDto,
  ): Promise<Buffer> {
    const handler = this.registry.getHandler(workbookKey);
    const spec = await handler.buildWorkbookSpec(
      mergeFullFiltersReportDto(filters),
    );
    return this.workbookBuilder.toBuffer(spec);
  }
}
