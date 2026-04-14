import { Logger } from '@nestjs/common';
import { LoggerUtil } from './logger.util';

describe('LoggerUtil', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should format with name config', () => {
    const logger = new LoggerUtil({ name: 'Svc' });
    logger._log('hello');
    expect(logSpy).toHaveBeenCalled();
    expect(String(logSpy.mock.calls[0][0])).toContain('Svc');
    expect(String(logSpy.mock.calls[0][0])).toContain('hello');
  });

  it('should use System when no config detail', () => {
    const logger = new LoggerUtil({} as any);
    logger._log('x');
    expect(String(logSpy.mock.calls[0][0])).toContain('[System]');
  });

  it('should append additional params', () => {
    const logger = new LoggerUtil({ name: 'Api' });
    logger._log('z', { method: 'GET', userId: 'u1', url: '/r' });
    const msg = String(logSpy.mock.calls[0][0]);
    expect(msg).toContain('GET');
    expect(msg).toContain('USER_ID:u1');
    expect(msg).toContain('/r');
  });
});
