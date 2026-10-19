import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';

/**
 * Deny-list guard for the Pooled Funding Monitor (DD-PFM-2).
 *
 * Refuses (403):
 * - a machine credential (`request.credential === 'machine'`). A machine token
 *   takes on its responsible human's `sec_user_id` and roles, so it cannot be
 *   told apart by the user shape; `JwtMiddleware.applyImpersonation` sets
 *   `req.credential` on every branch instead;
 * - a missing user or one without an integer `sec_user_id` (defense in depth);
 * - a user with no real role. Non-integer entries are ignored first, since a
 *   user with no active roles can arrive as `[null]` (LEFT JOIN +
 *   JSON_ARRAYAGG);
 * - a user whose EVERY role is CONTRIBUTOR (3).
 * Any other role mix passes, SYSTEM_ADMIN included, so a future role is not
 * silently locked out the way an `@Roles` allow-list would.
 */
@Injectable()
export class NotContributorOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const roles: number[] = Array.isArray(user?.roles)
      ? user.roles.filter((role: unknown) => Number.isInteger(role))
      : [];

    if (
      request?.credential === 'machine' ||
      !user ||
      !Number.isInteger(user.sec_user_id) ||
      roles.length === 0 ||
      roles.every((role) => role === SecRolesEnum.CONTRIBUTOR)
    ) {
      throw new ForbiddenException(
        'Pooled Funding Monitor is not available for this user',
      );
    }

    return true;
  }
}
