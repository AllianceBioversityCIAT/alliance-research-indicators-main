import { env } from 'process';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { Injectable } from '@nestjs/common';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PdfTemplates } from '../pdf-viewer/enums/pdf-templates.enum';
import { DeepPartial } from 'typeorm';
import { AppConfig } from '../../shared/utils/app-config.util';
import {
    FileDateFormat,
    formatDateForFileName,
} from '../../shared/utils/format-date.util';

@Injectable()
export class ReportMsApp extends BrokerConnectionBase {
    protected readonly _logger = new LoggerUtil({ name: ReportMsApp.name });
    constructor(private readonly appConfig: AppConfig) {
        super(env.ARI_REPORT_MS_QUEUE);
    }

    async getPdfReport<T>(
        pdfTemplate: PdfTemplates,
        resultOfficialCode: number,
        data: T,
        options?: {
            format?: string;
            orientation?: string;
            border?: string;
            font?: string;
        },
    ): Promise<string> {
        const fileName = `${this.appConfig.ARI_MIS}-result-${resultOfficialCode}_${formatDateForFileName(undefined, FileDateFormat.COMPACT_DATETIME)}`;

        const request: DeepPartial<PdfReportRequest<T>> = {
            apiKey: env.ARI_CLARISA_API_KEY,
            data,
            templateName: pdfTemplate,
            bucketName: env.ARI_REPORT_MS_BUCKET,
            fileName,
            paperWidth: '600px',
            paperHeight: '1000px',
        };

        return await this.sendToPattern<DeepPartial<PdfReportRequest<T>>, string>(
            'pdf.generateUrl',
            request,
        ).catch((error) => {
            this._logger.error(`Error generating PDF report: ${error}`);
            throw error;
        });
    }
}

export type PdfReportRequest<Y> = {
    apiKey: string;
    data: {
        reportId: number;
        locale?: string;
        includeCharts?: boolean;
    };
    templateName: string;
    bucketName: string;
    fileName: string;
    paperWidth: string;
    paperHeight: string;
}


