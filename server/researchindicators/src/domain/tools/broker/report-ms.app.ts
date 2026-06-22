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
            paperWidth?: string;
            paperHeight?: string;
        },
    ): Promise<string> {
        const fileName = `${this.appConfig.ARI_MIS}-result-${resultOfficialCode}_${formatDateForFileName(undefined, FileDateFormat.COMPACT_DATETIME)}`;
        const paperWidth = (options?.paperWidth ?? '600') + 'px';
        const paperHeight = (options?.paperHeight ?? '1000') + 'px';

        const request: DeepPartial<PdfReportRequest<T>> = {
            apiKey: env.ARI_CLARISA_API_KEY,
            data,
            templateName: pdfTemplate,
            bucketName: env.ARI_REPORT_MS_BUCKET,
            fileName,
            paperWidth,
            paperHeight,
        };

        return await this.sendToPattern<
            DeepPartial<PdfReportRequest<T>>,
            PdfReportResponse
        >('pdf.generateUrl', request)
            .catch((error) => {
                this._logger.error(`Error generating PDF report: \n${JSON.stringify(error, null, 2)}`);
                throw error;
            })
            .then((res) => res?.data?.url);
    }
}

export type PdfReportRequest<Y> = {
    apiKey: string;
    data: Y;
    templateName: string;
    bucketName: string;
    fileName: string;
    paperWidth: string;
    paperHeight: string;
};

export type PdfReportResponse = {
    description: string;
    status: number;
    data: {
        url: string;
    };
};
