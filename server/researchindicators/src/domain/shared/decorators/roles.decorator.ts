import { SetMetadata } from '@nestjs/common';
import { SecRolesEnum } from '../enum/sec_role.enum';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator to define the roles required to access an endpoint.
 * Users with the GENERAL_ADMIN or GLOBAL role will always have access automatically.
 *
 * @param roles - List of roles allowed to access the endpoint
 *
 * @example
 * ```typescript
 * @Roles(SecRolesEnum.CONTRIBUTOR, SecRolesEnum.CONTRACT_CONTRIBUTOR)
 * @UseGuards(RolesGuard)
 * @Get()
 * async getData() {
 *   // Only users with the roles CONTRIBUTOR, CONTRACT_CONTRIBUTOR, GENERAL_ADMIN, or GLOBAL can access
 * }
 * ```
 */

export const Roles = (...roles: SecRolesEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
