import { HttpStatus } from '@nestjs/common';
import { GlobalExceptions } from './global.exception';
import { LoggerUtil } from '../utils/logger.util';

describe('GlobalExceptions', () => {
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockClear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  function makeHost(request: any) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    return { host, status, json };
  }

  it('sends json body with status and path', () => {
    const request = {
      url: '/api/x',
      method: 'GET',
      user: { sec_user_id: 5 },
    };
    const { host, status, json } = makeHost(request);
    const filter = new GlobalExceptions();
    filter.catch(
      {
        status: HttpStatus.BAD_REQUEST,
        name: 'BadRequestException',
        message: 'invalid',
        stack: 'stack',
        response: { message: 'invalid' },
      },
      host as any,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        path: '/api/x',
      }),
    );
  });

  // @akili-spec changes/profile-simulation — R-IMP-005/NFR-IMP-004 log
  // attribution.
  it('logs actorId + impersonationSessionId when req.actor is present (failing input: req.actor set)', () => {
    const request = {
      url: '/api/results/123',
      method: 'PATCH',
      user: { sec_user_id: 5 },
      actor: { sec_user_id: 900 },
      impersonation: { session_id: 'sess-1' },
    };
    const { host } = makeHost(request);
    const filter = new GlobalExceptions();
    filter.catch(
      {
        status: HttpStatus.CONFLICT,
        name: 'ConflictException',
        message: 'conflict',
        stack: 'stack',
      },
      host as any,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'stack',
      expect.objectContaining({
        actorId: 900,
        impersonationSessionId: 'sess-1',
      }),
    );
  });

  it('logs undefined actorId/impersonationSessionId when req.actor is absent (failing input: no req.actor)', () => {
    const request = {
      url: '/api/results/123',
      method: 'PATCH',
      user: { sec_user_id: 5 },
    };
    const { host } = makeHost(request);
    const filter = new GlobalExceptions();
    filter.catch(
      {
        status: HttpStatus.BAD_REQUEST,
        name: 'BadRequestException',
        message: 'invalid',
        stack: 'stack',
      },
      host as any,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'stack',
      expect.objectContaining({
        actorId: undefined,
        impersonationSessionId: undefined,
      }),
    );
  });
});
