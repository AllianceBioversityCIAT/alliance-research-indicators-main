// @sdd-spec results/cross-platform-duplicate-resolution
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SecRolesEnum } from '../enum/sec_role.enum';

/**
 * Config keys whose write access is narrower than the endpoint's.
 *
 * A prefix match, so every `duplicate_resolution.*` key is covered — including
 * ones added later, which is the point: a new destructive flag should inherit the
 * restriction instead of having to remember it.
 */
export const PROTECTED_CONFIG_KEY_PREFIXES = ['duplicate_resolution.'];

/**
 * Restricts a subset of `app_config` keys to `SYSTEM_ADMIN`.
 *
 * `PATCH /api/configuration/:key` is open to `TECHNICAL_SUPPORT` and
 * `SYSTEM_ADMIN`, which is right for most configuration. It is not right for
 * `duplicate_resolution.hard_delete_enabled`: flipping that to `true` enables
 * irreversible deletion on the **sync path**, which — unlike the admin sweep — has
 * no dry run, no confirmation digest and no TTL. A `TECHNICAL_SUPPORT` user cannot
 * call either sweep endpoint, so without this guard the feature's kill switch had
 * a **wider** write ACL than the feature itself.
 *
 * Narrowing the whole endpoint would have been the blunt fix and would have broken
 * legitimate `TECHNICAL_SUPPORT` configuration work. This restricts only the keys
 * that need it.
 */
@Injectable()
export class ProtectedConfigKeysGuard implements CanActivate {
  private readonly logger = new Logger(ProtectedConfigKeysGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = String(request?.params?.key ?? '');

    const isProtected = PROTECTED_CONFIG_KEY_PREFIXES.some((prefix) =>
      key.startsWith(prefix),
    );
    if (!isProtected) return true;

    const roles: unknown[] = request?.user?.roles ?? [];
    const isSystemAdmin = roles
      .map((role) => Number(role))
      .includes(Number(SecRolesEnum.SYSTEM_ADMIN));

    if (!isSystemAdmin) {
      this.logger.warn(
        `User ${request?.user?.sec_user_id ?? 'unknown'} was denied a write to protected config key ${key}.`,
      );
      throw new ForbiddenException(
        `Configuration key "${key}" can only be changed by a system administrator.`,
      );
    }

    return true;
  }
}
