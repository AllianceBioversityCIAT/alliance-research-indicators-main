import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { jWtInterceptor } from './jwt.interceptor';
import { CacheService } from '@services/cache/cache.service';
import { ActionsService } from '@services/actions.service';
import { environment } from '@envs/environment';

jest.mock('@services/cache/cache.service');
jest.mock('@services/actions.service');

const mainApiUrl = 'https://main.api/';
const textMiningUrl = 'https://textmining.api/';
const documentOverviewUrl = 'https://document-overview.api/';
const fileManagerUrl = 'https://filemanager.api/';

describe('jWtInterceptor', () => {
  let mockCacheService: any;
  let mockActionsService: any;
  let mockHandler: jest.MockedFunction<HttpHandlerFn>;
  let envBackup: any;

  const interceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => TestBed.runInInjectionContext(() => jWtInterceptor(req, next));

  beforeAll(() => {
    envBackup = { ...environment };
    environment.mainApiUrl = mainApiUrl;
    environment.textMiningUrl = textMiningUrl;
    environment.documentOverviewUrl = documentOverviewUrl;
    environment.fileManagerUrl = fileManagerUrl;
  });

  afterAll(() => {
    Object.assign(environment, envBackup);
  });

  beforeEach(() => {
    mockCacheService = {
      dataCache: jest.fn().mockReturnValue({
        access_token: 'token123',
        refresh_token: 'refresh123'
      })
    };
    mockActionsService = {
      isTokenExpired: jest.fn().mockResolvedValue({ isTokenExpired: false, token_data: { access_token: 'token123' } }),
      api: {
        refreshToken: jest.fn().mockResolvedValue({ successfulRequest: true, data: { access_token: 'newtoken' } })
      },
      updateLocalStorage: jest.fn(),
      logOut: jest.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ActionsService, useValue: mockActionsService }
      ]
    });
    mockHandler = jest.fn().mockReturnValue(of({ ok: true }));
  });

  it('should be created', () => {
    expect(jWtInterceptor).toBeTruthy();
  });

  it('should pass through requests not matching protected domains', done => {
    const req = new HttpRequest('GET', 'https://otherdomain.com/data');
    interceptor(req, mockHandler).subscribe(() => {
      expect(mockHandler).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should skip auth for requests with no-auth-interceptor header', done => {
    const headers = new HttpHeaders().set('no-auth-interceptor', 'true');
    const req = new HttpRequest('GET', mainApiUrl + 'data', { headers });
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.has('no-auth-interceptor')).toBeFalsy();
      expect(calledReq.headers.has('Authorization')).toBeFalsy();
      done();
    });
  });

  it('should skip token refresh for refresh-token requests', done => {
    const req = new HttpRequest('GET', mainApiUrl + 'refresh-token');
    interceptor(req, mockHandler).subscribe(() => {
      expect(mockHandler).toHaveBeenCalledWith(req);
      done();
    });
  });

  it('should add Authorization header for mainApiUrl requests', done => {
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('Authorization')).toBe('Bearer token123');
      done();
    });
  });

  it('should use token_data.access_token if token is expired', done => {
    mockActionsService.isTokenExpired.mockResolvedValueOnce({ isTokenExpired: true, token_data: { access_token: 'expiredtoken' } });
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('Authorization')).toBe('Bearer expiredtoken');
      done();
    });
  });

  it('should add access-token header for fileManagerDomain requests', done => {
    const req = new HttpRequest('GET', fileManagerUrl + 'file');
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('access-token')).toBe('token123');
      done();
    });
  });

  it('should add access-token header for documentOverviewDomain GET requests', done => {
    const req = new HttpRequest('GET', documentOverviewUrl + 'api/document-overview', { bucket_name: 'ai-services-ibd' });
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('access-token')).toBe('token123');
      done();
    });
  });

  it('should add access-token header for documentOverviewDomain POST requests', done => {
    const req = new HttpRequest('POST', documentOverviewUrl + 'api/document-overview', { bucket_name: 'ai-services-ibd' });
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('access-token')).toBe('token123');
      done();
    });
  });

  it('should add access-token header and set token in FormData for textMiningDomain requests', done => {
    const formData = new FormData();
    const req = new HttpRequest('POST', textMiningUrl + 'analyze', formData);
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect((calledReq.body as FormData).get('token')).toBe('token123');
      done();
    });
  });

  it('should handle 401 error and refresh token successfully', done => {
    mockHandler.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })));
    mockActionsService.api.refreshToken.mockResolvedValueOnce({ successfulRequest: true, data: { access_token: 'newtoken' } });
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe(() => {
      // Should retry with new token
      const retryReq = mockHandler.mock.calls[1][0];
      expect(retryReq.headers.get('Authorization')).toBe('Bearer newtoken');
      expect(mockActionsService.updateLocalStorage).toHaveBeenCalled();
      done();
    });
  });

  it('should handle 401 error and refresh token failure (logout)', done => {
    mockHandler.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })));
    mockActionsService.api.refreshToken.mockResolvedValueOnce({ successfulRequest: false });
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe({
      next: () => fail('Should not succeed'),
      error: err => {
        expect(mockActionsService.logOut).toHaveBeenCalled();
        expect(err.status).toBe(401);
        done();
      }
    });
  }, 10000);

  it('should logout if refresh token throws error', done => {
    mockHandler.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })));
    mockActionsService.api.refreshToken.mockRejectedValueOnce(new Error('fail'));
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe({
      error: err => {
        expect(mockActionsService.logOut).toHaveBeenCalled();
        expect(err.status).toBe(401);
        done();
      }
    });
  });

  it('should propagate non-401 errors', done => {
    mockHandler.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const req = new HttpRequest('GET', mainApiUrl + 'data');
    interceptor(req, mockHandler).subscribe({
      error: err => {
        expect(err.status).toBe(500);
        done();
      }
    });
  });

  it('should handle null currentToken for fileManagerDomain requests', done => {
    mockActionsService.isTokenExpired.mockResolvedValueOnce({ isTokenExpired: true, token_data: { access_token: null } });
    const req = new HttpRequest('GET', fileManagerUrl + 'file');
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('access-token')).toBe('');
      done();
    });
  });

  it('should handle undefined currentToken for fileManagerDomain requests', done => {
    mockActionsService.isTokenExpired.mockResolvedValueOnce({ isTokenExpired: true, token_data: { access_token: undefined } });
    const req = new HttpRequest('GET', fileManagerUrl + 'file');
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect(calledReq.headers.get('access-token')).toBe('');
      done();
    });
  });

  it('should handle null currentToken for textMiningDomain requests', done => {
    mockActionsService.isTokenExpired.mockResolvedValueOnce({ isTokenExpired: true, token_data: { access_token: null } });
    const formData = new FormData();
    const req = new HttpRequest('POST', textMiningUrl + 'analyze', formData);
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect((calledReq.body as FormData).get('token')).toBe('');
      done();
    });
  });

  it('should handle undefined currentToken for textMiningDomain requests', done => {
    mockActionsService.isTokenExpired.mockResolvedValueOnce({ isTokenExpired: true, token_data: { access_token: undefined } });
    const formData = new FormData();
    const req = new HttpRequest('POST', textMiningUrl + 'analyze', formData);
    interceptor(req, mockHandler).subscribe(() => {
      const calledReq = mockHandler.mock.calls[0][0];
      expect((calledReq.body as FormData).get('token')).toBe('');
      done();
    });
  });
});
