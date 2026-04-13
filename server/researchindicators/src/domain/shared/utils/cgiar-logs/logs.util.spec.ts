import { ExecutionContext, Logger } from '@nestjs/common';
import { env } from 'process';
import { CgiarLogger } from './logs.util';

describe('CgiarLogger', () => {
  const prevEnv = { ...env };

  afterEach(() => {
    Object.assign(env, prevEnv);
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    env.ARI_APP_NAME = 'TestApp';
  });

  it('formats string messages for all public log levels', () => {
    const logger = new CgiarLogger('Svc');
    const levels = [
      'debug',
      'error',
      'warn',
      'verbose',
      'log',
      'fatal',
    ] as const;

    for (const level of levels) {
      const spy = jest
        .spyOn(Logger.prototype, level)
        .mockImplementation(() => undefined as any);
      (logger as any)[level]('plain-text');
      expect(spy).toHaveBeenCalled();
    }
  });

  it('stringifies object messages and appends stack when provided', () => {
    const logger = new CgiarLogger('Svc');
    jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined as any);

    logger.debug({ a: 1 }, { stack: 'Error\n    at X.y (z)' });

    expect(Logger.prototype.debug).toHaveBeenCalled();
    const arg = (Logger.prototype.debug as jest.Mock).mock
      .calls[0][0] as string;
    expect(arg).toContain('{"a":1}');
    expect(arg).toContain('Stack:');
  });

  it('uses stringify fallback when JSON.stringify fails', () => {
    const logger = new CgiarLogger('Svc');
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined as any);

    logger.warn({ n: BigInt(1) } as any);

    const arg = (Logger.prototype.warn as jest.Mock).mock.calls[0][0] as string;
    expect(arg).toContain('Could not stringify message');
  });

  it('parses project stack lines for class and method', () => {
    const logger = new CgiarLogger('OrderService');
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined as any);

    const stack = `Error
    at OrderService.place (alliance-research-indicators-main/server/researchindicators/src/order/order.service.ts:10:1)`;

    logger.log('evt', { stack });

    const arg = (Logger.prototype.log as jest.Mock).mock.calls[0][0] as string;
    expect(arg).toContain('place');
  });

  it('falls back to generic class/method when stack has no project path', () => {
    const logger = new CgiarLogger('Other');
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined as any);

    const stack = `Error
    at Foo.bar (/tmp/file.js:1:1)`;

    logger.error('e', { stack });

    const arg = (Logger.prototype.error as jest.Mock).mock
      .calls[0][0] as string;
    expect(arg).toContain('Foo');
  });

  it('includes ExecutionContext, userId, method and url in header', () => {
    class DemoController {
      action() {}
    }
    const handler = DemoController.prototype.action;
    const context = {
      getHandler: () => handler,
      getClass: () => DemoController,
    } as unknown as ExecutionContext;

    const logger = new CgiarLogger('Svc');
    jest
      .spyOn(Logger.prototype, 'verbose')
      .mockImplementation(() => undefined as any);

    logger.verbose('v', {
      context,
      userId: '42',
      method: 'GET',
      url: '/x',
    });

    const arg = (Logger.prototype.verbose as jest.Mock).mock
      .calls[0][0] as string;
    expect(arg).toContain('USER_ID:42');
    expect(arg).toContain('GET');
    expect(arg).toContain('/x');
  });
});
