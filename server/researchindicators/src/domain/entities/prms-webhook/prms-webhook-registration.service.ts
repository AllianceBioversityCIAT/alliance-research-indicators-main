import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { redactCallbackPath } from '../../shared/utils/path-redaction.util';
import { PRMS_CALLBACK_PATH } from '../../shared/utils/prms-callback.constants';
import { PrmsNormalizerService } from '../../tools/prms-normalizer/prms-normalizer.service';
import {
  PrmsWebhookReadResultDto,
  PrmsWebhookRegistrationResultDto,
} from '../../tools/prms-normalizer/dto/prms-webhook.dto';

/**
 * Assembles the callback URL from the configured base and secret, then
 * delegates to `PrmsNormalizerService` (design.md §3.1). Owns two checks
 * of its own — `ARI_PRMS_WEBHOOK_CALLBACK_URL` unset → 503 naming it, and
 * `ARI_PRMS_WEBHOOK_SECRET` unset → 503 naming it (R-PWH-009 AC.2, AC.3) —
 * and otherwise MUST NOT collapse or re-interpret what
 * `registerWebhook`/`getWebhook` throw: a missing/inactive
 * `ARI_CLARISA_API_KEY` row is `NotFoundException` (404) and an empty
 * `simple_value`, or an unset `ARI_PRMS_NORMALIZER_HOST`, is
 * `ServiceUnavailableException` (503) — both propagate untouched
 * (R-PWH-001 AC.7, JD-5).
 */
@Injectable()
export class PrmsWebhookRegistrationService {
  private readonly logger = new LoggerUtil({
    name: PrmsWebhookRegistrationService.name,
  });

  constructor(
    private readonly prmsNormalizerService: PrmsNormalizerService,
    private readonly appConfig: AppConfig,
  ) {}

  /**
   * `POST /api/prms-webhook` (R-PWH-001). The base and the secret come ONLY
   * from `ARI_PRMS_WEBHOOK_CALLBACK_URL` and `ARI_PRMS_WEBHOOK_SECRET`. No
   * request-body input, no fallback built from the request's `Host` header
   * (R-PWH-009 AC.2, K-005).
   */
  async register(): Promise<PrmsWebhookRegistrationResultDto> {
    const environment = this.environmentLabel();
    const host = this.appConfig.ARI_PRMS_NORMALIZER_HOST;
    const base = this.appConfig.ARI_PRMS_WEBHOOK_CALLBACK_URL;
    const secret = this.appConfig.ARI_PRMS_WEBHOOK_SECRET;

    if (!base?.trim()) {
      const reason = 'ARI_PRMS_WEBHOOK_CALLBACK_URL is not configured';
      this.logger._warn(
        this.attemptLine({
          environment,
          host,
          url: undefined,
          outcome: reason,
        }),
      );
      throw new ServiceUnavailableException(reason);
    }

    if (!secret?.trim()) {
      const reason = 'ARI_PRMS_WEBHOOK_SECRET is not configured';
      this.logger._warn(
        this.attemptLine({
          environment,
          host,
          url: undefined,
          outcome: reason,
        }),
      );
      throw new ServiceUnavailableException(reason);
    }

    const url = `${base.trim().replace(/\/+$/, '')}/${PRMS_CALLBACK_PATH}/${secret}`;

    try {
      const result = await this.prmsNormalizerService.registerWebhook(url);
      this.logger._log(
        this.attemptLine({
          environment,
          host,
          url,
          outcome: result.message,
          requestId: result.requestId,
        }),
      );
      return result;
    } catch (error) {
      this.logger._warn(
        this.attemptLine({
          environment,
          host,
          url,
          outcome: this.describeError(error),
        }),
      );
      throw error;
    }
  }

  /** `GET /api/prms-webhook` (R-PWH-002). No callback-URL check — reading
   * back what PRMS holds does not depend on what STAR would register. */
  async read(): Promise<PrmsWebhookReadResultDto> {
    return this.prmsNormalizerService.getWebhook();
  }

  private environmentLabel(): 'PROD' | 'TEST' {
    return this.appConfig.ARI_IS_PRODUCTION ? 'PROD' : 'TEST';
  }

  /**
   * NFR-PWH-003 / R-PWH-001 AC.6 fields — environment, host, the URL
   * registered, PRMS's `message`, `requestId`. Never the API key (it never
   * enters this service) and never the callback secret: the URL *is* the
   * credential — its trailing path segment is `ARI_PRMS_WEBHOOK_SECRET`
   * (NFR-PWH-002) — so it passes through `redactCallbackPath`, which keeps
   * `<scheme>://<host>/api/prms-callback` and drops the secret, on the
   * success and the failure path alike.
   */
  private attemptLine(fields: {
    environment: string;
    host: string | undefined;
    url: string | undefined;
    outcome: string;
    requestId?: string;
  }): string {
    const { environment, host, url, outcome, requestId } = fields;
    return (
      `PRMS webhook registration attempt env=${environment} ` +
      `host=${host ?? 'unset'} url=${url ? redactCallbackPath(url) : 'unset'} ` +
      `message="${outcome}" requestId=${requestId ?? 'none'}`
    );
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpException) {
      const payload = error.getResponse();
      if (typeof payload === 'string') {
        return payload;
      }
      if (payload && typeof payload === 'object' && 'message' in payload) {
        const message = (payload as { message: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
        if (Array.isArray(message)) {
          return message.map(String).join('; ');
        }
      }
      return error.message;
    }
    return error instanceof Error ? error.message : 'unknown error';
  }
}
