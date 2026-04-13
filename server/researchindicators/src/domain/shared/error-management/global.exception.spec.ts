import { HttpStatus } from '@nestjs/common';
import { GlobalExceptions } from './global.exception';
import { LoggerUtil } from '../utils/logger.util';

describe('GlobalExceptions', () => {
  beforeAll(() => {
    jest.spyOn(LoggerUtil.prototype, '_error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('sends json body with status and path', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      url: '/api/x',
      method: 'GET',
      user: { sec_user_id: 5 },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
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
});
