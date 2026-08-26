// @akili-spec changes/profile-simulation
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ImpersonationErrorHeaderFilter } from './impersonation-error-header.filter';
import { ImpersonationErrorCodeEnum } from './enum/impersonation-error-code.enum';
import { ImpersonationServiceError } from './errors/impersonation-service.error';

// @akili-spec changes/profile-simulation — T-04
// D-imp-11: codes travel in the X-Impersonation-Error header; `errors`
// stays a string via the existing GlobalExceptions envelope (delegated to,
// not reimplemented, so the two can never drift).

describe('ImpersonationErrorHeaderFilter', () => {
  const buildHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const response = { setHeader, status };
    const request = { url: '/api/v1/impersonation/start' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    return { host, response, request, status, json, setHeader };
  };

  it('sets X-Impersonation-Error to the exception code before delegating to GlobalExceptions', () => {
    const filter = new ImpersonationErrorHeaderFilter();
    const { host, setHeader, status, json } = buildHost();
    const error = new ImpersonationServiceError(
      ImpersonationErrorCodeEnum.TARGET_IS_ADMIN,
      HttpStatus.CONFLICT,
      'Cannot simulate a System Admin account',
    );

    filter.catch(error, host);

    expect(setHeader).toHaveBeenCalledWith(
      'X-Impersonation-Error',
      ImpersonationErrorCodeEnum.TARGET_IS_ADMIN,
    );
    // GlobalExceptions delegate ran: status + envelope json were produced.
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.CONFLICT,
        errors: 'Cannot simulate a System Admin account',
      }),
    );
  });

  it('carries SESSION_HEADER_REQUIRED (400) end-to-end', () => {
    const filter = new ImpersonationErrorHeaderFilter();
    const { host, setHeader, status } = buildHost();
    const error = new ImpersonationServiceError(
      ImpersonationErrorCodeEnum.SESSION_HEADER_REQUIRED,
      HttpStatus.BAD_REQUEST,
      'X-Impersonation-Session header is required',
    );

    filter.catch(error, host);

    expect(setHeader).toHaveBeenCalledWith(
      'X-Impersonation-Error',
      ImpersonationErrorCodeEnum.SESSION_HEADER_REQUIRED,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });
});
