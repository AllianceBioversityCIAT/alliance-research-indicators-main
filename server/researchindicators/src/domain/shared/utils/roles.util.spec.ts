import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { validateRoles } from './roles.util';
import { SecRolesEnum } from '../enum/sec_role.enum';

describe('validateRoles', () => {
  it('throws when user_id is missing', () => {
    expect(() =>
      validateRoles(
        { user_id: undefined, roles: [] } as any,
        SecRolesEnum.CENTER_ADMIN,
      ),
    ).toThrow(BadRequestException);
  });

  it('allows any role when user is SUP_ADMIN', () => {
    const ok = validateRoles(
      { user_id: 1, roles: [SecRolesEnum.SYSTEM_ADMIN] } as any,
      SecRolesEnum.TECHNICAL_SUPPORT,
    );
    expect(ok).toBe(true);
  });

  it('returns true when user has a required role', () => {
    const ok = validateRoles(
      { user_id: 2, roles: [SecRolesEnum.TECHNICAL_SUPPORT] } as any,
      SecRolesEnum.TECHNICAL_SUPPORT,
    );
    expect(ok).toBe(true);
  });

  it('throws ForbiddenException when role is missing', () => {
    expect(() =>
      validateRoles(
        { user_id: 3, roles: [SecRolesEnum.CENTER_ADMIN] } as any,
        SecRolesEnum.TECHNICAL_SUPPORT,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws BadRequestException when roles array is invalid', () => {
    expect(() =>
      validateRoles(
        { user_id: 4, roles: null } as any,
        SecRolesEnum.CENTER_ADMIN,
      ),
    ).toThrow(BadRequestException);
  });
});
