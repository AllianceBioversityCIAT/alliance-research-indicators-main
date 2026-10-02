import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { NEVER, of, throwError } from 'rxjs';
import { AppConfigService } from '../../entities/app-config/app-config.service';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsNormalizerRequestDto } from './dto/prms-normalizer.dto';
import { PrmsWebhookDestinationDto } from './dto/prms-webhook.dto';
import { PrmsNormalizerService } from './prms-normalizer.service';

describe('PrmsNormalizerService', () => {
  const testHost = 'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com';
  const prodHost = 'https://v6a9z2e4y5.execute-api.us-east-1.amazonaws.com';
  const apiKey = 'normalizer-secret-key';
  const envelope: PrmsNormalizerRequestDto = {
    tenant: 'prms.result-management.api',
    op: 'dataset.ingest.requested',
    results: [
      { type: 'capacity_sharing', data: { external_reference: 'ARI-1' } },
    ],
  };
  let httpService: { post: jest.Mock; get: jest.Mock };
  let appConfigService: { getEnv: jest.Mock };
  let service: PrmsNormalizerService;

  const response = <T>(status: number, body: T): AxiosResponse<T> =>
    ({
      data: body,
      status,
      statusText: String(status),
      headers: {},
      config: {} as AxiosRequestConfig,
    }) as AxiosResponse<T>;

  beforeEach(() => {
    httpService = { post: jest.fn(), get: jest.fn() };
    appConfigService = {
      getEnv: jest.fn().mockResolvedValue({ simple_value: apiKey }),
    };
    service = new PrmsNormalizerService(
      appConfigService as unknown as AppConfigService,
      httpService as unknown as HttpService,
      { ARI_PRMS_NORMALIZER_HOST: testHost } as AppConfig,
    );
    (service as any).user = 'normalizer-user';
    (service as any).pass = 'normalizer-password';
    (service as any).token = 'transport-token';
    service.ensureHeaders({ 'x-custom-header': 'kept' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    [401, { message: 'Unauthorized' }],
    [
      422,
      { rejected: [{ external_reference: 'ARI-1', reason: 'invalid title' }] },
    ],
    [503, { message: 'Service unavailable' }],
  ])(
    'returns the intact HTTP %i response body instead of null',
    async (status, body) => {
      httpService.post.mockReturnValue(of(response(status, body)));

      await expect(service.ingest(envelope)).resolves.toEqual({ status, body });
    },
  );

  it('returns null for a network error and never logs the API key', async () => {
    const errorSpy = jest
      .spyOn(LoggerUtil.prototype, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    httpService.post.mockReturnValue(
      throwError(() => new Error('network down')),
    );

    await expect(service.ingest(envelope)).resolves.toBeNull();

    const logged = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .map(String)
      .join(' ');
    expect(logged).not.toContain(apiKey);
  });

  it('does not include the API key in any Normalizer log line', async () => {
    const logSpy = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(LoggerUtil.prototype, 'error')
      .mockImplementation(() => undefined);
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const logged = [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .map(String)
      .join(' ');
    expect(logged).not.toContain(apiKey);
  });

  it('returns null when BaseApi times out after 30 seconds', async () => {
    jest.useFakeTimers();
    httpService.post.mockReturnValue(NEVER);

    const pending = service.ingest(envelope);
    await jest.advanceTimersByTimeAsync(30_000);

    await expect(pending).resolves.toBeNull();
  });

  it('reads the API key for every request', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);
    await service.ingest(envelope);

    expect(appConfigService.getEnv).toHaveBeenCalledTimes(2);
    expect(appConfigService.getEnv).toHaveBeenCalledWith(
      AppConfigKey.ARI_CLARISA_API_KEY,
    );
  });

  it('passes the merged default config to httpService.post', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const configActuallyPassedToHttpPost = httpService.post.mock.calls[0][2];
    expect(configActuallyPassedToHttpPost.auth).toEqual({
      username: 'normalizer-user',
      password: 'normalizer-password',
    });
    expect(configActuallyPassedToHttpPost.headers).toMatchObject({
      Authorization: 'Bearer transport-token',
      'x-custom-header': 'kept',
      'x-api-key': apiKey,
    });
    expect(configActuallyPassedToHttpPost.httpsAgent).toBeDefined();
    expect(configActuallyPassedToHttpPost.validateStatus(401)).toBe(true);
  });

  it('uses the configured TEST host only', async () => {
    httpService.post.mockReturnValue(of(response(200, { ok: true })));

    await service.ingest(envelope);

    const urlActuallyPassedToHttpPost = httpService.post.mock.calls[0][0];
    expect(urlActuallyPassedToHttpPost).toBe(`${testHost}/ingest`);
    expect(urlActuallyPassedToHttpPost).not.toContain(prodHost);
    // This proves config resolution only; it cannot prove deployment correctness.
  });

  it('fails loudly when the Normalizer host is not configured', async () => {
    const withoutHost = new PrmsNormalizerService(
      appConfigService as unknown as AppConfigService,
      httpService as unknown as HttpService,
      {} as AppConfig,
    );

    await expect(withoutHost.ingest(envelope)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(httpService.post).not.toHaveBeenCalled();
  });

  describe('webhook registration and read-back', () => {
    const callbackUrl =
      'https://star.example.org/api/prms-callback/path-secret-value';
    const destination: PrmsWebhookDestinationDto = {
      id: 3,
      recipient_type: 'PLATFORM',
      recipient_id: 12,
      recipient_acronym: 'STAR',
      url: callbackUrl,
      is_active: true,
      last_updated_date: '2026-08-25T14:22:10.000Z',
    };
    const refusedMessage = 'The url must point to a publicly reachable host.';

    const silenceLogs = (): void => {
      jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);
      jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);
      jest
        .spyOn(LoggerUtil.prototype, 'error')
        .mockImplementation(() => undefined);
    };

    it('posts a body whose keys are exactly [url]', async () => {
      silenceLogs();
      httpService.post.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: destination,
            message: 'Webhook endpoint registered successfully.',
            requestId: 'Root=1-68e94068',
          }),
        ),
      );

      await service.registerWebhook(callbackUrl);

      const sentBody = httpService.post.mock.calls[0][1];
      expect(Object.keys(sentBody)).toEqual(['url']);
      expect(sentBody).toEqual({ url: callbackUrl });
      expect(httpService.post.mock.calls[0][0]).toBe(`${testHost}/webhook`);
      expect(httpService.post.mock.calls[0][0]).not.toContain(prodHost);
    });

    it('puts the per-call API key on the registration request, then the rotated key on the next one', async () => {
      silenceLogs();
      appConfigService.getEnv
        .mockResolvedValueOnce({ simple_value: 'key-one' })
        .mockResolvedValueOnce({ simple_value: 'key-two' });
      httpService.post.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: destination,
            message: 'Webhook endpoint registered successfully.',
          }),
        ),
      );

      await service.registerWebhook(callbackUrl);
      await service.registerWebhook(callbackUrl);

      expect(appConfigService.getEnv).toHaveBeenCalledTimes(2);
      expect(appConfigService.getEnv).toHaveBeenCalledWith(
        AppConfigKey.ARI_CLARISA_API_KEY,
      );
      expect(httpService.post.mock.calls[0][2].headers['x-api-key']).toBe(
        'key-one',
      );
      expect(httpService.post.mock.calls[1][2].headers['x-api-key']).toBe(
        'key-two',
      );
    });

    it('returns the destination and the PRMS message on a successful registration', async () => {
      silenceLogs();
      httpService.post.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: destination,
            message: 'Webhook endpoint registered successfully.',
            requestId: 'Root=1-68e94068',
          }),
        ),
      );

      await expect(service.registerWebhook(callbackUrl)).resolves.toEqual({
        destination,
        message: 'Webhook endpoint registered successfully.',
        requestId: 'Root=1-68e94068',
      });
    });

    it.each([
      [400, BadRequestException, 'The url must use https.'],
      [401, UnauthorizedException, 'A valid API key is required.'],
      [
        502,
        BadGatewayException,
        'Timed out after 30000ms registering the webhook',
      ],
      [
        503,
        ServiceUnavailableException,
        'API key validation is temporarily unavailable. Please retry.',
      ],
    ])(
      'surfaces a PRMS %i message byte-identical and does not resolve',
      async (status, ExceptionType, message) => {
        silenceLogs();
        httpService.post.mockReturnValue(
          of(
            response(status, {
              ok: false,
              error: 'webhook_registration_failed',
              message,
            }),
          ),
        );

        const error = await service.registerWebhook(callbackUrl).then(
          () => {
            throw new Error('registration resolved on a PRMS refusal');
          },
          (caught: unknown) => caught,
        );

        expect(error).toBeInstanceOf(ExceptionType);
        expect((error as { message: string }).message).toBe(message);
        expect((error as { getStatus: () => number }).getStatus()).toBe(status);
      },
    );

    it('surfaces the refused-registration scenario message byte-identical', async () => {
      silenceLogs();
      httpService.post.mockReturnValue(
        of(
          response(400, {
            ok: false,
            error: 'webhook_registration_failed',
            message: refusedMessage,
          }),
        ),
      );

      const error = await service
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(refusedMessage);
    });

    it('does not treat a missing HTTP response as a successful registration', async () => {
      silenceLogs();
      httpService.post.mockReturnValue(of(null));

      const error = await service
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).message).toBe(
        'PRMS Normalizer returned no HTTP response',
      );
    });

    it('surfaces an unlisted non-2xx status with the PRMS message intact', async () => {
      silenceLogs();
      const message = 'Timed out after 30000ms registering the webhook';
      httpService.post.mockReturnValue(
        of(response(504, { ok: false, error: 'upstream_timeout', message })),
      );

      const error = await service
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).message).toBe(message);
      expect((error as HttpException).getStatus()).toBe(504);
    });

    it('lets a missing API-key row propagate as NotFoundException', async () => {
      const missing = new NotFoundException(
        'Config with key ARI_CLARISA_API_KEY not found',
      );
      appConfigService.getEnv.mockRejectedValue(missing);

      const error = await service
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBe(missing);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error).not.toBeInstanceOf(ServiceUnavailableException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('raises 503 when the API-key row exists with an empty simple_value', async () => {
      appConfigService.getEnv.mockResolvedValue({ simple_value: '' });

      const error = await service
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error).not.toBeInstanceOf(NotFoundException);
      expect((error as ServiceUnavailableException).message).toBe(
        'PRMS Normalizer API key configuration is missing',
      );
      expect((error as ServiceUnavailableException).getStatus()).toBe(503);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('fails loudly when the host is unset and names ARI_PRMS_NORMALIZER_HOST', async () => {
      const withoutHost = new PrmsNormalizerService(
        appConfigService as unknown as AppConfigService,
        httpService as unknown as HttpService,
        {} as AppConfig,
      );

      const error = await withoutHost
        .registerWebhook(callbackUrl)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).message).toContain(
        'ARI_PRMS_NORMALIZER_HOST',
      );
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('does not log the API key or the callback URL', async () => {
      const logSpy = jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);
      const warnSpy = jest
        .spyOn(LoggerUtil.prototype, '_warn')
        .mockImplementation(() => undefined);
      const errorSpy = jest
        .spyOn(LoggerUtil.prototype, 'error')
        .mockImplementation(() => undefined);
      httpService.post.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: destination,
            message: 'Webhook endpoint registered successfully.',
          }),
        ),
      );

      await service.registerWebhook(callbackUrl);

      const logged = [
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ]
        .flat()
        .map(String)
        .join(' ');
      expect(logged).not.toContain(apiKey);
      expect(logged).not.toContain('path-secret-value');
      expect(logged).not.toContain(callbackUrl);
    });

    it('reports nothing registered when PRMS returns 200 and an empty response', async () => {
      silenceLogs();
      const message = 'No webhook endpoint registered for this platform.';
      httpService.get.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: {},
            statusCode: 200,
            message,
          }),
        ),
      );

      const result = await service.getWebhook();

      expect(result.registered).toBe(false);
      expect(result.destination).toBeNull();
      expect(result.message).toBe(message);
      expect(httpService.get.mock.calls[0][0]).toBe(`${testHost}/webhook`);
    });

    it('reports the destination when response is non-empty', async () => {
      silenceLogs();
      httpService.get.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: destination,
            message: 'Webhook endpoint retrieved successfully.',
            requestId: 'Root=1-read',
          }),
        ),
      );

      await expect(service.getWebhook()).resolves.toEqual({
        registered: true,
        destination,
        message: 'Webhook endpoint retrieved successfully.',
        requestId: 'Root=1-read',
      });
    });

    it('reads a fresh API key on a later getWebhook call', async () => {
      silenceLogs();
      appConfigService.getEnv
        .mockResolvedValueOnce({ simple_value: 'key-one' })
        .mockResolvedValueOnce({ simple_value: 'key-two' });
      httpService.get.mockReturnValue(
        of(
          response(200, {
            ok: true,
            response: {},
            message: 'No webhook endpoint registered for this platform.',
          }),
        ),
      );

      await service.getWebhook();
      await service.getWebhook();

      expect(httpService.get.mock.calls[0][1].headers['x-api-key']).toBe(
        'key-one',
      );
      expect(httpService.get.mock.calls[1][1].headers['x-api-key']).toBe(
        'key-two',
      );
    });

    it('lets a missing API-key row propagate from getWebhook', async () => {
      const missing = new NotFoundException(
        'Config with key ARI_CLARISA_API_KEY not found',
      );
      appConfigService.getEnv.mockRejectedValue(missing);

      const error = await service
        .getWebhook()
        .catch((caught: unknown) => caught);

      expect(error).toBe(missing);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('raises 503 from getWebhook when simple_value is empty', async () => {
      appConfigService.getEnv.mockResolvedValue({ simple_value: '' });

      const error = await service
        .getWebhook()
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getStatus()).toBe(503);
      expect(httpService.get).not.toHaveBeenCalled();
    });
  });
});
