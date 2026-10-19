import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { NotContributorOnlyGuard } from './not-contributor-only.guard';

describe('NotContributorOnlyGuard', () => {
  const guard = new NotContributorOnlyGuard();

  const ctx = (user: unknown, credential = 'jwt'): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user, credential }) }),
    }) as unknown as ExecutionContext;

  // K-004 red inputs: [3,9] reddens under `some`; the machine case reddens when
  // the credential check is deleted; [null] reddens against the attempt-1 logic.
  describe('denied (403)', () => {
    it.each([
      ['contributor-only [3]', { sec_user_id: 7, roles: [3] }, 'jwt'],
      ['contributor repeated [3, 3]', { sec_user_id: 7, roles: [3, 3] }, 'jwt'],
      ['empty roles []', { sec_user_id: 7, roles: [] }, 'jwt'],
      ['no active roles [null]', { sec_user_id: 7, roles: [null] }, 'jwt'],
      [
        'contributor + null [3, null]',
        { sec_user_id: 7, roles: [3, null] },
        'jwt',
      ],
      ['roles missing', { sec_user_id: 7 }, 'jwt'],
      ['no sec_user_id', { roles: [1] }, 'jwt'],
      ['string sec_user_id', { sec_user_id: '7', roles: [1] }, 'jwt'],
      ['missing user', undefined, 'jwt'],
      ['null user', null, 'jwt'],
      ['machine token, admin owner', { sec_user_id: 7, roles: [1] }, 'machine'],
      [
        'machine token, role 9 owner',
        { sec_user_id: 7, roles: [9] },
        'machine',
      ],
    ])('%s', (_label, user, credential) => {
      expect(() => guard.canActivate(ctx(user, credential))).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('allowed', () => {
    it.each([
      ['contributor + other [3, 9]', [3, 9]],
      ['contributor + null + other [3, null, 9]', [3, null, 9]],
      ['system admin only [1]', [1]],
      ['role 10 only [10]', [10]],
      ['role 7 only [7]', [7]],
    ])('%s', (_label, roles) => {
      expect(guard.canActivate(ctx({ sec_user_id: 7, roles }, 'jwt'))).toBe(
        true,
      );
    });

    it('bypass credential with a real role', () => {
      expect(
        guard.canActivate(ctx({ sec_user_id: 7, roles: [1] }, 'bypass')),
      ).toBe(true);
    });
  });
});
