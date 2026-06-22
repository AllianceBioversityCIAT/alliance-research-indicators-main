import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../entities/app-config/app-config.service';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { BaseApi } from '../core/base-api';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../shared/utils/app-config.util';
import { firstValueFrom } from 'rxjs';
import { PdfTemplates } from './enums/pdf-templates.enum';

@Injectable()
export class PdfViewerService extends BaseApi {
  constructor(
    private readonly appConfigService: AppConfigService,
    httpService: HttpService,
    appConfig: AppConfig,
  ) {
    super(httpService, appConfig.PDF_VIEWER_URL, PdfViewerService.name);
    this.setApiKey();
  }

  async setApiKey(): Promise<void> {
    const appConfigApiKey = await this.appConfigService.getEnv(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
    this.customHeaders = {
      'x-api-key': appConfigApiKey?.simple_value,
    };
  }

  async postData(data: any): Promise<string> {
    return await firstValueFrom(
      this.postRequest<any, { uuid: string }>('api/data', data),
    )
      .then((res) => res.data.uuid)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  async renderPdf(
    template: PdfTemplates,
    uuid: string,
    paperSize?: { width?: number; height?: number },
  ): Promise<string> {
    const width = paperSize?.width ?? 600;
    const height = paperSize?.height ?? 1000;
    return await firstValueFrom(
      this.getRequest<string>(
        `${template}?uuid=${uuid}&&paperWidth=${width}&paperHeight=${height}`,
      ),
    )
      .then((res) => res.data)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }
}
