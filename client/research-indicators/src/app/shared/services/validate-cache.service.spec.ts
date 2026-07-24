import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { CacheService } from '@services/cache/cache.service';
import { ValidateCacheService } from './validate-cache.service';
import { ToPromiseService } from './to-promise.service';
import { environment } from '../../../environments/environment';

describe('ValidateCacheService', () => {
  let service: ValidateCacheService;
  let mockToPromiseService: jest.Mocked<Partial<ToPromiseService>>;
  let mockSwUpdate: jest.Mocked<Partial<SwUpdate>>;
  let mockCache: { dataCache: ReturnType<typeof signal<{ access_token: string }>> };

  beforeEach(() => {
    const toPromiseServiceMock = {
      get: jest.fn()
    };

    const swUpdateMock = {
      isEnabled: true,
      checkForUpdate: jest.fn().mockResolvedValue(true),
      activateUpdate: jest.fn().mockResolvedValue(true)
    };

    mockCache = {
      dataCache: signal({ access_token: 'test-token' })
    };

    TestBed.configureTestingModule({
      providers: [
        ValidateCacheService,
        { provide: ToPromiseService, useValue: toPromiseServiceMock },
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: CacheService, useValue: mockCache }
      ]
    });

    service = TestBed.inject(ValidateCacheService);
    mockToPromiseService = TestBed.inject(ToPromiseService) as jest.Mocked<Partial<ToPromiseService>>;
    mockSwUpdate = TestBed.inject(SwUpdate) as jest.Mocked<Partial<SwUpdate>>;

    // Mock localStorage
    let store: { [key: string]: string } = {};
    const mockLocalStorage = {
      getItem: (key: string): string | null => {
        return key in store ? store[key] : null;
      },
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };

    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true });
    Object.defineProperty(window, 'location', { value: { reload: jest.fn() }, configurable: true });
    Object.defineProperty(window, 'alert', { value: jest.fn(), configurable: true });
    Object.defineProperty(window, 'confirm', { value: jest.fn().mockReturnValue(true), configurable: true });

    // Mock caches API
    Object.defineProperty(window, 'caches', {
      value: {
        keys: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(true),
        open: jest.fn().mockResolvedValue({
          keys: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(true)
        })
      },
      configurable: true
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateVersions', () => {
    it('should not call configuration when there is no access token', async () => {
      mockCache.dataCache.set({ access_token: '' });

      await service.validateVersions();

      expect(mockToPromiseService.get).not.toHaveBeenCalled();

      mockCache.dataCache.set({ access_token: 'test-token' });
    });

    it('should return early when response or response.data is null', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: null });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should return early when response.data.simple_value is undefined', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should not request update if versions are the same', async () => {
      const version = '1.0.0';
      localStorage.setItem('lastVersionValidated', version);
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: version } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should request update if versions are different', async () => {
      const oldVersion = '1.0.0';
      const newVersion = '1.1.0';
      localStorage.setItem('lastVersionValidated', oldVersion);
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: newVersion } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).toHaveBeenCalledWith(newVersion);
    });

    it('should request update if no local version', async () => {
      const newVersion = '1.1.0';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: newVersion } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).toHaveBeenCalledWith(newVersion);
    });

    it('should request update if local version is empty string', async () => {
      const newVersion = '3.0.0';
      localStorage.setItem('lastVersionValidated', '');
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: newVersion } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).toHaveBeenCalledWith(newVersion);
    });

    it('should not request update when versions are the same and last version is truthy', async () => {
      const version = '4.0.0';
      localStorage.setItem('lastVersionValidated', version);
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: version } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should apply silent update if pending version matches current', async () => {
      const version = '1.1.0';
      localStorage.setItem('pendingUpdateVersion', version);
      localStorage.setItem('lastVersionValidated', '1.0.0');
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: version } });
      const applySilentUpdateSpy = jest.spyOn(service as any, 'applySilentUpdate').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(applySilentUpdateSpy).toHaveBeenCalledWith(version);
    });

    it('should do nothing when pending matches current and equals last validated', async () => {
      const version = '2.0.0';
      localStorage.setItem('pendingUpdateVersion', version);
      localStorage.setItem('lastVersionValidated', version);
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: version } });
      const applySilentUpdateSpy = jest.spyOn(service as any, 'applySilentUpdate').mockResolvedValue(undefined);
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      expect(applySilentUpdateSpy).not.toHaveBeenCalled();
      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should request update when currentVersion differs from lastValidatedVersion (covering OR condition)', async () => {
      const oldVersion = '1.0.0';
      const newVersion = '2.0.0';
      localStorage.setItem('lastVersionValidated', oldVersion);
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: newVersion } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      // This covers the case where currentVersion !== lastValidatedVersion is true
      expect(requestUpdateSpy).toHaveBeenCalledWith(newVersion);
    });

    it('should request update when lastValidatedVersion is null (covering OR condition)', async () => {
      const newVersion = '1.5.0';
      // Ensure lastVersionValidated is null (not set)
      localStorage.removeItem('lastVersionValidated');
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { simple_value: newVersion } });
      const requestUpdateSpy = jest.spyOn(service, 'requeestUpdateFrontVersion').mockResolvedValue(undefined);

      await service.validateVersions();

      // This covers the case where !lastValidatedVersion is true
      expect(requestUpdateSpy).toHaveBeenCalledWith(newVersion);
    });
  });

  describe('requeestUpdateFrontVersion', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'downloadUpdatesInBackground').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'performImmediateUpdate').mockResolvedValue(undefined);
    });

    it('should perform immediate update when user confirms', async () => {
      const version = '1.1.0';
      (window.confirm as jest.Mock).mockReturnValue(true);
      const performUpdateSpy = jest.spyOn(service as any, 'performImmediateUpdate');

      await service.requeestUpdateFrontVersion(version);

      expect(window.confirm).toHaveBeenCalledWith(
        '🔄 New changes are available. Do you want to update the application now?\n\nThis will clear the cache and reload the page.'
      );
      expect(performUpdateSpy).toHaveBeenCalledWith(version);
    });

    it('should download in background when user cancels', async () => {
      const version = '1.1.0';
      (window.confirm as jest.Mock).mockReturnValue(false);
      const downloadSpy = jest.spyOn(service as any, 'downloadUpdatesInBackground');

      await service.requeestUpdateFrontVersion(version);

      expect(downloadSpy).toHaveBeenCalledWith(version);
    });

    it('should handle error and show alert', async () => {
      const version = '1.1.0';
      const error = new Error('Update error');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service as any, 'performImmediateUpdate').mockRejectedValue(error);

      await service.requeestUpdateFrontVersion(version);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating front version:', error);
      expect(window.alert).toHaveBeenCalledWith('❌ Update error. Please reload the page manually (Ctrl+F5 or Cmd+Shift+R)');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearStaticResourceCaches', () => {
    beforeEach(() => {
      const mockCache = {
        keys: jest
          .fn()
          .mockResolvedValue([
            { url: 'https://example.com/style.css' },
            { url: 'https://example.com/script.js' },
            { url: 'https://example.com/image.png' },
            { url: 'https://example.com/font.woff2' },
            { url: 'https://example.com/data.json' }
          ]),
        delete: jest.fn().mockResolvedValue(true)
      };

      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
          open: jest.fn().mockResolvedValue(mockCache),
          delete: jest.fn().mockResolvedValue(true)
        },
        configurable: true
      });
    });

    it('should clear static resource caches successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await (service as any).clearStaticResourceCaches();

      expect(window.caches.keys).toHaveBeenCalled();
      expect(window.caches.open).toHaveBeenCalledWith('cache1');
      expect(window.caches.open).toHaveBeenCalledWith('cache2');
      expect(consoleSpy).toHaveBeenCalledWith('Static resource caches (CSS, JS, images) cleared successfully');

      consoleSpy.mockRestore();
    });

    it('should handle error when clearing static resource caches', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Cache error');

      (window.caches.keys as jest.Mock).mockRejectedValue(error);

      await expect((service as any).clearStaticResourceCaches()).rejects.toThrow(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing static resource caches:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should do nothing if caches API is not available', async () => {
      Object.defineProperty(window, 'caches', { value: undefined, configurable: true });

      await expect((service as any).clearStaticResourceCaches()).resolves.not.toThrow();
    });

    it('should skip when there are no static resources in a cache', async () => {
      const mockCache = {
        keys: jest.fn().mockResolvedValue([{ url: 'https://example.com/data.api' }]),
        delete: jest.fn().mockResolvedValue(true)
      };
      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(['cacheX']),
          open: jest.fn().mockResolvedValue(mockCache)
        },
        configurable: true
      });

      await expect((service as any).clearStaticResourceCaches()).resolves.not.toThrow();
      expect(mockCache.delete).not.toHaveBeenCalled();
    });

    it('should handle error for a specific cache while continuing others', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const okCache = {
        keys: jest.fn().mockResolvedValue([{ url: 'https://example.com/style.css' }]),
        delete: jest.fn().mockResolvedValue(true)
      };
      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(['badCache', 'okCache']),
          open: jest.fn().mockImplementation((name: string) => {
            if (name === 'badCache') throw new Error('open error');
            return Promise.resolve(okCache);
          })
        },
        configurable: true
      });

      await expect((service as any).clearStaticResourceCaches()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const cacheNames = ['cache1', 'cache2', 'cache3'];

      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(cacheNames),
          delete: jest.fn().mockResolvedValue(true)
        },
        configurable: true
      });

      await (service as any).clearAllCaches();

      expect(window.caches.keys).toHaveBeenCalled();
      expect(window.caches.delete).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith('All 3 caches processed successfully');

      consoleSpy.mockRestore();
    });

    it('should handle error when clearing all caches', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Clear cache error');

      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockRejectedValue(error)
        },
        configurable: true
      });

      await expect((service as any).clearAllCaches()).rejects.toThrow(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing caches:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should do nothing if caches API is not available', async () => {
      Object.defineProperty(window, 'caches', { value: undefined, configurable: true });

      await expect((service as any).clearAllCaches()).resolves.not.toThrow();
    });

    it('should log when there are no caches to clear', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue([])
        },
        configurable: true
      });

      await (service as any).clearAllCaches();

      expect(consoleSpy).toHaveBeenCalledWith('No caches to clear');
      consoleSpy.mockRestore();
    });

    it('should continue and log errors for individual cache deletions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const names = ['a', 'b'];
      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(names),
          delete: jest.fn().mockImplementation((name: string) => {
            if (name === 'a') throw new Error('del error');
            return Promise.resolve(true);
          })
        },
        configurable: true
      });

      await expect((service as any).clearAllCaches()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('All 2 caches processed successfully');
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should log when a cache cannot be deleted (returns false)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      Object.defineProperty(window, 'caches', {
        value: {
          keys: jest.fn().mockResolvedValue(['ghostCache']),
          delete: jest.fn().mockResolvedValue(false)
        },
        configurable: true
      });

      await (service as any).clearAllCaches();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Cache not found or already deleted: ghostCache');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('updateServiceWorker', () => {
    it('should update service worker when update is available', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSwUpdate.isEnabled = true;
      mockSwUpdate.checkForUpdate = jest.fn().mockResolvedValue(true);
      mockSwUpdate.activateUpdate = jest.fn().mockResolvedValue(undefined);

      await (service as any).updateServiceWorker();

      expect(mockSwUpdate.checkForUpdate).toHaveBeenCalled();
      expect(mockSwUpdate.activateUpdate).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Service worker update available, activating...');
      expect(consoleSpy).toHaveBeenCalledWith('Service worker updated successfully');

      consoleSpy.mockRestore();
    });

    it('should handle case when no update is available', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSwUpdate.isEnabled = true;
      mockSwUpdate.checkForUpdate = jest.fn().mockResolvedValue(false);

      await (service as any).updateServiceWorker();

      expect(mockSwUpdate.checkForUpdate).toHaveBeenCalled();
      expect(mockSwUpdate.activateUpdate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('No service worker update available');

      consoleSpy.mockRestore();
    });

    it('should handle service worker error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Service worker error');
      mockSwUpdate.isEnabled = true;
      mockSwUpdate.checkForUpdate = jest.fn().mockRejectedValue(error);

      await expect((service as any).updateServiceWorker()).rejects.toThrow(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating service worker:', error);

      consoleErrorSpy.mockRestore();
    });

    it('should log warning when service worker is not enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSwUpdate.isEnabled = false;

      await (service as any).updateServiceWorker();

      expect(mockSwUpdate.checkForUpdate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Service worker not enabled');

      consoleSpy.mockRestore();
    });
  });

  describe('forceReload', () => {
    it('should force page reload immediately', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation();

      (service as any).forceReload();

      expect(consoleSpy).toHaveBeenCalledWith('Forcing page reload immediately...');
      expect(window.alert).toHaveBeenCalledWith('✅ Cache cleared successfully. The application will reload now...');
      expect(reloadSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('downloadUpdatesInBackground', () => {
    it('should download updates and set pending version', async () => {
      const version = '1.1.0';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(service as any, 'updateServiceWorker').mockResolvedValue(undefined);

      await (service as any).downloadUpdatesInBackground(version);

      expect(localStorage.getItem('pendingUpdateVersion')).toBe(version);
      expect(consoleSpy).toHaveBeenCalledWith('Downloading updates in background...');
      expect(consoleSpy).toHaveBeenCalledWith(`Version ${version} downloaded and ready for next refresh`);

      consoleSpy.mockRestore();
    });
  });

  describe('downloadUpdatesInBackground error path', () => {
    it('should catch and log errors', async () => {
      const version = '2.0.0';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(service as any, 'updateServiceWorker').mockRejectedValue(new Error('fail'));

      await (service as any).downloadUpdatesInBackground(version);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error downloading updates in background:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('performImmediateUpdate', () => {
    it('should perform immediate update and set version', async () => {
      const version = '1.1.0';
      jest.spyOn(service as any, 'clearAllCaches').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'clearStaticResourceCaches').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'clearApplicationCache').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'updateServiceWorker').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'forceReload').mockImplementation();

      await (service as any).performImmediateUpdate(version);

      expect(localStorage.getItem('lastVersionValidated')).toBe(version);
      expect(localStorage.getItem('pendingUpdateVersion')).toBeNull();
    });
  });

  describe('applySilentUpdate', () => {
    it('should apply silent update and set version', async () => {
      const version = '1.1.0';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(service as any, 'clearAllCaches').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'clearStaticResourceCaches').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'clearApplicationCache').mockResolvedValue(undefined);

      await (service as any).applySilentUpdate(version);

      expect(localStorage.getItem('lastVersionValidated')).toBe(version);
      expect(localStorage.getItem('pendingUpdateVersion')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Applying silent update...');
      expect(consoleSpy).toHaveBeenCalledWith(`Silent update applied for version ${version}`);

      consoleSpy.mockRestore();
    });
  });

  describe('applySilentUpdate error path', () => {
    it('should catch and log errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalAllSettled = Promise.allSettled;
      // @ts-expect-error override for test
      Promise.allSettled = jest.fn().mockRejectedValue(new Error('boom'));

      await (service as any).applySilentUpdate('3.0.0');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error applying silent update:', expect.any(Error));
      consoleErrorSpy.mockRestore();
      Promise.allSettled = originalAllSettled;
    });
  });

  describe('getConfiguration', () => {
    it('should call tp.get with correct parameters', () => {
      service.getConfiguration();

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`configuration/${environment.frontVersionKey}`);
    });
  });

  describe('clearApplicationCache branches', () => {
    let originalSessionStorage: Storage;
    beforeEach(() => {
      originalSessionStorage = window.sessionStorage;
    });
    afterEach(() => {
      Object.defineProperty(window, 'sessionStorage', { value: originalSessionStorage, configurable: true });
    });
    it('should attempt to clear indexedDB databases when supported', async () => {
      // @ts-expect-error add databases
      global.indexedDB = {
        databases: jest.fn().mockResolvedValue([{ name: 'db1' }]),
        deleteDatabase: jest.fn().mockImplementation(() => {
          const req: any = {};
          setTimeout(() => req.onsuccess && req.onsuccess(), 0);
          return req;
        })
      };

      await (service as any).clearApplicationCache();

      expect((indexedDB as any).databases).toHaveBeenCalled();
      expect((indexedDB as any).deleteDatabase).toHaveBeenCalledWith('db1');
    });

    it('should warn if indexedDB.databases throws', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      // @ts-expect-error add databases
      global.indexedDB = {
        databases: jest.fn().mockRejectedValue(new Error('nope'))
      };

      await (service as any).clearApplicationCache();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not clear IndexedDB:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('should throw when a fatal error happens', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          clear: jest.fn().mockImplementation(() => {
            throw new Error('fatal');
          })
        },
        configurable: true
      });

      await expect((service as any).clearApplicationCache()).rejects.toThrow('fatal');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing application cache:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('should skip deleteDatabase when a database has no name', async () => {
      // @ts-expect-error add databases
      global.indexedDB = {
        databases: jest.fn().mockResolvedValue([{ }]),
        deleteDatabase: jest.fn()
      };

      await (service as any).clearApplicationCache();

      expect((indexedDB as any).deleteDatabase).not.toHaveBeenCalled();
    });

    it('should handle deleteDatabase onerror (reject path)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      let captureReq: { onsuccess?: () => void; onerror?: () => void } = {};
      // @ts-expect-error add databases
      global.indexedDB = {
        databases: jest.fn().mockResolvedValue([{ name: 'db1' }]),
        deleteDatabase: jest.fn().mockImplementation(() => {
          const req = { onsuccess: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined };
          captureReq = req;
          return req;
        })
      };

      const p = (service as any).clearApplicationCache();
      await Promise.resolve();
      expect(captureReq.onerror).toBeDefined();
      captureReq.onerror!();

      await expect(p).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Could not clear IndexedDB:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('should handle case when indexedDB is not in window', async () => {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true, writable: true });

      await expect((service as any).clearApplicationCache()).resolves.not.toThrow();
    });
  });
});
