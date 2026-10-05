import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
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
import {
  PrmsWebhookApiResponseDto,
  PrmsWebhookDestinationDto,
  PrmsWebhookReadResultDto,
  PrmsWebhookRegisterRequestDto,
  PrmsWebhookRegistrationResultDto,
} from './dto/prms-webhook.dto';

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

  /**
   * Registers STAR's callback URL with PRMS (`POST {host}/webhook`).
   * The body is exactly `{ url }` — [WH] §1 accepts no other property.
   * `NotFoundException` from `getEnv` propagates; an empty key is `503`.
   */
  async registerWebhook(
    url: string,
  ): Promise<PrmsWebhookRegistrationResultDto> {
    this.assertHost();
    const apiKey = await this.readClarisaApiKey();
    const body: PrmsWebhookRegisterRequestDto = { url };

    const httpResponse = await firstValueFrom(
      this.postRequest<
        PrmsWebhookRegisterRequestDto,
        PrmsWebhookApiResponseDto
      >('webhook', body, this.webhookRequestConfig(apiKey)),
    );

    this.assertPrmsWebhookAccepted(httpResponse);
    this.logger._log(
      `PRMS webhook registration responded with HTTP ${httpResponse.status}`,
    );

    const response = httpResponse.data?.response;
    return {
      destination: (response ?? {}) as PrmsWebhookDestinationDto,
      message: this.prmsWebhookMessage(httpResponse.data),
      requestId: httpResponse.data?.requestId,
    };
  }

  /**
   * Reads the destination PRMS holds (`GET {host}/webhook`).
   * `registered` follows the emptiness of `response`, never the HTTP status:
   * nothing-registered is `200` with `response: {}`.
   */
  async getWebhook(): Promise<PrmsWebhookReadResultDto> {
    this.assertHost();
    const apiKey = await this.readClarisaApiKey();

    const httpResponse = await firstValueFrom(
      this.getRequest<PrmsWebhookApiResponseDto>(
        'webhook',
        this.webhookRequestConfig(apiKey),
      ),
    );

    this.assertPrmsWebhookAccepted(httpResponse);
    this.logger._log(
      `PRMS webhook read responded with HTTP ${httpResponse.status}`,
    );

    const response = httpResponse.data?.response;
    const registered = Object.keys(response ?? {}).length > 0;
    return {
      registered,
      destination: registered ? (response as PrmsWebhookDestinationDto) : null,
      message: this.prmsWebhookMessage(httpResponse.data),
      requestId: httpResponse.data?.requestId,
    };
  }

  private assertHost(): void {
    if (!this.externalAppEndpoint?.trim()) {
      throw new ServiceUnavailableException(
        'PRMS Normalizer host is not configured (ARI_PRMS_NORMALIZER_HOST)',
      );
    }
  }

  /**
   * Per-call read. A missing row throws `NotFoundException` from `getEnv`
   * and is not caught here. An empty `simple_value` is a different failure.
   */
  private async readClarisaApiKey(): Promise<string> {
    const apiKeyConfig = await this.appConfigService.getEnv(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
    const apiKey = apiKeyConfig?.simple_value;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'PRMS Normalizer API key configuration is missing',
      );
    }
    return apiKey;
  }

  private webhookRequestConfig(apiKey: string): AxiosRequestConfig {
    const defaultConfig = this._defaultConfig;
    return {
      ...defaultConfig,
      headers: {
        ...defaultConfig.headers,
        'x-api-key': apiKey,
      },
      validateStatus: () => true,
    };
  }

  private assertPrmsWebhookAccepted(
    httpResponse: AxiosResponse<PrmsWebhookApiResponseDto> | null,
  ): asserts httpResponse is AxiosResponse<PrmsWebhookApiResponseDto> {
    if (!httpResponse) {
      throw new ServiceUnavailableException(
        'PRMS Normalizer returned no HTTP response',
      );
    }
    if (httpResponse.status >= 200 && httpResponse.status < 300) {
      return;
    }
    throw this.prmsWebhookException(
      httpResponse.status,
      this.prmsWebhookMessage(httpResponse.data),
    );
  }

  private prmsWebhookMessage(
    body: PrmsWebhookApiResponseDto | undefined,
  ): string {
    return typeof body?.message === 'string' ? body.message : '';
  }

  /**
   * Named statuses keep PRMS's `message` byte-identical.
   * Any other non-2xx still throws, so a refusal is never a success.
   */
  private prmsWebhookException(status: number, message: string): HttpException {
    switch (status) {
      case 400:
        return new BadRequestException(message);
      case 401:
        return new UnauthorizedException(message);
      case 502:
        return new BadGatewayException(message);
      case 503:
        return new ServiceUnavailableException(message);
      default:
        return new HttpException(message, status);
    }
  }
}
