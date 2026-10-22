import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PooledFundingMonitorRepository } from '../repositories/pooled-funding-monitor.repository';
import { PfmAccessGuard } from './pfm-access.guard';

describe('PfmAccessGuard', () => {
  const managesAnyProject = jest.fn<Promise<boolean>, [number]>();
  const guard = new PfmAccessGuard({
    managesAnyProject,
  } as unknown as PooledFundingMonitorRepository);

  beforeEach(() => {
    managesAnyProject.mockReset();
    managesAnyProject.mockResolvedValue(false);
  });

  const ctx = (
    user: unknown,
    credential = 'jwt',
    query: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, credential, query }),
      }),
    }) as unknown as ExecutionContext;

  // K-004 red inputs: [3,9] reddens under `some`; the machine case reddens when
  // the credential check is deleted; [null] reddens against the attempt-1 logic.
  describe('denied (403)', () => {
    it.each([
      [
        'contributor-only [3], PI of nothing',
        { sec_user_id: 7, roles: [3] },
        'jwt',
      ],
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
    ])('%s', async (_label, user, credential) => {
      await expect(guard.canActivate(ctx(user, credential))).rejects.toThrow(
        ForbiddenException,
      );
    });

    // Owner 2026-10-21: a PI / delegate (Contributor only) does not get the whole portfolio.
    it('contributor-only PI or delegate asking for the whole portfolio (scope=all)', async () => {
      managesAnyProject.mockResolvedValue(true);
      await expect(
        guard.canActivate(
          ctx({ sec_user_id: 7, roles: [3] }, 'jwt', { scope: 'all' }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('machine token is refused before the PI lookup runs', async () => {
      managesAnyProject.mockResolvedValue(true);
      await expect(
        guard.canActivate(ctx({ sec_user_id: 7, roles: [3] }, 'machine')),
      ).rejects.toThrow(ForbiddenException);
      expect(managesAnyProject).not.toHaveBeenCalled();
    });
  });

  describe('allowed', () => {
    it.each([
      ['contributor + other [3, 9]', [3, 9]],
      ['contributor + null + other [3, null, 9]', [3, null, 9]],
      ['system admin only [1]', [1]],
      ['role 10 only [10]', [10]],
      ['role 7 only [7]', [7]],
    ])('%s', async (_label, roles) => {
      await expect(
        guard.canActivate(ctx({ sec_user_id: 7, roles }, 'jwt')),
      ).resolves.toBe(true);
      expect(managesAnyProject).not.toHaveBeenCalled();
    });

    it('non-contributor may ask for the whole portfolio', async () => {
      await expect(
        guard.canActivate(
          ctx({ sec_user_id: 7, roles: [9] }, 'jwt', { scope: 'all' }),
        ),
      ).resolves.toBe(true);
    });

    it.each([
      ['no scope (defaults to mine)', {}],
      ['scope=mine', { scope: 'mine' }],
    ])(
      'contributor-only who is PI or delegate of a project, %s',
      async (_label, query) => {
        managesAnyProject.mockResolvedValue(true);
        await expect(
          guard.canActivate(ctx({ sec_user_id: 7, roles: [3] }, 'jwt', query)),
        ).resolves.toBe(true);
        expect(managesAnyProject).toHaveBeenCalledWith(7);
      },
    );

    it('bypass credential with a real role', async () => {
      await expect(
        guard.canActivate(ctx({ sec_user_id: 7, roles: [1] }, 'bypass')),
      ).resolves.toBe(true);
    });
  });
});
