import { HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptions } from './global.exception';
import { LoggerUtil } from '../utils/logger.util';

describe('GlobalExceptions', () => {
  beforeAll(() => {
    jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
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

  describe('DC-11 path redaction', () => {
    const prefix = '/api/prms-callback';
    const segment = 'segment-k7';
    let errorLog: jest.SpyInstance;

    beforeEach(() => {
      errorLog = jest.spyOn(LoggerUtil.prototype, '_error');
      errorLog.mockClear();
    });

    function capture(url: string, status = HttpStatus.NOT_FOUND) {
      const json = jest.fn();
      const statusFn = jest.fn().mockReturnValue({ json });
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({
            url,
            method: 'POST',
          }),
        }),
      };
      new GlobalExceptions().catch(
        {
          status,
          name: 'NotFoundException',
          message: 'Not Found',
          stack: 'stack-trace',
        },
        host as any,
      );
      return { json, statusFn };
    }

    it('DC-11 404 envelope and logger arguments stop at the route prefix', () => {
      const { json, statusFn } = capture(`${prefix}/${segment}?q=1`);

      expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.NOT_FOUND,
          description: 'NotFoundException',
          errors: 'Not Found',
          path: prefix,
          timestamp: expect.any(String),
        }),
      );
      expect(errorLog).toHaveBeenCalledWith(
        'stack-trace',
        expect.objectContaining({ method: 'POST', url: prefix }),
      );
      expect(JSON.stringify(json.mock.calls)).not.toContain(segment);
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(segment);
    });

    it('DC-11 a non-callback 404 keeps its real path and logger url', () => {
      const url = '/api/results/99?q=1';
      const { json } = capture(url, HttpStatus.NOT_FOUND);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: url,
        }),
      );
      expect(errorLog).toHaveBeenCalledWith(
        'stack-trace',
        expect.objectContaining({ url }),
      );
    });

    it('DC-11 (c) mixed-case callback path is redacted in the 404 envelope and logger url', () => {
      const mixed = `/API/PRMS-CALLBACK/${segment}`;
      const { json } = capture(mixed);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: prefix,
        }),
      );
      expect(JSON.stringify(json.mock.calls)).not.toContain(segment);
      expect(errorLog).toHaveBeenCalledWith(
        'stack-trace',
        expect.objectContaining({ method: 'POST', url: prefix }),
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(segment);
    });

    function captureException(exception: NotFoundException, url: string) {
      const json = jest.fn();
      const statusFn = jest.fn().mockReturnValue({ json });
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({ status: statusFn }),
          getRequest: () => ({
            url,
            method: 'POST',
          }),
        }),
      };
      new GlobalExceptions().catch(exception, host as any);
      return { json, statusFn };
    }

    it('DC-11 (d) a real NotFoundException leaks no callback segment in errors', () => {
      const leaked = '/api/prms-callback/guess/extra';
      const exception = new NotFoundException(`Cannot POST ${leaked}`);

      expect(exception.message).toBe(`Cannot POST ${leaked}`);
      expect((exception.getResponse() as { message: string }).message).toBe(
        `Cannot POST ${leaked}`,
      );

      const { json } = captureException(exception, leaked);
      const body = json.mock.calls[0][0];

      expect(body.errors).toBe('Cannot POST /api/prms-callback');
      expect(body.path).toBe(prefix);
      expect(JSON.stringify(body)).not.toContain(leaked);
    });

    it('DC-11 (d) a real NotFoundException leaks no callback segment in the logged stack', () => {
      const leaked = '/api/prms-callback/guess/extra';
      const exception = new NotFoundException(`Cannot POST ${leaked}`);

      expect(exception.stack).toContain(leaked);

      captureException(exception, leaked);
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(loggedStack).toBe(exception.stack.replaceAll(leaked, prefix));
      expect(loggedStack).not.toContain(leaked);
      expect(errorLog).toHaveBeenCalledWith(
        loggedStack,
        expect.objectContaining({ method: 'POST', url: prefix }),
      );
    });

    it('a real non-callback NotFoundException keeps its message and stack', () => {
      const url = '/api/results/99';
      const exception = new NotFoundException(`Cannot GET ${url}`);
      const { json } = captureException(exception, url);
      const body = json.mock.calls[0][0];

      expect(body.errors).toBe(exception.message);
      expect(body.path).toBe(url);
      expect(errorLog.mock.calls[0][0]).toBe(exception.stack);
      expect(errorLog.mock.calls[0][1]).toEqual(
        expect.objectContaining({ url }),
      );
    });

    it('a real NotFoundException whose path only embeds the callback prefix is unchanged', () => {
      const url = '/api/results/compare/api/prms-callback/segment-k7';
      const exception = new NotFoundException(`Cannot GET ${url}`);
      const { json } = captureException(exception, url);
      const body = json.mock.calls[0][0];

      expect(body.errors).toBe(exception.message);
      expect(body.path).toBe(url);
      expect(body.errors).toContain(segment);
      expect(errorLog.mock.calls[0][0]).toBe(exception.stack);
    });

    it('DC-11 (e) a JSON-quoted callback path is truncated without losing the rest of the diagnostic', () => {
      const leaked = `${prefix}/example`;
      const diagnostic = `{"path":"${leaked}","reason":"invalid"}`;
      const exception = new NotFoundException(diagnostic);

      expect(exception.message).toBe(diagnostic);
      expect(exception.stack).toContain(leaked);

      const { json } = captureException(exception, leaked);
      const body = json.mock.calls[0][0];
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(body.errors).toBe(`{"path":"${prefix}","reason":"invalid"}`);
      expect(loggedStack).toBe(exception.stack.replaceAll(leaked, prefix));
      expect(loggedStack).toContain(`{"path":"${prefix}","reason":"invalid"}`);
      expect(JSON.stringify(body)).not.toContain('example');
      expect(loggedStack).not.toContain('example');
    });

    it('DC-11 (e) a comma, parentheses and a non-callback frame survive the redaction', () => {
      const leaked = `${prefix}/${segment}`;
      const diagnostic = [
        `Cannot POST ${leaked}, retrying`,
        `    at dispatch (/Users/pelitos/app/global.exception.ts:31:5)`,
        `    at callback (${leaked}:11:7)`,
      ].join('\n');
      const exception = new NotFoundException(diagnostic);

      const { json } = captureException(exception, leaked);
      const body = json.mock.calls[0][0];
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(body.errors).toBe(
        [
          `Cannot POST ${prefix}, retrying`,
          `    at dispatch (/Users/pelitos/app/global.exception.ts:31:5)`,
          `    at callback (${prefix}:11:7)`,
        ].join('\n'),
      );
      expect(loggedStack).toContain(`Cannot POST ${prefix}, retrying`);
      expect(loggedStack).toContain(
        `    at dispatch (/Users/pelitos/app/global.exception.ts:31:5)`,
      );
      expect(loggedStack).toContain(`    at callback (${prefix}:11:7)`);
      expect(JSON.stringify(body)).not.toContain(segment);
      expect(loggedStack).not.toContain(segment);
    });

    it('DC-11 (f) an absolute callback URL in a real NotFoundException is redacted', () => {
      const leaked = `https://star.ciat.cgiar.org${prefix}/${segment}`;
      const exception = new NotFoundException(`Cannot POST ${leaked}?x=1`);

      expect(exception.message).toContain(segment);
      expect(exception.stack).toContain(segment);

      const { json } = captureException(exception, `${prefix}/${segment}`);
      const body = json.mock.calls[0][0];
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(body.errors).toBe(
        `Cannot POST https://star.ciat.cgiar.org${prefix}?x=1`,
      );
      expect(JSON.stringify(body)).not.toContain(segment);
      expect(loggedStack).not.toContain(segment);
    });

    it('DC-11 (f) a protocol-relative callback URL is redacted in the emitted errors', () => {
      const exception = new NotFoundException(
        `Cannot POST //host${prefix}/${segment}?x=1`,
      );

      const { json } = captureException(exception, `${prefix}/${segment}`);
      const body = json.mock.calls[0][0];

      expect(body.errors).toBe(`Cannot POST //host${prefix}?x=1`);
      expect(JSON.stringify(body)).not.toContain(segment);
    });

    it('DC-11 (g) a percent-encoded guess leaves no tail in the emitted errors or logged stack', () => {
      const leaked = `${prefix}/abc%2Fdef%2Fghi`;
      const exception = new NotFoundException(`Cannot POST ${leaked}`);

      expect(exception.message).toBe(`Cannot POST ${leaked}`);
      expect(exception.stack).toContain(leaked);

      const { json } = captureException(exception, leaked);
      const body = json.mock.calls[0][0];
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(body.errors).toBe(`Cannot POST ${prefix}`);
      expect(body.path).toBe(prefix);
      expect(loggedStack).toBe(exception.stack.replaceAll(leaked, prefix));
      expect(JSON.stringify(body)).not.toContain('abc%2Fdef');
      expect(JSON.stringify(body)).not.toContain('%2F');
      expect(loggedStack).not.toContain('abc%2Fdef');
      expect(loggedStack).not.toContain('%2F');
    });

    it('DC-11 (g) a non-callback diagnostic survives byte for byte', () => {
      const cases = [
        '{"path":"/api/results/910150901/prms-sync","reason":"x"}',
        'GET /api/prms-callbacks/list failed',
        '/api/results/compare/api/prms-callback/x',
      ];

      for (const diagnostic of cases) {
        errorLog.mockClear();
        const exception = new NotFoundException(diagnostic);
        const { json } = captureException(exception, diagnostic);

        expect(json.mock.calls[0][0].errors).toBe(diagnostic);
        expect(errorLog.mock.calls[0][0]).toBe(exception.stack);
      }
    });

    it('DC-11 (c) a mixed-case callback URL inside a real NotFoundException is redacted', () => {
      const mixed = `/API/PRMS-CALLBACK/${segment}`;
      const exception = new NotFoundException(`Cannot POST ${mixed}`);

      expect(exception.message).toContain(segment);
      expect(exception.stack).toContain(segment);

      const { json } = captureException(exception, mixed);
      const body = json.mock.calls[0][0];
      const loggedStack = errorLog.mock.calls[0][0] as string;

      expect(body.path).toBe(prefix);
      expect(body.errors).toBe(`Cannot POST ${prefix}`);
      expect(JSON.stringify(body)).not.toContain(segment);
      expect(loggedStack).toBe(exception.stack.replaceAll(mixed, prefix));
      expect(loggedStack).not.toContain(segment);
      expect(errorLog.mock.calls[0][1]).toEqual(
        expect.objectContaining({ url: prefix }),
      );
    });
  });
});
