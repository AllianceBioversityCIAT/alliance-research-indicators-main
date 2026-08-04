// @sdd-spec results/cross-platform-duplicate-resolution
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  REQUEST_AUTH_TYPE_KEY,
  RequestAuthType,
} from '../enum/request-auth-type.enum';

/** Principals allowed through: a person, or the local development bypass. */
const HUMAN_AUTH_TYPES: RequestAuthType[] = [
  RequestAuthType.ROAR_JWT,
  RequestAuthType.LOCAL_BYPASS,
];

/**
 * Rejects requests authenticated by machine token.
 *
 * Apply alongside `@Roles(...)` on routes whose effect is irreversible. Roles
 * alone are not enough: `app_secret_host_list` is an origin allowlist for the
 * whole token and a secret with **zero** host rows skips the origin check, so a
 * machine token whose responsible user holds `SYSTEM_ADMIN` satisfies
 * `@Roles(SYSTEM_ADMIN)` from any origin. On the live database all four
 * `app_secrets` rows have zero host entries and one resolves to a `System Admin`,
 * so that principal exists today.
 *
 * **This guard fails closed.** An absent marker is denied, not allowed. If a
 * future refactor of `JwtMiddleware` stops stamping the auth type, the endpoint
 * breaks loudly instead of quietly accepting every principal — which is the
 * failure direction that matters on a path that deletes production rows.
 */
@Injectable()
export class DenyMachineTokenGuard implements CanActivate {
  private readonly logger = new Logger(DenyMachineTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authType = request?.[REQUEST_AUTH_TYPE_KEY] as
      | RequestAuthType
      | undefined;

    if (authType === RequestAuthType.MACHINE_TOKEN) {
      this.logger.warn(
        `Machine-token principal (user ${request?.user?.sec_user_id ?? 'unknown'}) denied on ${request?.method} ${request?.url}.`,
      );
      throw new ForbiddenException(
        'This operation cannot be performed with a machine token.',
      );
    }

    if (!HUMAN_AUTH_TYPES.includes(authType)) {
      // Fail closed: an unrecognised or missing marker means the request did not
      // demonstrably come from a person.
      this.logger.error(
        `Request to ${request?.method} ${request?.url} carries no recognised auth type (${authType ?? 'undefined'}); denying.`,
      );
      throw new ForbiddenException(
        'Request authentication type could not be determined.',
      );
    }

    return true;
  }
}
