import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../entities/app-config/app-config.service';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { BaseApi } from '../core/base-api';
import {
  PrmsNormalizerRequestDto,
  PrmsNormalizerResponseBodyDto,
  PrmsNormalizerTransportResponseDto,
} from './dto/prms-normalizer.dto';

@Injectable()
export class PrmsNormalizerService extends BaseApi {
  protected logger = new LoggerUtil({ name: PrmsNormalizerService.name });

  constructor(
    private readonly appConfigService: AppConfigService,
    httpService: HttpService,
    appConfig: AppConfig,
  ) {
    super(
      httpService,
      appConfig.ARI_PRMS_NORMALIZER_HOST,
      PrmsNormalizerService.name,
    );
  }

  async ingest(
    envelope: PrmsNormalizerRequestDto,
  ): Promise<PrmsNormalizerTransportResponseDto | null> {
    this.assertHost();

    const apiKeyConfig = await this.appConfigService.getEnv(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
    const apiKey = apiKeyConfig?.simple_value;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'PRMS Normalizer API key configuration is missing',
      );
    }

    const defaultConfig = this._defaultConfig;
    const response = await firstValueFrom(
      this.postRequest<PrmsNormalizerRequestDto, PrmsNormalizerResponseBodyDto>(
        'ingest',
        envelope,
        {
          ...defaultConfig,
          headers: {
            ...defaultConfig.headers,
            'x-api-key': apiKey,
          },
          validateStatus: () => true,
        },
      ),
    );

    if (!response) {
      this.logger._warn('PRMS Normalizer returned no HTTP response');
      return null;
    }

    this.logger._log(`PRMS Normalizer responded with HTTP ${response.status}`);
    return { status: response.status, body: response.data };
  }

  private assertHost(): void {
    if (!this.externalAppEndpoint?.trim()) {
      throw new ServiceUnavailableException(
        'PRMS Normalizer host is not configured (ARI_PRMS_NORMALIZER_HOST)',
      );
    }
  }
}
