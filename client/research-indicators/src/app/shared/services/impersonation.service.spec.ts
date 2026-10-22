// @akili-spec changes/profile-simulation
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { ImpersonationService } from './impersonation.service';
import { CacheService } from './cache/cache.service';
import { ApiService } from './api.service';
import { DataCache, UserCache } from '../interfaces/cache.interface';
import { ImpersonationStartResponse, ImpersonationTargetProfile } from '../interfaces/impersonation.interface';

describe('ImpersonationService', () => {
  let service: ImpersonationService;
  let cacheMock: Partial<CacheService>;
  let apiMock: Partial<ApiService>;
  let routerMock: Partial<Router>;
  let dataCacheSignal: WritableSignal<DataCache>;

  const adminUser: UserCache = {
    sec_user_id: 1,
    is_active: true,
    first_name: 'Admin',
    last_name: 'User',
    roleName: 'System Admin',
    email: 'admin@correo.com',
    status_id: 1,
    user_role_list: [
      {
        is_active: true,
        user_id: 1,
        role_id: 1,
        role: { is_active: true, justification_update: null, sec_role_id: 1, name: 'System Admin', focus_id: 0 }
      }
    ]
  };

  const targetProfile: ImpersonationTargetProfile = {
    sec_user_id: 55,
    is_active: true,
    first_name: 'Target',
    last_name: 'User',
    email: 'target@correo.com',
    status_id: 1,
    user_role_list: [
      {
        is_active: true,
        user_id: 55,
        role_id: 10,
        role: { is_active: true, justification_update: null, sec_role_id: 10, name: 'Contributor Plus', focus_id: 0 }
      },
      {
        is_active: true,
        user_id: 55,
        role_id: 9,
        role: { is_active: true, justification_update: null, sec_role_id: 9, name: 'Center Admin', focus_id: 0 }
      }
    ]
  };

  const startResponse: ImpersonationStartResponse = {
    session: { session_id: 'sess-1', started_at: '2026-08-25T10:00:00.000Z', expires_at: '2026-08-25T14:00:00.000Z' },
    user: targetProfile
  };

  beforeEach(() => {
    localStorage.clear();

    dataCacheSignal = signal<DataCache>({
      access_token: 'admin-access-token',
      refresh_token: 'admin-refresh-token',
      exp: 1893456000,
      user: adminUser
    });

    cacheMock = { dataCache: dataCacheSignal };
    apiMock = {
      endImpersonation: jest.fn().mockResolvedValue({ successfulRequest: true, data: {} }),
      currentImpersonation: jest.fn()
    };
    routerMock = {};

    TestBed.configureTestingModule({
      providers: [
        { provide: CacheService, useValue: cacheMock },
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    service = TestBed.inject(ImpersonationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('start()', () => {
    it('swaps dataCache.user to the target, computes roleName by the preferred-role rule, leaves tokens untouched, and stores the admin snapshot', () => {
      service.start(startResponse);

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      // AC: R-IMP-010 BUT — tokens are never touched by the swap.
      expect(persisted.access_token).toBe('admin-access-token');
      expect(persisted.refresh_token).toBe('admin-refresh-token');
      expect(persisted.exp).toBe(1893456000);
      // Identity swap: data.user is now the target.
      expect(persisted.user.sec_user_id).toBe(55);
      // Preferred-role rule (role_id===1 || role_id===9 || first): roles [10, 9] -> role 9's name.
      expect(persisted.user.roleName).toBe('Center Admin');

      const storedImpersonation = JSON.parse(localStorage.getItem('impersonation') as string);
      expect(storedImpersonation.session.session_id).toBe('sess-1');
      expect(storedImpersonation.actor.sec_user_id).toBe(1);
      expect(storedImpersonation.actor.roleName).toBe('System Admin');

      expect(service.active()).toBe(true);
      expect(service.session()?.session_id).toBe('sess-1');
      expect(service.actor()?.sec_user_id).toBe(1);
      expect(service.sessionId()).toBe('sess-1');
    });
  });

  describe('end()', () => {
    beforeEach(() => {
      service.start(startResponse);
    });

    it('restores the actor into dataCache and localStorage["data"], and removes the impersonation key', async () => {
      const result = await service.end('manual');

      expect(apiMock.endImpersonation).toHaveBeenCalledWith('sess-1', 'manual');

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(1);
      expect(localStorage.getItem('impersonation')).toBeNull();
      expect(service.active()).toBe(false);
      expect(service.session()).toBeNull();
      expect(service.actor()).toBeNull();
      expect(result.actor?.sec_user_id).toBe(1);
    });

    it('still restores locally when the api end call rejects', async () => {
      (apiMock.endImpersonation as jest.Mock).mockRejectedValue(new Error('network down'));

      const result = await service.end('manual');

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(1);
      expect(localStorage.getItem('impersonation')).toBeNull();
      expect(service.active()).toBe(false);
      expect(result.actor?.sec_user_id).toBe(1);
    });

    it("never calls the api for reason 'server-invalid' (the server already rejected the session)", async () => {
      await service.end('server-invalid');

      expect(apiMock.endImpersonation).not.toHaveBeenCalled();
      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(1);
      expect(localStorage.getItem('impersonation')).toBeNull();
    });
  });

  describe('restore()', () => {
    it('is a no-op when no impersonation key is stored', async () => {
      await service.restore();

      expect(apiMock.currentImpersonation).not.toHaveBeenCalled();
      expect(service.restoring()).toBe(false);
      expect(service.active()).toBe(false);
    });

    it('adopts the returned user/session when /current reports active:true', async () => {
      service.start(startResponse);
      const restoredSessionId = service.sessionId();

      (apiMock.currentImpersonation as jest.Mock).mockResolvedValue({
        successfulRequest: true,
        data: {
          active: true,
          session: { session_id: 'sess-1', started_at: '2026-08-25T10:00:00.000Z', expires_at: '2026-08-25T14:00:00.000Z' },
          actor: { sec_user_id: 1, first_name: 'Admin', last_name: 'User', email: 'admin@correo.com' },
          user: targetProfile
        }
      });

      await service.restore();

      expect(apiMock.currentImpersonation).toHaveBeenCalledWith(restoredSessionId);
      expect(service.restoring()).toBe(false);
      expect(service.active()).toBe(true);
      expect(service.session()?.session_id).toBe('sess-1');
      // Restore keeps the FULL locally-stored actor snapshot (not the minimal /current actor).
      expect(service.actor()?.roleName).toBe('System Admin');

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(55);
    });

    it('clears the stored state locally when /current reports active:false, without calling endImpersonation', async () => {
      service.start(startResponse);

      (apiMock.currentImpersonation as jest.Mock).mockResolvedValue({
        successfulRequest: true,
        data: { active: false }
      });

      await service.restore();

      expect(service.restoring()).toBe(false);
      expect(service.active()).toBe(false);
      expect(localStorage.getItem('impersonation')).toBeNull();
      expect(apiMock.endImpersonation).not.toHaveBeenCalled();

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(1);
    });

    it('clears the stored state locally when /current rejects', async () => {
      service.start(startResponse);
      (apiMock.currentImpersonation as jest.Mock).mockRejectedValue(new Error('403'));

      await service.restore();

      expect(service.restoring()).toBe(false);
      expect(service.active()).toBe(false);
      expect(localStorage.getItem('impersonation')).toBeNull();

      const persisted: DataCache = JSON.parse(localStorage.getItem('data') as string);
      expect(persisted.user.sec_user_id).toBe(1);
    });
  });
  describe('edge cases', () => {
    it('sessionId() is null when there is no session', () => {
      expect(service.sessionId()).toBeNull();
    });

    it('end() without stored state falls back to the in-memory actor and skips the api', async () => {
      service.actor.set(adminUser);
      const result = await service.end('manual');
      expect(apiMock.endImpersonation).not.toHaveBeenCalled();
      expect(result.actor?.sec_user_id).toBe(1);
      expect(JSON.parse(localStorage.getItem('data') as string).user.sec_user_id).toBe(1);
    });

    it('end() without stored state or actor returns a null actor and leaves data untouched', async () => {
      const result = await service.end('manual');
      expect(result.actor).toBeNull();
      expect(localStorage.getItem('data')).toBeNull();
    });

    it('treats a corrupt stored value as no state', async () => {
      localStorage.setItem('impersonation', '{not-json');
      await service.restore();
      expect(apiMock.currentImpersonation).not.toHaveBeenCalled();
      expect(service.active()).toBe(false);
    });

    it('uses an empty roleName when the target has no roles or a null/missing list', () => {
      service.start({ ...startResponse, user: { ...targetProfile, user_role_list: [] } });
      expect(dataCacheSignal().user.roleName).toBe('');
      service.start({ ...startResponse, user: { ...targetProfile, user_role_list: undefined as never } });
      expect(dataCacheSignal().user.roleName).toBe('');
    });

    it('prefers role 1, otherwise falls back to the first role when neither 1 nor 9 exists', () => {
      const role = (id: number, name: string) => ({
        is_active: true,
        user_id: 55,
        role_id: id,
        role: { is_active: true, justification_update: null, sec_role_id: id, name, focus_id: 0 }
      });
      service.start({ ...startResponse, user: { ...targetProfile, user_role_list: [role(10, 'Contributor Plus'), role(1, 'System Admin')] } });
      expect(dataCacheSignal().user.roleName).toBe('System Admin');
      service.start({ ...startResponse, user: { ...targetProfile, user_role_list: [role(10, 'Contributor Plus'), role(11, 'Other')] } });
      expect(dataCacheSignal().user.roleName).toBe('Contributor Plus');
    });

    it('end() times out a hanging api call after 3 s and still restores locally', async () => {
      jest.useFakeTimers();
      try {
        service.start(startResponse);
        (apiMock.endImpersonation as jest.Mock).mockReturnValue(new Promise(() => undefined));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const pending = service.end('logout');
        await jest.advanceTimersByTimeAsync(3000);
        const result = await pending;
        expect(consoleSpy).toHaveBeenCalled();
        expect(result.actor?.sec_user_id).toBe(1);
        expect(service.active()).toBe(false);
        consoleSpy.mockRestore();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
