import { CallHandler } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { of } from 'rxjs';
import 'dotenv/config';

describe('ResponseInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should intercept the request and response', () => {
    const executionContextMock = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        socket: { remoteAddress: '127.0.0.1' },
        method: 'GET',
        url: '/test',
        status: 200,
      }),
      getResponse: jest.fn().mockReturnValue({ status: jest.fn() }),
    };

    const callHandlerMock: CallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };

    interceptor
      .intercept(executionContextMock as any, callHandlerMock)
      .subscribe((res) => {
        expect(res).toBeDefined();
      });
  });
});
