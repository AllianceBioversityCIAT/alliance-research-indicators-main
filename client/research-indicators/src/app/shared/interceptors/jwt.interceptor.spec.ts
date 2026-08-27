import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { jWtInterceptor } from './jwt.interceptor';
import { CacheService } from '@services/cache/cache.service';
import { ActionsService } from '@services/actions.service';
import { ImpersonationService } from '@services/impersonation.service';
import { environment } from '@envs/environment';

jest.mock('@services/cache/cache.service');
jest.mock('@services/actions.service');
jest.mock('@services/impersonation.service');

const mainApiUrl = 'https://main.api/';
const textMiningUrl = 'https://textmining.api/';
const documentOverviewUrl = 'https://document-overview.api/';
const fileManagerUrl = 'https://filemanager.api/';

describe('jWtInterceptor', () => {
  let mockCacheService: any;
  let mockActionsService: any;
  let mockImpersonationService: any;
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
    mockImpersonationService = {
      active: jest.fn().mockReturnValue(false),
      sessionId: jest.fn().mockReturnValue(null)
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: ImpersonationService, useValue: mockImpersonationService }
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

  // R-IMP-009/D-imp-12 — marker-gated impersonation header (T-08).
  describe('impersonation header (R-IMP-009, D-imp-12)', () => {
    it('should add X-Impersonation-Session on a plain main-API request while a simulation is active', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-123');
      const req = new HttpRequest('GET', mainApiUrl + 'data');
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.get('X-Impersonation-Session')).toBe('sess-123');
        expect(calledReq.headers.get('Authorization')).toBe('Bearer token123');
        done();
      });
    });

    it('should NOT add the header when no simulation is active', done => {
      mockImpersonationService.active.mockReturnValue(false);
      const req = new HttpRequest('GET', mainApiUrl + 'data');
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        done();
      });
    });

    it('should keep the header on the request retried after a mocked 401 + refresh (J-10)', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-retry');
      mockHandler.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })));
      mockActionsService.api.refreshToken.mockResolvedValueOnce({ successfulRequest: true, data: { access_token: 'newtoken' } });
      const req = new HttpRequest('GET', mainApiUrl + 'data');
      interceptor(req, mockHandler).subscribe(() => {
        // Second `next(...)` call is the retry — assert the header survived it.
        const retryReq = mockHandler.mock.calls[1][0];
        expect(retryReq.headers.get('X-Impersonation-Session')).toBe('sess-retry');
        expect(retryReq.headers.get('Authorization')).toBe('Bearer newtoken');
        done();
      });
    });

    it('should strip the X-Ari-Auth-Call marker and add NO impersonation header on a marked request, even when the target host is the ARI main API (mainApiUrl === managementApiUrl locally — disqualifies a host-based implementation)', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-should-not-leak');
      const headers = new HttpHeaders().set('X-Ari-Auth-Call', '1');
      const req = new HttpRequest('GET', mainApiUrl + 'current-user', { headers });
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Ari-Auth-Call')).toBe(false);
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        // Authorization flow stays unchanged for the marked call.
        expect(calledReq.headers.get('Authorization')).toBe('Bearer token123');
        done();
      });
    });

    it('should strip the marker on a refresh-token request without attaching any impersonation header', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-refresh');
      const headers = new HttpHeaders().set('X-Ari-Auth-Call', '1');
      const req = new HttpRequest('GET', mainApiUrl + 'refresh-token', { headers });
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Ari-Auth-Call')).toBe(false);
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        done();
      });
    });

    it('should NOT add the impersonation header on fileManagerDomain requests even while active', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-fm');
      const req = new HttpRequest('GET', fileManagerUrl + 'file');
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        done();
      });
    });

    it('should NOT add the impersonation header on textMiningDomain requests even while active', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-tm');
      const formData = new FormData();
      const req = new HttpRequest('POST', textMiningUrl + 'analyze', formData);
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        done();
      });
    });

    it('should NOT add the impersonation header on documentOverviewDomain requests even while active', done => {
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-do');
      const req = new HttpRequest('GET', documentOverviewUrl + 'api/document-overview', { bucket_name: 'ai-services-ibd' });
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        done();
      });
    });

    // Reviewer FAIL (attempt 1): the marker was only stripped inside the four-host `if`
    // branch, so a marked call resolving to `managementApiUrl` when it differs from
    // `mainApiUrl` (login / current-user in any deployed environment) matched none of
    // the four hosts, fell through to `return next(req)`, and leaked the marker
    // cross-origin to ROAR. This test is the one attempt 1 could not express: it needs
    // `managementApiUrl !== mainApiUrl`, which every other test in this file runs at
    // `mainApiUrl` (the equal-hosts case) and therefore cannot expose.
    it('should strip the marker and add NO impersonation header on a marked request to managementApiUrl when managementApiUrl !== mainApiUrl (deployed-environment leak)', done => {
      const managementApiUrl = 'https://roar.example/management-api/';
      environment.managementApiUrl = managementApiUrl;
      mockImpersonationService.active.mockReturnValue(true);
      mockImpersonationService.sessionId.mockReturnValue('sess-should-not-leak-mgmt');
      const headers = new HttpHeaders().set('X-Ari-Auth-Call', '1');
      const req = new HttpRequest('GET', managementApiUrl + 'authorization/users/current', { headers });
      interceptor(req, mockHandler).subscribe(() => {
        const calledReq = mockHandler.mock.calls[0][0];
        expect(calledReq.headers.has('X-Ari-Auth-Call')).toBe(false);
        expect(calledReq.headers.has('X-Impersonation-Session')).toBe(false);
        environment.managementApiUrl = mainApiUrl;
        done();
      });
    });
  });
});
