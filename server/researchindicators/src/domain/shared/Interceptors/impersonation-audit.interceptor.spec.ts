// @akili-spec changes/profile-simulation
import {
  ConflictException,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ImpersonationAuditInterceptor } from './impersonation-audit.interceptor';
import { ImpersonationService } from '../../entities/impersonation/impersonation.service';
import { LoggerUtil } from '../utils/logger.util';

describe('ImpersonationAuditInterceptor', () => {
  let logAction: jest.Mock;
  let impersonationService: Pick<ImpersonationService, 'logAction'>;
  let interceptor: ImpersonationAuditInterceptor;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logAction = jest.fn().mockResolvedValue(undefined);
    impersonationService = { logAction } as any;
    interceptor = new ImpersonationAuditInterceptor(
      impersonationService as ImpersonationService,
    );
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeContext(request: any): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: HttpStatus.OK }),
      }),
    } as unknown as ExecutionContext;
  }

  /** Waits one microtask turn so the fire-and-forget `.catch`/`.then` settles. */
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('GET under an active session -> no insert (failing input: method="GET")', async () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/results/123',
      impersonation: { session_id: 'sess-1' },
      route: { path: '/api/v1/results/:resultCode' },
      params: { resultCode: '123' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    const out = await lastValueFrom(
      interceptor.intercept(context, next as any),
    );

    expect(out).toEqual({ status: HttpStatus.OK });
    await flush();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('no req.impersonation -> no insert (failing input: impersonation undefined)', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/results',
      route: { path: '/api/v1/results' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.CREATED }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('req.impersonation.invalid="ended" -> no insert (failing input: invalid="ended")', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/impersonation/end',
      route: { path: '/api/v1/impersonation/end' },
      impersonation: { session_id: 'sess-1', invalid: 'ended' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('POST returning {status:201} under a session -> insert with the resolved fields (failing input: method="POST", status=201)', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/other-thing',
      route: { path: '/api/v1/other-thing' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.CREATED }) };

    const out = await lastValueFrom(
      interceptor.intercept(context, next as any),
    );

    expect(out).toEqual({ status: HttpStatus.CREATED });
    await flush();
    expect(logAction).toHaveBeenCalledWith({
      session_id: 'sess-1',
      method: 'POST',
      route_pattern: '/api/v1/other-thing',
      path: '/api/v1/other-thing',
      status_code: HttpStatus.CREATED,
      result_official_code: undefined,
    });
  });

  it('handler returning no explicit status -> insert defaults to 200 (failing input: dto.status undefined)', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/other-thing',
      route: { path: '/api/v1/other-thing' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({}) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: HttpStatus.OK }),
    );
  });

  it('PATCH on a results route with params[resultCode]="123" -> result_official_code=123 (failing input: route contains "results")', async () => {
    const request = {
      method: 'PATCH',
      originalUrl: '/api/v1/results/123/general-information',
      route: { path: '/api/v1/results/:resultCode/general-information' },
      params: { resultCode: '123' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        route_pattern: '/api/v1/results/:resultCode/general-information',
        result_official_code: 123,
      }),
    );
  });

  it('non-results route carrying a resultCode param -> result_official_code is still resolved from params (failing input: route without "results")', async () => {
    const request = {
      method: 'PATCH',
      originalUrl: '/api/v1/other/123',
      route: { path: '/api/v1/other/:resultCode' },
      params: { resultCode: '123' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ result_official_code: 123 }),
    );
  });

  it('mutating route mounted outside the results tree carrying :resultCode(\\d+) -> result_official_code is still resolved (failing input: green-checks new-reporting-cycle route, no "results" token)', async () => {
    const request = {
      method: 'PATCH',
      originalUrl: '/api/v1/green-checks/new-reporting-cycle/123/year/2027',
      route: {
        path: '/api/v1/green-checks/new-reporting-cycle/:resultCode(\\d+)/year/:newReportYear([0-9]{4})',
      },
      params: { resultCode: '123', newReportYear: '2027' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ result_official_code: 123 }),
    );
  });

  it('resultCode param present but non-numeric -> result_official_code stays undefined (failing input: params.resultCode="abc")', async () => {
    const request = {
      method: 'PATCH',
      originalUrl: '/api/v1/results/abc/general-information',
      route: { path: '/api/v1/results/:resultCode/general-information' },
      params: { resultCode: 'abc' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ result_official_code: undefined }),
    );
  });

  it('req.route undefined -> route_pattern falls back to originalUrl, never null (failing input: route=undefined)', async () => {
    const request = {
      method: 'DELETE',
      originalUrl: '/api/v1/results/123',
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => of({ status: HttpStatus.OK }) };

    await lastValueFrom(interceptor.intercept(context, next as any));

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ route_pattern: '/api/v1/results/123' }),
    );
  });

  it('handler throwing ConflictException -> insert with 409 AND the error still propagates (failing input: thrown ConflictException, status 409)', async () => {
    const request = {
      method: 'PATCH',
      originalUrl: '/api/v1/results/123/general-information',
      route: { path: '/api/v1/results/:resultCode/general-information' },
      params: { resultCode: '123' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = {
      handle: () => throwError(() => new ConflictException('conflict')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next as any)),
    ).rejects.toThrow(ConflictException);

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ status_code: HttpStatus.CONFLICT }),
    );
  });

  it('handler throwing a non-HttpException -> insert with 500 (failing input: thrown plain Error)', async () => {
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/other',
      route: { path: '/api/v1/other' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = { handle: () => throwError(() => new Error('boom')) };

    await expect(
      lastValueFrom(interceptor.intercept(context, next as any)),
    ).rejects.toThrow('boom');

    await flush();
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it('logAction rejecting -> response value unchanged + LoggerUtil.error called (failing input: logAction rejects)', async () => {
    logAction.mockRejectedValueOnce(new Error('insert failed'));
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/other',
      route: { path: '/api/v1/other' },
      impersonation: { session_id: 'sess-1' },
    };
    const context = makeContext(request);
    const next = {
      handle: () => of({ status: HttpStatus.OK, data: { ok: true } }),
    };

    const out = await lastValueFrom(
      interceptor.intercept(context, next as any),
    );

    expect(out).toEqual({ status: HttpStatus.OK, data: { ok: true } });
    await flush();
    expect(errorSpy).toHaveBeenCalled();
  });
});
