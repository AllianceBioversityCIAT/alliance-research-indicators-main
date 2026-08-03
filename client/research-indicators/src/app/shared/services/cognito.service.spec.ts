import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { CognitoService } from './cognito.service';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from '@services/api.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from './clarity.service';
import { DateFormatConfigService } from './date-format-config.service';
import { ValidateCacheService } from './validate-cache.service';
import { environment } from '../../../environments/environment';
import { DataCache } from '@interfaces/cache.interface';

const activatedRouteMock = {
  snapshot: {
    queryParams: {}
  }
};

const routerMock = {
  navigate: jest.fn(),
  navigateByUrl: jest.fn().mockResolvedValue(true)
};

const cacheMock = {
  isValidatingToken: {
    set: jest.fn()
  },
  dataCache: {
    set: jest.fn()
  },
  isLoggedIn: {
    set: jest.fn()
  }
};

const apiMock = {
  login: jest.fn()
};

const actionsMock = {
  showGlobalAlert: jest.fn(),
  updateLocalStorage: jest.fn()
};

const clarityMock = {
  updateUserInfo: jest.fn()
};

const dateFormatConfigMock = {
  loadConfig: jest.fn().mockResolvedValue(null)
};

const validateCacheMock = {
  validateVersions: jest.fn().mockResolvedValue(undefined)
};

