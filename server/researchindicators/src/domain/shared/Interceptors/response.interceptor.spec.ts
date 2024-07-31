import { CallHandler, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import 'dotenv/config';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
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
      handle: jest.fn().mockReturnValue(
        of({
          socket: { remoteAddress: '127.0.0.1' },
          method: 'GET',
          url: '/test',
          status: HttpStatus.OK,
          description: 'Ok request',
          data: {
            id: 1,
            name: 'test',
          },
        }),
      ),
    };

    interceptor
      .intercept(executionContextMock as any, callHandlerMock)
      .subscribe((res) => {
        expect(res).toBeDefined();
        expect(res.status).toBe(HttpStatus.OK);
      });
  });

  it('should log an error when the status is of error type', () => {
    const executionContextMock = {
      switchToHttp: () => ({
        getRequest: () => ({
          socket: { remoteAddress: '127.0.0.1' },
          method: 'GET',
          url: '/test',
          status: HttpStatus.BAD_REQUEST,
        }),
        getResponse: jest.fn().mockReturnValue({ status: jest.fn() }),
      }),
    };

    const callHandlerMock: CallHandler = {
      handle: jest.fn().mockReturnValue(
        of({
          socket: { remoteAddress: '127.0.0.1' },
          method: 'GET',
          url: '/test',
          status: HttpStatus.BAD_REQUEST,
          description: 'Bad request',
          data: {
            id: 1,
            name: 'test',
          },
        }),
      ),
    };

    interceptor
      .intercept(executionContextMock as any, callHandlerMock)
      .subscribe((res) => {
        expect(res).toBeDefined();
        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      });
  });

  it('should log an error when the status is of error type', () => {
    const executionContextMock = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        socket: { remoteAddress: '127.0.0.1' },
        method: 'GET',
        url: '/test',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
      getResponse: jest.fn().mockReturnValue({ status: jest.fn() }),
    };

    const callHandlerMock: CallHandler = {
      handle: jest.fn().mockReturnValue(
        of({
          socket: { remoteAddress: '127.0.0.1' },
          method: 'GET',
          url: '/test',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          description: 'Internal server error',
          data: {
            id: 1,
            name: 'test',
          },
        }),
      ),
    };

    interceptor
      .intercept(executionContextMock as any, callHandlerMock)
      .subscribe((res) => {
        expect(res).toBeDefined();
        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      });
  });

  it('should log an error when the status is of error type', () => {
    const executionContextMock = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        socket: { remoteAddress: '127.0.0.1' },
        method: 'GET',
        url: '/test',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
      getResponse: jest.fn().mockReturnValue({ status: jest.fn() }),
    };

    const callHandlerMock: CallHandler = {
      handle: jest.fn().mockReturnValue(
        of({
          socket: { remoteAddress: '127.0.0.1' },
          method: 'GET',
          url: '/test',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          description: 'Internal server error',
          name: 'Internal server error',
          stack: 'Internal server error',
        }),
      ),
    };

    interceptor
      .intercept(executionContextMock as any, callHandlerMock)
      .subscribe((res) => {
        expect(res).toBeDefined();
        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      });
  });
});
