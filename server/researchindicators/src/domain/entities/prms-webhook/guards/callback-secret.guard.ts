import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PRMS_CALLBACK_ROUTE_PREFIX } from '../../../shared/utils/path-redaction.util';
import { LoggerUtil } from '../../../shared/utils/logger.util';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// R-PWH-004 AC.1, AC.5, AC.6 · design §6.3 step 1, §9, §10.
// The guard is the whole security boundary of the public write endpoint.
// A mismatch is 404, not 401: a 401 would confirm the path exists.

/**
 * Constant-time comparison that never calls `timingSafeEqual` on a
 * length mismatch — that call throws (R-PWH-004 AC.5). An unset or
 * empty configured secret refuses every request, including an empty
 * segment (AC.6): it must not fall open.
 */
export function callbackSecretsMatch(
  configured: string | undefined,
  supplied: string | undefined,
): boolean {
  if (typeof configured !== 'string' || configured.length === 0) {
    return false;
  }
  if (typeof supplied !== 'string') {
    return false;
  }
  const configuredBytes = Buffer.from(configured);
  const suppliedBytes = Buffer.from(supplied);
  if (configuredBytes.length !== suppliedBytes.length) {
    return false;
  }
  return timingSafeEqual(configuredBytes, suppliedBytes);
}

@Injectable()
export class CallbackSecretGuard implements CanActivate {
  private readonly logger = new LoggerUtil({
    name: CallbackSecretGuard.name,
  });

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const supplied = request.params?.secret;
    const configured = process.env.ARI_PRMS_WEBHOOK_SECRET;

    if (
      !callbackSecretsMatch(
        configured,
        typeof supplied === 'string' ? supplied : undefined,
      )
    ) {
      // Source IP and the route prefix only. The guess is the path
      // segment; logging the URL would log a credential (§10).
      const ip = request.socket?.remoteAddress ?? 'unknown';
      this.logger._warn(
        `Bad PRMS callback secret source_ip=${ip} path=${PRMS_CALLBACK_ROUTE_PREFIX}`,
      );
      throw new NotFoundException();
    }

    return true;
  }
}