describe('CognitoService', () => {
  let service: CognitoService;
  let activatedRoute: any;
  let router: any;
  let cache: any;
  let api: any;
  let actions: any;
  let clarity: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CognitoService,
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: ApiService, useValue: apiMock },
        { provide: ActionsService, useValue: actionsMock },
        { provide: ClarityService, useValue: clarityMock },
        { provide: DateFormatConfigService, useValue: dateFormatConfigMock },
        { provide: ValidateCacheService, useValue: validateCacheMock }
      ]
    });
    service = TestBed.inject(CognitoService);
    activatedRoute = TestBed.inject(ActivatedRoute);
    router = TestBed.inject(Router);
    cache = TestBed.inject(CacheService);
    api = TestBed.inject(ApiService);
    actions = TestBed.inject(ActionsService);
    clarity = TestBed.inject(ClarityService);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('redirectToCognito', () => {
    it('should store returnUrl in sessionStorage when returnUrl starts with /', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

      service.redirectToCognito('/dashboard');

      expect(sessionStorage.getItem('loginReturnUrl')).toBe('/dashboard');
    });

    it('should redirect to cognito with correct URL', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      service.redirectToCognito();

      const expectedUrl =
        `${environment.cognitoDomain}oauth2/authorize` +
        `?response_type=code` +
        `&client_id=${environment.cognitoClientId}` +
        `&redirect_uri=${environment.cognitoRedirectUri}` +
        `&scope=openid+email+profile` +
        `&identity_provider=${environment.cognitoIdentityProvider}`;

      expect(window.location.href).toBe(expectedUrl);
    });
  });

  describe('validateCognitoCode', () => {
    it('should return early when no code in query params', async () => {
      activatedRoute.snapshot.queryParams = {};

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).not.toHaveBeenCalled();
      expect(api.login).not.toHaveBeenCalled();
    });

    it('should return early when queryParams is null', async () => {
      activatedRoute.snapshot.queryParams = null;

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).not.toHaveBeenCalled();
      expect(api.login).not.toHaveBeenCalled();
    });

    it('should return early when queryParams is undefined', async () => {
      activatedRoute.snapshot.queryParams = undefined;

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).not.toHaveBeenCalled();
      expect(api.login).not.toHaveBeenCalled();
    });

    it('should handle when queryParams is null and code is undefined', async () => {
      activatedRoute.snapshot.queryParams = null;

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).not.toHaveBeenCalled();
      expect(api.login).not.toHaveBeenCalled();
    });

    it('should handle successful login', async () => {
      sessionStorage.removeItem('loginReturnUrl');
      const code = 'test-code';
      const loginResponse = { successfulRequest: true, data: { token: 'test-token' } };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);
      jest.spyOn(global, 'setTimeout').mockImplementation(cb => {
        cb();
        return 1 as any;
      });

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.updateLocalStorage).toHaveBeenCalledWith(loginResponse);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should remove returnUrl from sessionStorage and navigateByUrl when returnUrl exists and starts with /', async () => {
      sessionStorage.setItem('loginReturnUrl', '/results-center');
      const code = 'test-code';
      const loginResponse = { successfulRequest: true, data: { token: 'test-token' } };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);
      jest.spyOn(global, 'setTimeout').mockImplementation(cb => {
        cb();
        return 1 as any;
      });

      await service.validateCognitoCode();

      expect(sessionStorage.getItem('loginReturnUrl')).toBeNull();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/results-center');
    });

    it('should handle failed login with error alert', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: 'Authentication failed' }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: 'Authentication failed',
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail having null errors', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: null }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: null,
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail having undefined errors', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: undefined }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: undefined,
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail without errors property', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { someOtherProperty: 'value' }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: undefined,
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail having empty string errors', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: '' }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: '',
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail having number errors', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: 500 }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: 500,
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should handle failed login with errorDetail having object errors', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: { message: 'Server error' } }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(true);
      expect(api.login).toHaveBeenCalledWith(code);
      expect(actions.showGlobalAlert).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error authenticating',
        detail: { message: 'Server error' },
        cancelCallback: {
          label: 'Cancel',
          event: expect.any(Function)
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: expect.any(Function)
        }
      });
      expect(actions.updateLocalStorage).not.toHaveBeenCalled();
    });

    it('should execute cancel callback function when called', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: 'Authentication failed' }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      await service.validateCognitoCode();

      const alertCall = actions.showGlobalAlert.mock.calls[0][0];
      const cancelCallback = alertCall.cancelCallback.event;

      cancelCallback();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should execute confirm callback function when called', async () => {
      const code = 'test-code';
      const loginResponse = {
        successfulRequest: false,
        errorDetail: { errors: 'Authentication failed' }
      };
      activatedRoute.snapshot.queryParams = { code };
      api.login.mockResolvedValue(loginResponse);

      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      await service.validateCognitoCode();

      const alertCall = actions.showGlobalAlert.mock.calls[0][0];
      const confirmCallback = alertCall.confirmCallback.event;

      confirmCallback();

      const expectedUrl =
        `${environment.cognitoDomain}oauth2/authorize` +
        `?response_type=code` +
        `&client_id=${environment.cognitoClientId}` +
        `&redirect_uri=${environment.cognitoRedirectUri}` +
        `&scope=openid+email+profile` +
        `&identity_provider=${environment.cognitoIdentityProvider}`;

      expect(window.location.href).toBe(expectedUrl);
    });
  });

  describe('updateCacheService', () => {
    it('should update cache with localStorage data when data exists', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify({ user: 'test', access_token: 'test-token' })
      );

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalled();
      expect(cache.dataCache.set.mock.calls[0][0].access_token).toBe('test-token');
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).toHaveBeenCalled();

      getItemSpy.mockRestore();
    });

    it('should update cache with empty object when no localStorage data', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue(null);

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should update cache with empty object when localStorage data is empty string', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue('');

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should update cache with empty object when localStorage data is invalid JSON', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue('invalid-json');

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should handle JSON.parse throwing an error', () => {
      const originalGetItem = localStorage.getItem;
      const originalParse = JSON.parse;

      localStorage.getItem = jest.fn().mockReturnValue('invalid-json');
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
      JSON.parse = originalParse;
    });

    it('should handle localStorage.getItem returning null for the second call', () => {
      const originalGetItem = localStorage.getItem;
      let callCount = 0;
      const mockGetItem = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? '{"test": "data"}' : null;
      });
      localStorage.getItem = mockGetItem;

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.getItem returning undefined', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue(undefined);

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.getItem returning a truthy value that is not valid JSON', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue('not-json');

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.getItem returning different values on multiple calls', () => {
      const originalGetItem = localStorage.getItem;
      let callCount = 0;
      const mockGetItem = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'some-value' : null;
      });
      localStorage.getItem = mockGetItem;

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.getItem returning undefined in second call to trigger nullish coalescing', () => {
      const originalGetItem = localStorage.getItem;
      const originalParse = JSON.parse;
      let callCount = 0;
      const mockGetItem = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'exists' : undefined;
      });
      localStorage.getItem = mockGetItem;
      JSON.parse = jest.fn().mockImplementation((value: string) => {
        expect(value).toBe('');
        return {} as any;
      });

      service.updateCacheService();

      expect(cache.dataCache.set).toHaveBeenCalledWith(expect.any(DataCache));
      expect(cache.isLoggedIn.set).toHaveBeenCalledWith(true);
      expect(cache.isValidatingToken.set).toHaveBeenCalledWith(false);
      expect(clarity.updateUserInfo).toHaveBeenCalled();
      expect(dateFormatConfigMock.loadConfig).not.toHaveBeenCalled();
      expect(validateCacheMock.validateVersions).not.toHaveBeenCalled();

      localStorage.getItem = originalGetItem;
      JSON.parse = originalParse;
    });
  });
});
