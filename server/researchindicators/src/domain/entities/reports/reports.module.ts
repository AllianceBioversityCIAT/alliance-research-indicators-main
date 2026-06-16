import { Module } from '@nestjs/common';
import { ResultsModule } from '../results/results.module';
import { ResultEvidencesModule } from '../result-evidences/result-evidences.module';
import { ResultIpRightsModule } from '../result-ip-rights/result-ip-rights.module';
import { ClarisaLeversModule } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.module';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { WorkbookSheetOrderResolver } from './core/workbook-sheet-order.resolver';
import { StarResultsMetadataWorkbookHandler } from './handlers/star-results-metadata/star-results-metadata-workbook.handler';
import { ReportLayoutRepository } from './repositories/report-layout.repository';
import { StarResultsExportRepository } from './repositories/star-results-export.repository';
import { ReportHandlerRegistry } from './report-handler.registry';
import { ReportsGenerationService } from './reports-generation.service';
import { ReportsController } from './reports.controller';
import { ResultPdfReportService } from './handlers/result-pdf-report/result-pdf-report.service';

@Module({
  imports: [
    ResultsModule,
    ResultEvidencesModule,
    ResultIpRightsModule,
    ClarisaLeversModule,
  ],
  controllers: [ReportsController],
  providers: [
    ExcelWorkbookBuilder,
    WorkbookSheetOrderResolver,
    ReportLayoutRepository,
    StarResultsExportRepository,
    StarResultsMetadataWorkbookHandler,
    ReportHandlerRegistry,
    ReportsGenerationService,
    ResultPdfReportService,
  ],
  exports: [ReportsGenerationService, ReportHandlerRegistry],
})
export class ReportsModule {}
