import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SecRolesEnum } from '../enum/sec_role.enum';
import { CurrentUserUtil } from './current-user.util';

export const validateRoles = (
  user: CurrentUserUtil,
  ...roles: SecRolesEnum[]
): boolean => {
  if (!user?.user_id) {
    throw new BadRequestException(
      'Invalid request: User roles are missing or improperly defined.',
    );
  }

  if (user.roles?.includes(SecRolesEnum.SUP_ADMIN)) {
    return true;
  }

  return hasRequiredRole(user, roles);
};

const hasRequiredRole = (
  user: CurrentUserUtil,
  requiredRoles: SecRolesEnum[],
): boolean => {
  if (user.roles && Array.isArray(user.roles)) {
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (hasRole) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied: User does not have the required permissions.',
    );
  }

  throw new BadRequestException('User roles are not defined or invalid.');
};
