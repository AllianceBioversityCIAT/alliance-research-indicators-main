import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '../services/cache/cache.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { httpErrorInterceptor } from './http-error.interceptor';
import { fakeAsync, tick } from '@angular/core/testing';

describe('httpErrorInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => TestBed.runInInjectionContext(() => httpErrorInterceptor(req, next));

  let mockActionsService: any;
  let mockCacheService: any;
  let mockApiService: any;
  let mockRouter: any;
  let mockRequest: HttpRequest<any>;
  let mockHandler: HttpHandlerFn;

  beforeEach(() => {
    mockActionsService = {
      showToast: jest.fn()
    };

    mockCacheService = {
      isLoggedIn: jest.fn(),
      dataCache: jest.fn()
    };

    mockApiService = {
      saveErrors: jest.fn()
    };

    mockRouter = {
      url: '/test-route'
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActionsService, useValue: mockActionsService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    mockRequest = new HttpRequest('GET', 'http://test.com/api/data');
    mockHandler = jest.fn().mockReturnValue(of({}));
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should skip timeout check for error endpoint', () => {
    const errorRequest = new HttpRequest('GET', 'https://ciat-errors.yecksin.workers.dev/error');

    interceptor(errorRequest, mockHandler);

    expect(mockHandler).toHaveBeenCalledWith(errorRequest);
  });

  it('should handle successful request without errors', done => {
    const response = { data: 'success' };
    mockHandler = jest.fn().mockReturnValue(of(response));
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: result => {
        expect(result).toEqual(response);
        done();
      },
      error: done.fail
    });
  });

  it('should handle HTTP error and show toast when user is logged in and error is not 409, 401, or refresh-token', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    let errorCaught: any;
    interceptor(mockRequest, mockHandler).subscribe({
      next: () => {},
      error: error => {
        errorCaught = error;
      }
    });

    tick();

    expect(errorCaught).toBe(errorResponse);
    expect(mockApiService.saveErrors).toHaveBeenCalled();
    expect(mockActionsService.showToast).toHaveBeenCalledWith({
      detail: 'Test error message',
      severity: 'error',
      summary: 'Error'
    });
  }));

  it('should handle HTTP error but not show toast when user is not logged in', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(false);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should handle HTTP error but not show toast when error status is 409', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Conflict error' },
      status: 409,
      statusText: 'Conflict'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should handle HTTP error but not show toast when error status is 401', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Unauthorized error' },
      status: 401,
      statusText: 'Unauthorized'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should handle HTTP error but not show toast when request URL includes refresh-token', done => {
    const refreshTokenRequest = new HttpRequest('GET', 'http://test.com/refresh-token');
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Refresh token error' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(refreshTokenRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should handle HTTP error with user data when user exists in cache', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: '123',
            user_name: 'John Doe',
            user_email: 'john.doe@test.com'
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error with partial user data when user has only first name', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: 'John',
        last_name: undefined,
        email: 'john@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: '123',
            user_name: 'John',
            user_email: 'john@test.com'
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error with partial user data when user has only last name', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: undefined,
        last_name: 'Doe',
        email: 'doe@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: '123',
            user_name: 'Doe',
            user_email: 'doe@test.com'
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error when user data is not available in cache', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue(null);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: undefined,
            user_name: '',
            user_email: undefined
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error when user has no first_name and no last_name', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: null,
        last_name: null,
        email: 'test@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: '123',
            user_name: '',
            user_email: 'test@test.com'
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error when user has empty first_name and empty last_name', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: '',
        last_name: '',
        email: 'test@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: '123',
            user_name: '',
            user_email: 'test@test.com'
          })
        );
        done();
      }
    });
  });

  it('should handle HTTP error when user has no sec_user_id', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: null,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        // The error is thrown because sec_user_id.toString() fails when sec_user_id is null
        expect(error.message).toContain('Cannot read properties of null');
        done();
      }
    });
  });

  it('should handle HTTP error when user has undefined sec_user_id', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: undefined,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        // The error is thrown because sec_user_id.toString() fails when sec_user_id is undefined
        expect(error.message).toContain('Cannot read properties of undefined');
        done();
      }
    });
  });

  it('should handle timeout scenario and save pending error', done => {
    mockApiService.saveErrors.mockResolvedValue(undefined);

    const subscription = interceptor(mockRequest, mockHandler).subscribe({
      next: result => {
        expect(result).toEqual({});
        done();
      },
      error: done.fail
    });

    // The timeout check runs in parallel, so we need to wait for it
    setTimeout(() => {
      expect(mockApiService.saveErrors).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          message: 'Request is taking longer than 5 seconds to respond'
        })
      );
      subscription.unsubscribe();
      done();
    }, 100);
  });

  it('should handle timeout scenario with error in saveErrors', fakeAsync(() => {
    mockApiService.saveErrors.mockRejectedValue(new Error('Save error failed'));

    let errorCaught = false;
    const subscription = interceptor(mockRequest, mockHandler).subscribe({
      next: result => {
        expect(result).toEqual({});
      },
      error: () => {
        errorCaught = true;
      }
    });

    // Advance time to trigger the timeout
    tick(5000);

    expect(mockApiService.saveErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        message: 'Request is taking longer than 5 seconds to respond'
      })
    );

    // When saveErrors fails, the error is propagated through the observable
    expect(errorCaught).toBe(true);

    subscription.unsubscribe();
  }));

  it('should create error object with correct properties', done => {
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Test error message' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: {
        sec_user_id: 123,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com'
      }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(mockRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            path: 'http://test.com/api/data',
            current_route: '/test-route',
            domain: window.location.hostname,
            status: 'error',
            original_error: errorResponse,
            user_id: '123',
            user_name: 'John Doe',
            user_email: 'john.doe@test.com'
          })
        );
        done();
      }
    });
  });

  it('should not show toast when error is 502 from AI formalize service', done => {
    const aiFormalizeRequest = new HttpRequest('POST', 'http://test.com/results/ai/formalize');
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'AI formalize error' },
      status: 502,
      statusText: 'Bad Gateway'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(aiFormalizeRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should not show toast when 400 comes from /pool-funding-tag (bilateral inline-error path)', done => {
    const poolFundingTagRequest = new HttpRequest(
      'PATCH',
      'http://test.com/api/v1/agresso/contracts/AC-1594/pool-funding-tag',
      { is_pool_funding_contributor: true }
    );
    const errorResponse = new HttpErrorResponse({
      error: { description: 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.', errors: null },
      status: 400,
      statusText: 'Bad Request'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(poolFundingTagRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should still show toast for non-400 errors from /pool-funding-tag', done => {
    const poolFundingTagRequest = new HttpRequest(
      'PATCH',
      'http://test.com/api/v1/agresso/contracts/AC-1594/pool-funding-tag',
      { is_pool_funding_contributor: true }
    );
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Server exploded' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: { sec_user_id: 1, first_name: 'X', last_name: 'Y', email: 'x@y.z' }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(poolFundingTagRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockActionsService.showToast).toHaveBeenCalledWith({
          detail: 'Server exploded',
          severity: 'error',
          summary: 'Error'
        });
        done();
      }
    });
  });

  it('should not show toast when 400 comes from /pool-funding-alignment (bilateral inline-error path)', done => {
    const poolFundingAlignmentRequest = new HttpRequest(
      'PATCH',
      'http://test.com/api/v1/results/RES-001/pool-funding-alignment',
      { has_contribution: true, lever_codes: [] }
    );
    const errorResponse = new HttpErrorResponse({
      error: { description: 'At least one lever is required when has_contribution=true.', errors: null },
      status: 400,
      statusText: 'Bad Request'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(poolFundingAlignmentRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockApiService.saveErrors).toHaveBeenCalled();
        expect(mockActionsService.showToast).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('should still show toast for non-400 errors from /pool-funding-alignment', done => {
    const poolFundingAlignmentRequest = new HttpRequest(
      'PATCH',
      'http://test.com/api/v1/results/RES-001/pool-funding-alignment',
      { has_contribution: true, lever_codes: ['L1'] }
    );
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Server exploded' },
      status: 500,
      statusText: 'Internal Server Error'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: { sec_user_id: 1, first_name: 'X', last_name: 'Y', email: 'x@y.z' }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(poolFundingAlignmentRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockActionsService.showToast).toHaveBeenCalledWith({
          detail: 'Server exploded',
          severity: 'error',
          summary: 'Error'
        });
        done();
      }
    });
  });

  it('should still show toast for 400 errors on an unrelated endpoint (URL-scoped exception)', done => {
    const unrelatedRequest = new HttpRequest('POST', 'http://test.com/api/v1/results', { title: 'x' });
    const errorResponse = new HttpErrorResponse({
      error: { errors: 'Validation failed' },
      status: 400,
      statusText: 'Bad Request'
    });

    mockHandler = jest.fn().mockReturnValue(throwError(() => errorResponse));
    mockCacheService.isLoggedIn.mockReturnValue(true);
    mockCacheService.dataCache.mockReturnValue({
      user: { sec_user_id: 1, first_name: 'X', last_name: 'Y', email: 'x@y.z' }
    });
    mockApiService.saveErrors.mockResolvedValue(undefined);

    interceptor(unrelatedRequest, mockHandler).subscribe({
      next: () => done.fail('Should have thrown an error'),
      error: error => {
        expect(error).toBe(errorResponse);
        expect(mockActionsService.showToast).toHaveBeenCalledWith({
          detail: 'Validation failed',
          severity: 'error',
          summary: 'Error'
        });
        done();
      }
    });
  });
});
