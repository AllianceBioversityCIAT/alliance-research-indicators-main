import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecRolesEnum } from '../enum/sec_role.enum';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SecRolesEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // If no roles are required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // If no user, deny access
    }

    // If user is GENERAL_ADMIN, allow access automatically
    if (user.roles?.includes(SecRolesEnum.GENERAL_ADMIN)) {
      return true;
    }

    // Check if user has any of the required roles
    return this.hasRequiredRole(user, requiredRoles);
  }

  private hasRequiredRole(user: any, requiredRoles: SecRolesEnum[]): boolean {
    // Check roles array
    if (user.roles && Array.isArray(user.roles)) {
      return requiredRoles.some((role) => user.roles.includes(role));
    }

    return false;
  }
}
