import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SecRolesEnum } from '../enum/sec_role.enum';
import {
  PROTECTED_CONFIG_KEY_PREFIXES,
  ProtectedConfigKeysGuard,
} from './protected-config-keys.guard';

const contextFor = (key: string, roles: unknown[] = []): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        params: { key },
        user: { sec_user_id: 7, roles },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('ProtectedConfigKeysGuard', () => {
  const guard = new ProtectedConfigKeysGuard();

  it('denies a TECHNICAL_SUPPORT user the hard-delete flag', () => {
    // The defect this closes: PATCH /api/configuration/:key is open to
    // TECHNICAL_SUPPORT, and flipping hard_delete_enabled to true arms irreversible
    // deletion on the SYNC path — which has no dry run, no digest and no TTL. That
    // role cannot call either sweep endpoint, so the kill switch had a WIDER write
    // ACL than the feature itself.
    expect(() =>
      guard.canActivate(
        contextFor('duplicate_resolution.hard_delete_enabled', [
          SecRolesEnum.TECHNICAL_SUPPORT,
        ]),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows a SYSTEM_ADMIN the same key', () => {
    expect(
      guard.canActivate(
        contextFor('duplicate_resolution.hard_delete_enabled', [
          SecRolesEnum.SYSTEM_ADMIN,
        ]),
      ),
    ).toBe(true);
  });

  it('protects by prefix, so a flag added later inherits the restriction', () => {
    // The point of a prefix match: a new destructive flag should not have to
    // remember to be protected.
    expect(() =>
      guard.canActivate(
        contextFor('duplicate_resolution.some_future_flag', [
          SecRolesEnum.TECHNICAL_SUPPORT,
        ]),
      ),
    ).toThrow(ForbiddenException);
  });

  it('leaves unrelated configuration open to TECHNICAL_SUPPORT', () => {
    // Narrowing the whole endpoint would have been the blunt fix and would have
    // broken legitimate configuration work.
    expect(
      guard.canActivate(
        contextFor('ARI_SUPPORT_EMAIL', [SecRolesEnum.TECHNICAL_SUPPORT]),
      ),
    ).toBe(true);
  });

  it('denies a user with no roles at all', () => {
    expect(() =>
      guard.canActivate(contextFor('duplicate_resolution.sweep_lock')),
    ).toThrow(ForbiddenException);
  });

  it('accepts roles arriving as strings', () => {
    // Roles reach the request as JSON_ARRAYAGG output, so numeric ids can be
    // strings. A strict === would have silently denied every real admin.
    expect(
      guard.canActivate(
        contextFor('duplicate_resolution.hard_delete_enabled', [
          String(SecRolesEnum.SYSTEM_ADMIN),
        ]),
      ),
    ).toBe(true);
  });

  it('names the key in the refusal so an operator knows what was blocked', () => {
    try {
      guard.canActivate(
        contextFor('duplicate_resolution.plan_ttl_minutes', [
          SecRolesEnum.TECHNICAL_SUPPORT,
        ]),
      );
      throw new Error('expected a ForbiddenException');
    } catch (error) {
      expect((error as ForbiddenException).message).toContain(
        'duplicate_resolution.plan_ttl_minutes',
      );
    }
  });

  it('exports the protected prefixes so the runbook and tests agree', () => {
    expect(PROTECTED_CONFIG_KEY_PREFIXES).toContain('duplicate_resolution.');
  });
});
