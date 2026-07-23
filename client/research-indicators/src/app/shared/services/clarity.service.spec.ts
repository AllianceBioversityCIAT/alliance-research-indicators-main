const clarityMock = {
  init: jest.fn(),
  consent: jest.fn(),
  setTag: jest.fn(),
  event: jest.fn(),
  upgrade: jest.fn()
};

global.console = { ...console, error: jest.fn() };

jest.mock('@microsoft/clarity', () => clarityMock);

import { ClarityService } from './clarity.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { signal } from '@angular/core';
import type { DataCache } from '@shared/interfaces/cache.interface';

jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  return {
    ...actual,
    inject: (token: any) => {
      if (token && token.name === 'Router') return { navigate: jest.fn() };
      if (token && token.name === 'CacheService') return cacheServiceMock;
      return undefined;
    }
  };
});

describe('ClarityService', () => {
  let service: ClarityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClarityService();
  });

  describe('init', () => {
    it('should initialize Clarity and set user info', () => {
      service['initialized'] = false;
      service.init();
      expect(clarityMock.init).toHaveBeenCalled();
      expect(clarityMock.consent).toHaveBeenCalled();
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_id', expect.any(String));
      expect(service['initialized']).toBe(true);
    });
    it('should not initialize if already initialized', () => {
      service['initialized'] = true;
      service.init();
      expect(clarityMock.init).not.toHaveBeenCalled();
    });
    it('should catch error in initClarity', () => {
      service['initialized'] = false;
      clarityMock.init.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.init();
      expect(console.error).toHaveBeenCalledWith('Failed to initialize Clarity:', expect.any(Error));
    });
  });

  describe('initClarity', () => {
    it('should call clarity.init and consent', () => {
      service['initClarity']();
      expect(clarityMock.init).toHaveBeenCalled();
      expect(clarityMock.consent).toHaveBeenCalled();
    });
    it('should throw and log error if clarity.init fails', () => {
      clarityMock.init.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      expect(() => service['initClarity']()).toThrow();
      expect(console.error).toHaveBeenCalledWith('Error initializing Clarity:', expect.any(Error));
    });
  });

  describe('updateState', () => {
    it('should set page tag', () => {
      service.updateState('/test');
      expect(clarityMock.setTag).toHaveBeenCalledWith('page', '/test');
    });
    it('should catch and log error', () => {
      clarityMock.setTag.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.updateState('/fail');
      expect(console.error).toHaveBeenCalledWith('Error updating Clarity state:', expect.any(Error));
    });
  });

  describe('setUserInfo', () => {
    it('should set user tags if user exists', () => {
      service['setUserInfo']();
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_id', expect.any(String));
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_email', expect.any(String));
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_role', expect.any(String));
    });
    it('should set empty string for email when user.email is null', () => {
      const cacheWithNullEmail: DataCache = {
        access_token: '',
        refresh_token: '',
        user: {
          first_name: 'John',
          last_name: 'Doe',
          email: null as any,
          roleName: 'admin'
        } as any,
        exp: 0
      };
      cacheServiceMock.dataCache = signal(cacheWithNullEmail);
      service['setUserInfo']();
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_email', '');
    });
    it('should set empty string for role when user.roleName is null', () => {
      const cacheWithNullRole: DataCache = {
        access_token: '',
        refresh_token: '',
        user: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@test.com',
          roleName: null as any
        } as any,
        exp: 0
      };
      cacheServiceMock.dataCache = signal(cacheWithNullRole);
      service['setUserInfo']();
      expect(clarityMock.setTag).toHaveBeenCalledWith('user_role', '');
    });
    it('should not set tags if no user', () => {
      const emptyCache: DataCache = {
        access_token: '',
        refresh_token: '',
        user: undefined as any,
        exp: 0
      };
      cacheServiceMock.dataCache = signal(emptyCache);
      service['setUserInfo']();
      expect(clarityMock.setTag).not.toHaveBeenCalledWith('user_id', expect.any(String));
    });
    it('should catch and log error', () => {
      cacheServiceMock.dataCache = (() => {
        throw new Error('fail');
      }) as any;
      service['setUserInfo']();
      expect(console.error).toHaveBeenCalledWith('Error setting user info:', expect.any(Error));
    });
  });

  describe('updateUserInfo', () => {
    it('should call setUserInfo', () => {
      const spy = jest.spyOn(service as any, 'setUserInfo');
      service.updateUserInfo();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should call clarity.event and set tags if data provided', () => {
      service.trackEvent('test', { foo: 1, bar: 'baz' });
      expect(clarityMock.event).toHaveBeenCalledWith('test');
      expect(clarityMock.setTag).toHaveBeenCalledWith('foo', '1');
      expect(clarityMock.setTag).toHaveBeenCalledWith('bar', 'baz');
    });
    it('should call clarity.event without tags if no data', () => {
      service.trackEvent('test');
      expect(clarityMock.event).toHaveBeenCalledWith('test');
    });
    it('should catch and log error', () => {
      clarityMock.event.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.trackEvent('fail');
      expect(console.error).toHaveBeenCalledWith('Error tracking event:', expect.any(Error));
    });
  });

  describe('setTags', () => {
    it('should set all tags', () => {
      service.setTags({ a: '1', b: '2' });
      expect(clarityMock.setTag).toHaveBeenCalledWith('a', '1');
      expect(clarityMock.setTag).toHaveBeenCalledWith('b', '2');
    });
    it('should catch and log error', () => {
      clarityMock.setTag.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.setTags({ fail: 'x' });
      expect(console.error).toHaveBeenCalledWith('Error setting tags:', expect.any(Error));
    });
  });

  describe('upgradeSession', () => {
    it('should call clarity.upgrade', () => {
      service.upgradeSession('reason');
      expect(clarityMock.upgrade).toHaveBeenCalledWith('reason');
    });
    it('should catch and log error', () => {
      clarityMock.upgrade.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.upgradeSession('fail');
      expect(console.error).toHaveBeenCalledWith('Error upgrading session:', expect.any(Error));
    });
  });

  describe('setCookieConsent', () => {
    it('should call clarity.consent with true', () => {
      service.setCookieConsent(true);
      expect(clarityMock.consent).toHaveBeenCalledWith(true);
    });
    it('should call clarity.consent with false', () => {
      service.setCookieConsent(false);
      expect(clarityMock.consent).toHaveBeenCalledWith(false);
    });
    it('should catch and log error', () => {
      clarityMock.consent.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      service.setCookieConsent(true);
      expect(console.error).toHaveBeenCalledWith('Error setting cookie consent:', expect.any(Error));
    });
  });
});
