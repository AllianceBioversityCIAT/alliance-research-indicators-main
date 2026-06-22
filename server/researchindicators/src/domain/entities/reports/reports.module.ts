import { Module } from '@nestjs/common';
import { ResultsModule } from '../results/results.module';
import { ResultEvidencesModule } from '../result-evidences/result-evidences.module';
import { ResultIpRightsModule } from '../result-ip-rights/result-ip-rights.module';
import { ClarisaLeversModule } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.module';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';
import { ExcelWorkbookBuilder } from './core/excel-workbook.builder';
import { WorkbookSheetOrderResolver } from './core/workbook-sheet-order.resolver';
import { StarResultsMetadataWorkbookHandler } from './handlers/star-results-metadata/star-results-metadata-workbook.handler';
import { ReportLayoutRepository } from './repositories/report-layout.repository';
import { StarResultsExportRepository } from './repositories/star-results-export.repository';
import { ReportHandlerRegistry } from './report-handler.registry';
import { ReportsGenerationService } from './reports-generation.service';
import { ReportsController } from './reports.controller';
import { ResultPdfReportService } from './handlers/result-pdf-report/result-pdf-report.service';
import { ResultPdfIndicatorSectionRegistry } from './handlers/result-pdf-report/indicator-sections/result-pdf-indicator-section.registry';
import { RESULT_PDF_INDICATOR_SECTION_HANDLERS } from './handlers/result-pdf-report/indicator-sections/result-pdf-indicator-section.registry';
import { CapSharingPdfSectionHandler } from './handlers/result-pdf-report/indicator-sections/cap-sharing/cap-sharing-pdf-section.handler';
import { PdfViewerModule } from '../../tools/pdf-viewer/pdf-viewer.module';
import { ReportMsApp } from '../../tools/broker/report-ms.app';

@Module({
  imports: [
    ResultsModule,
    ResultEvidencesModule,
    ResultIpRightsModule,
    ResultCapacitySharingModule,
    ClarisaLeversModule,
    PdfViewerModule,
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
    CapSharingPdfSectionHandler,
    {
      provide: RESULT_PDF_INDICATOR_SECTION_HANDLERS,
      useFactory: (capSharing: CapSharingPdfSectionHandler) => [capSharing],
      inject: [CapSharingPdfSectionHandler],
    },
    ResultPdfIndicatorSectionRegistry,
    ResultPdfReportService,
    ReportMsApp
  ],
  exports: [ReportsGenerationService, ReportHandlerRegistry],
})
export class ReportsModule { }
