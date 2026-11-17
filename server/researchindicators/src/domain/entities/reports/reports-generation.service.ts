import { Injectable } from '@nestjs/common';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { ExportBilateralMappingQueryDto } from './dto/export-bilateral-mapping.query.dto';
import {
  FullFiltersReportDto,
  mergeFullFiltersReportDto,
} from './dto/filters-report.dto';
import { BilateralMappingWorkbookHandler } from './handlers/bilateral-mapping-workbook.handler';
import { ReportHandlerRegistry } from './report-handler.registry';

@Injectable()
export class ReportsGenerationService {
  constructor(
    private readonly registry: ReportHandlerRegistry,
    private readonly workbookBuilder: ExcelWorkbookBuilder,
    private readonly bilateralMappingWorkbook: BilateralMappingWorkbookHandler,
  ) {}

  // @akili-spec docs/specs/bilateral/mapping-filtered-export — T-04 / R-MFE-001
  // buildWorkbookXlsxBuffer stays the results-workbook path (DD-2).
  async buildBilateralMappingWorkbook(
    query: ExportBilateralMappingQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const built = await this.bilateralMappingWorkbook.build(query);
    const buffer = await this.workbookBuilder.toBuffer(built.spec);
    return { buffer, fileName: built.fileName };
  }

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
