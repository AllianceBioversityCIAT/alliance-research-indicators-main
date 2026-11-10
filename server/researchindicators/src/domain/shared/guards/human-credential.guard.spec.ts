import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import {
  HumanCredentialGuard,
  MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE,
} from './human-credential.guard';

const contextFor = (request: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('HumanCredentialGuard (NFR-ORG-004)', () => {
  const guard = new HumanCredentialGuard();

  it('denies a machine credential with 403, even when the user holds SYSTEM_ADMIN', () => {
    const request = {
      credential: 'machine',
      user: { sec_user_id: 7, roles: [1] },
    };
    expect(() => guard.canActivate(contextFor(request))).toThrow(
      new ForbiddenException(MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE),
    );
  });

  it.each(['jwt', 'bypass'])('lets a %s credential through', (credential) => {
    expect(
      guard.canActivate(
        contextFor({ credential, user: { sec_user_id: 7, roles: [] } }),
      ),
    ).toBe(true);
  });

  it('lets a request with no credential through (RolesGuard and the middleware still decide)', () => {
    expect(guard.canActivate(contextFor({}))).toBe(true);
  });
});
