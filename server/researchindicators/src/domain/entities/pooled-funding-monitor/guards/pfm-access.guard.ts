import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';
import { PooledFundingMonitorRepository } from '../repositories/pooled-funding-monitor.repository';

/**
 * Access guard for the CGIAR Portfolio Contribution Monitor (DD-PFM-2).
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
 * - a user whose EVERY role is CONTRIBUTOR (3), UNLESS they are PI or an active
 *   delegate of at least one project (same rule as My PI Delegates). Such a
 *   user only gets their own scope: `scope=all` is still refused, so the
 *   portfolio-wide view stays with the non-contributor roles.
 * Any other role mix passes, SYSTEM_ADMIN included, so a future role is not
 * silently locked out the way an `@Roles` allow-list would.
 */
@Injectable()
export class PfmAccessGuard implements CanActivate {
  constructor(private readonly repository: PooledFundingMonitorRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const roles: number[] = Array.isArray(user?.roles)
      ? user.roles.filter((role: unknown) => Number.isInteger(role))
      : [];

    if (
      request?.credential === 'machine' ||
      !user ||
      !Number.isInteger(user.sec_user_id) ||
      roles.length === 0
    ) {
      throw this.denied();
    }

    if (roles.some((role) => role !== SecRolesEnum.CONTRIBUTOR)) {
      return true;
    }

    if (
      request?.query?.scope === PfmScopeEnum.ALL ||
      !(await this.repository.managesAnyProject(user.sec_user_id))
    ) {
      throw this.denied();
    }

    return true;
  }

  private denied(): ForbiddenException {
    return new ForbiddenException(
      'CGIAR Portfolio Contribution Monitor is not available for this user',
    );
  }
}
