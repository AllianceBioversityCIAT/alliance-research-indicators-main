import { Module } from '@nestjs/common';
import { ResultsModule } from '../results/results.module';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { WorkbookSheetOrderResolver } from './core/workbook-sheet-order.resolver';
import { StarResultsMetadataWorkbookHandler } from './handlers/star-results-metadata/star-results-metadata-workbook.handler';
import { ReportLayoutRepository } from './repositories/report-layout.repository';
import { StarResultsExportRepository } from './repositories/star-results-export.repository';
import { ReportHandlerRegistry } from './report-handler.registry';
import { ReportsGenerationService } from './reports-generation.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [ResultsModule],
  controllers: [ReportsController],
  providers: [
    ExcelWorkbookBuilder,
    WorkbookSheetOrderResolver,
    ReportLayoutRepository,
    StarResultsExportRepository,
    StarResultsMetadataWorkbookHandler,
    ReportHandlerRegistry,
    ReportsGenerationService,
  ],
  exports: [ReportsGenerationService, ReportHandlerRegistry],
})
export class ReportsModule {}
