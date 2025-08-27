import { SetMetadata } from '@nestjs/common';
import { SecRolesEnum } from '../enum/sec_role.enum';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorador para definir los roles requeridos para acceder a un endpoint.
 * Los usuarios con rol GENERAL_ADMIN o GLOBAL siempre tendrán acceso automáticamente.
 *
 * @param roles - Array de roles que pueden acceder al endpoint
 *
 * @example
 * ```typescript
 * @Roles(SecRolesEnum.CONTRIBUTOR, SecRolesEnum.CONTRACT_CONTRIBUTOR)
 * @UseGuards(RolesGuard)
 * @Get()
 * async getData() {
 *   // Solo usuarios con rol CONTRIBUTOR, CONTRACT_CONTRIBUTOR, GENERAL_ADMIN o GLOBAL pueden acceder
 * }
 * ```
 */
export const Roles = (...roles: SecRolesEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
