import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { validateRoles } from './roles.util';
import { SecRolesEnum } from '../enum/sec_role.enum';

describe('validateRoles', () => {
  it('throws when user_id is missing', () => {
    expect(() =>
      validateRoles(
        { user_id: undefined, roles: [] } as any,
        SecRolesEnum.GENERAL_ADMIN,
      ),
    ).toThrow(BadRequestException);
  });

  it('allows any role when user is SUP_ADMIN', () => {
    const ok = validateRoles(
      { user_id: 1, roles: [SecRolesEnum.SUP_ADMIN] } as any,
      SecRolesEnum.DEVELOPER,
    );
    expect(ok).toBe(true);
  });

  it('returns true when user has a required role', () => {
    const ok = validateRoles(
      { user_id: 2, roles: [SecRolesEnum.DEVELOPER] } as any,
      SecRolesEnum.DEVELOPER,
    );
    expect(ok).toBe(true);
  });

  it('throws ForbiddenException when role is missing', () => {
    expect(() =>
      validateRoles(
        { user_id: 3, roles: [SecRolesEnum.GENERAL_ADMIN] } as any,
        SecRolesEnum.DEVELOPER,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws BadRequestException when roles array is invalid', () => {
    expect(() =>
      validateRoles(
        { user_id: 4, roles: null } as any,
        SecRolesEnum.GENERAL_ADMIN,
      ),
    ).toThrow(BadRequestException);
  });
});
