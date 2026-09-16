import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { piDelegatesGuard } from './pi-delegates.guard';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from '@services/api.service';

// The guard closes the direct-URL path to a module the sidebar already hides.

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    piDelegatesGuard({ path: 'my-pi-delegates' }, [])
  ) as Promise<boolean | UrlTree>;
}

describe('piDelegatesGuard', () => {
  let apiMock: { GET_PiDelegateAccess: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  function configure(userId: number | null, hasAccess = true) {
    apiMock = {
      GET_PiDelegateAccess: jest.fn().mockResolvedValue({
        successfulRequest: true,
        data: { has_access: hasAccess }
      })
    };
    routerMock = { createUrlTree: jest.fn().mockReturnValue({ toString: () => '/home' } as UrlTree) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CacheService,
          useValue: { dataCache: signal({ user: userId != null ? { sec_user_id: userId } : undefined }) }
        },
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  }

  it('lets a PI or delegate through', async () => {
    configure(99, true);

    await expect(runGuard()).resolves.toBe(true);
    expect(apiMock.GET_PiDelegateAccess).toHaveBeenCalledWith(99);
  });

  it('redirects home when the user manages no project (negative discriminator)', async () => {
    configure(99, false);

    const result = await runGuard();
    expect(result).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/home']);
  });

  it('redirects home when there is no signed-in user, without asking the API', async () => {
    configure(null);

    const result = await runGuard();
    expect(result).not.toBe(true);
    expect(apiMock.GET_PiDelegateAccess).not.toHaveBeenCalled();
  });

  it('redirects home when the check fails', async () => {
    configure(99, true);
    apiMock.GET_PiDelegateAccess.mockRejectedValueOnce(new Error('network'));

    const result = await runGuard();
    expect(result).not.toBe(true);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/home']);
  });
});
