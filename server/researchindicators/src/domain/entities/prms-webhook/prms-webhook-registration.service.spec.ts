import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { PrmsNormalizerService } from '../../tools/prms-normalizer/prms-normalizer.service';
import {
  PrmsWebhookDestinationDto,
  PrmsWebhookRegistrationResultDto,
} from '../../tools/prms-normalizer/dto/prms-webhook.dto';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03 /
// R-PWH-001 AC.1, AC.2, AC.6, AC.7 · R-PWH-002 · R-PWH-009 AC.1, AC.2, AC.3.
//
// Falsifiers named verbatim (tasks.md T-03):
//   F1 — unset ARI_PRMS_WEBHOOK_CALLBACK_URL and call register() -> the 503
//        assertion (and the "names the variable" assertion) reds if the
//        code falls back to any default.
//   F2 — stub PrmsNormalizerService.registerWebhook to throw
//        NotFoundException -> the 404 assertion reds the moment the
//        handler collapses every config failure to 503.
describe('PrmsWebhookRegistrationService', () => {
  const callbackUrl = 'https://star.example.org/api/prms-callback/secret';
  const destination: PrmsWebhookDestinationDto = {
    id: 3,
    recipient_type: 'PLATFORM',
    recipient_id: 12,
    recipient_acronym: 'STAR',
    url: callbackUrl,
    is_active: true,
    last_updated_date: '2026-08-25T14:22:10.000Z',
  };
  const registrationResult: PrmsWebhookRegistrationResultDto = {
    destination,
    message: 'Webhook endpoint registered successfully.',
    requestId: 'Root=1-68e94068',
  };

  let prmsNormalizerService: {
    registerWebhook: jest.Mock;
    getWebhook: jest.Mock;
  };
  let logLines: string[];
  let warnLines: string[];
  let service: PrmsWebhookRegistrationService;

  const buildService = (
    appConfig: Partial<AppConfig>,
  ): PrmsWebhookRegistrationService =>
    new PrmsWebhookRegistrationService(
      prmsNormalizerService as unknown as PrmsNormalizerService,
      appConfig as AppConfig,
    );

  beforeEach(() => {
    prmsNormalizerService = {
      registerWebhook: jest.fn().mockResolvedValue(registrationResult),
      getWebhook: jest.fn().mockResolvedValue({
        registered: true,
        destination,
        message: 'Webhook endpoint retrieved successfully.',
        requestId: 'Root=1-68e94068',
      }),
    };
    logLines = [];
    warnLines = [];
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation((message: unknown) => {
        logLines.push(String(message));
      });
    jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation((message: unknown) => {
        warnLines.push(String(message));
      });
    service = buildService({
      ARI_PRMS_WEBHOOK_CALLBACK_URL: callbackUrl,
      ARI_PRMS_NORMALIZER_HOST:
        'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com',
      ARI_IS_PRODUCTION: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register() — R-PWH-001', () => {
    it('registers using ONLY the configured callback URL and returns the destination + message', async () => {
      await expect(service.register()).resolves.toEqual(registrationResult);

      expect(prmsNormalizerService.registerWebhook).toHaveBeenCalledWith(
        callbackUrl,
      );
      expect(prmsNormalizerService.registerWebhook).toHaveBeenCalledTimes(1);
    });

    it('logs the attempt with environment, host, URL, message and requestId — never a key or a secret (AC.6)', async () => {
      await service.register();

      expect(logLines).toHaveLength(1);
      const line = logLines[0];
      expect(line).toContain('env=TEST');
      expect(line).toContain(
        'host=https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com',
      );
      // The URL survives minus its credential: `redactCallbackPath` strips
      // the trailing path secret and keeps §10's "URL registered" field.
      expect(line).toContain('url=https://star.example.org/api/prms-callback');
      // FALSIFIER (h) (R-PWH-001 AC.6, NFR-PWH-002). Remove the
      // `redactCallbackPath` call from `attemptLine` -> this assertion reds.
      // Observed RED first against the unredacted line (paste in the task
      // report), then GREEN once the redaction was applied.
      expect(line).not.toContain('/secret');
      expect(line).toContain('Webhook endpoint registered successfully.');
      expect(line).toContain('Root=1-68e94068');
      // The two assertions below cannot redden in this service: the API key
      // is read and used entirely inside PrmsNormalizerService and never
      // enters `attemptLine`. They document intent; `/secret` is the evidence.
      expect(line.toLowerCase()).not.toContain('x-api-key');
      expect(line.toLowerCase()).not.toContain('apikey');
    });

    // FALSIFIER F1 (R-PWH-009 AC.2, AC.3, K-005). No request object is ever
    // passed to this service — there is structurally no Host header to fall
    // back to. Observed RED first: with the check removed, `register()`
    // called `prmsNormalizerService.registerWebhook(undefined)` instead of
    // throwing, and this test failed on the `rejects.toThrow` assertion
    // (paste captured in the task report).
    it('fails loudly with 503 naming the variable when ARI_PRMS_WEBHOOK_CALLBACK_URL is unset — no fallback, no default', async () => {
      service = buildService({
        ARI_PRMS_WEBHOOK_CALLBACK_URL: undefined,
        ARI_PRMS_NORMALIZER_HOST:
          'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com',
        ARI_IS_PRODUCTION: false,
      });

      const error = await service.register().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).message).toContain(
        'ARI_PRMS_WEBHOOK_CALLBACK_URL',
      );
      expect(prmsNormalizerService.registerWebhook).not.toHaveBeenCalled();
    });

    it('fails loudly with 503 when ARI_PRMS_WEBHOOK_CALLBACK_URL is blank', async () => {
      service = buildService({
        ARI_PRMS_WEBHOOK_CALLBACK_URL: '   ',
        ARI_PRMS_NORMALIZER_HOST:
          'https://v2f4lv8av4.execute-api.us-east-1.amazonaws.com',
      });

      const error = await service.register().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).message).toContain(
        'ARI_PRMS_WEBHOOK_CALLBACK_URL',
      );
      expect(prmsNormalizerService.registerWebhook).not.toHaveBeenCalled();
    });

    // FALSIFIER F2 / Red run (R-PWH-001 AC.7, JD-5). Observed RED first
    // against a handler that caught every rejection from
    // `registerWebhook` and rethrew a flat `ServiceUnavailableException`
    // (collapsing 404 into 503) — this assertion failed:
    // `expect(received).toBeInstanceOf(NotFoundException)` with
    // `received = ServiceUnavailableException`. Paste captured in the task
    // report. Reverted, then observed GREEN below.
    it('lets a missing/inactive ARI_CLARISA_API_KEY row propagate as NotFoundException (404) — NOT collapsed to 503', async () => {
      const missing = new NotFoundException(
        'Config with key ARI_CLARISA_API_KEY not found',
      );
      prmsNormalizerService.registerWebhook.mockRejectedValue(missing);

      const error = await service.register().catch((caught: unknown) => caught);

      expect(error).toBe(missing);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error).not.toBeInstanceOf(ServiceUnavailableException);
    });

    it('lets an empty simple_value / unset host propagate as ServiceUnavailableException (503) — distinct from the 404 path', async () => {
      const unavailable = new ServiceUnavailableException(
        'PRMS Normalizer API key configuration is missing',
      );
      prmsNormalizerService.registerWebhook.mockRejectedValue(unavailable);

      const error = await service.register().catch((caught: unknown) => caught);

      expect(error).toBe(unavailable);
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error).not.toBeInstanceOf(NotFoundException);
    });

    it('logs a warn line (still no key/secret) and rethrows on failure, without swallowing the error', async () => {
      const refusal = new NotFoundException('Config not found');
      prmsNormalizerService.registerWebhook.mockRejectedValue(refusal);

      await expect(service.register()).rejects.toBe(refusal);

      expect(warnLines).toHaveLength(1);
      expect(warnLines[0]).toContain('env=TEST');
      expect(warnLines[0]).toContain(
        'url=https://star.example.org/api/prms-callback',
      );
      expect(warnLines[0]).not.toContain('/secret');
      expect(warnLines[0].toLowerCase()).not.toContain('x-api-key');
    });
  });

  describe('read() — R-PWH-002', () => {
    it('delegates to PrmsNormalizerService.getWebhook() and returns its result untouched', async () => {
      const result = await service.read();

      expect(prmsNormalizerService.getWebhook).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        registered: true,
        destination,
        message: 'Webhook endpoint retrieved successfully.',
        requestId: 'Root=1-68e94068',
      });
    });

    it('returns registered:false / destination:null as a normal resolved value — NOT a thrown error — when nothing is registered', async () => {
      prmsNormalizerService.getWebhook.mockResolvedValue({
        registered: false,
        destination: null,
        message: 'No webhook endpoint registered for this platform.',
      });

      await expect(service.read()).resolves.toEqual({
        registered: false,
        destination: null,
        message: 'No webhook endpoint registered for this platform.',
      });
    });

    it('lets a missing ARI_CLARISA_API_KEY row propagate as NotFoundException from read() too', async () => {
      const missing = new NotFoundException('Config not found');
      prmsNormalizerService.getWebhook.mockRejectedValue(missing);

      await expect(service.read()).rejects.toBe(missing);
    });
  });
});
