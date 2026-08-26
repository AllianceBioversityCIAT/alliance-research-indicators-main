import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtMiddleware } from './jwr.middleware';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { ResultsUtil } from '../utils/results.util';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ImpersonationErrorCodeEnum } from '../../entities/impersonation/enum/impersonation-error-code.enum';
import { SecRolesEnum } from '../enum/sec_role.enum';

describe('JwtMiddleware', () => {
  const next = jest.fn();
  let middleware: JwtMiddleware;
  const alianceManagementApp = {} as AlianceManagementApp;
  const roarManagementService = {
    validateToken: jest.fn(),
  };
  const resultsUtil = {} as ResultsUtil;
  const appSecretsService = {
    validation: jest.fn(),
  };
  const impersonationService = {
    resolve: jest.fn(),
  };
  const originalEnv = { ...process.env };

  const makeRes = () => ({ setHeader: jest.fn() }) as any;
  const machineToken = () =>
    Buffer.from(
      JSON.stringify({ client_id: 'c', client_secret: 's' }),
    ).toString('base64');

  const adminUser = { sec_user_id: 900, roles: [SecRolesEnum.SYSTEM_ADMIN] };
  const contributorUser = {
    sec_user_id: 42,
    roles: [SecRolesEnum.CONTRIBUTOR],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    middleware = new JwtMiddleware(
      alianceManagementApp,
      roarManagementService as any,
      resultsUtil,
      appSecretsService as any,
      impersonationService as any,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects missing authorization header', async () => {
    const req = { headers: {} } as any;
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed bearer token', async () => {
    const req = { headers: { authorization: 'NotBearer x' } } as any;
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('accepts app-secret style base64 token when validation passes (no impersonation header)', async () => {
    const payload = Buffer.from(
      JSON.stringify({ client_id: 'c', client_secret: 's' }),
    ).toString('base64');
    const req = {
      headers: {
        authorization: `Bearer ${payload}`,
        origin: 'https://app.example',
      },
    } as any;
    appSecretsService.validation.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 1 },
    });
    await middleware.use(req, makeRes(), next);
    expect(appSecretsService.validation).toHaveBeenCalledWith(
      'c',
      's',
      'https://app.example',
    );
    expect(req.user).toEqual({ sec_user_id: 1 });
    expect(impersonationService.resolve).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('falls back to Roar when token is not client credentials (no impersonation header)', async () => {
    const req = {
      headers: { authorization: 'Bearer jwt-token' },
      socket: { remoteAddress: '10.0.0.1' },
    } as any;
    roarManagementService.validateToken.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 2 },
    });
    await middleware.use(req, makeRes(), next);
    expect(roarManagementService.validateToken).toHaveBeenCalledWith(
      'jwt-token',
    );
    expect(req.user).toEqual({ sec_user_id: 2 });
    expect(impersonationService.resolve).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('maps TokenExpiredError to Unauthorized', async () => {
    const req = { headers: { authorization: 'Bearer x' } } as any;
    roarManagementService.validateToken.mockRejectedValue(
      new TokenExpiredError('expired', new Date()),
    );
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('maps JsonWebTokenError to Unauthorized', async () => {
    const req = { headers: { authorization: 'Bearer x' } } as any;
    roarManagementService.validateToken.mockRejectedValue(
      new JsonWebTokenError('bad'),
    );
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  /**
   * @akili-spec changes/profile-simulation
   * T-03 matrix — design §5 "Resolve on every request" steps 1-8.
   * Disqualifier: a shared always-`valid` `resolve` stub cannot discriminate
   * these cases, so every case stubs its OWN `resolve` result.
   * KZ-017: this suite mocks `ImpersonationService.resolve` — it proves the
   * middleware's branching, not that `resolve` itself enforces ownership
   * against real rows. That truth belongs to T-06 (e2e/integration).
   */
  describe('applyImpersonation', () => {
    it('no session header -> unchanged behaviour, resolve never called (failing input: header absent)', async () => {
      const req: any = {
        headers: { authorization: 'Bearer jwt-token' },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(adminUser);
      expect(req.actor).toBeUndefined();
      expect(impersonationService.resolve).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('machine credential + session header -> 403 NOT_ALLOWED (failing input: credential="machine")', async () => {
      const req: any = {
        headers: {
          authorization: `Bearer ${machineToken()}`,
          'x-impersonation-session': 'sess-1',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      appSecretsService.validation.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.NOT_ALLOWED,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'NOT_ALLOWED',
      );
      expect(impersonationService.resolve).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('non-admin JWT + session header -> 403 NOT_ALLOWED (failing input: user.roles=[CONTRIBUTOR])', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'sess-1',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: contributorUser,
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.NOT_ALLOWED,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'NOT_ALLOWED',
      );
      expect(impersonationService.resolve).not.toHaveBeenCalled();
    });

    it('nested /impersonation/start with a session header -> 409 NESTED (failing input: route=start)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'sess-1',
        },
        originalUrl: '/api/v1/impersonation/start',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.NESTED,
        status: HttpStatus.CONFLICT,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'NESTED',
      );
      expect(impersonationService.resolve).not.toHaveBeenCalled();
    });

    it('nested /impersonation/users with a session header -> 403 NESTED (failing input: route=users)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'sess-1',
        },
        originalUrl: '/api/v1/impersonation/users?search=abc',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.NESTED,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'NESTED',
      );
      expect(impersonationService.resolve).not.toHaveBeenCalled();
    });

    it('unknown session -> 403 SESSION_INVALID (failing input: resolve state="invalid")', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'unknown-sess',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({ state: 'invalid' });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
      expect(impersonationService.resolve).toHaveBeenCalledWith(
        'unknown-sess',
        adminUser.sec_user_id,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'SESSION_INVALID',
      );
    });

    it('foreign session on /impersonation/end -> 403 SESSION_INVALID, never tolerated (failing input: actor_user_id=admin+1 on /end)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'foreign-sess',
        },
        originalUrl: '/api/v1/impersonation/end',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      // ImpersonationService.resolve scopes its lookup by actor_user_id, so
      // a session owned by a different admin resolves as "invalid" here —
      // never "ended"/"expired" — and /end must NOT tolerate "invalid".
      impersonationService.resolve.mockResolvedValueOnce({ state: 'invalid' });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'SESSION_INVALID',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('owned ended session on /impersonation/end -> tolerated, req.actor set (failing input: resolve state="ended", route=end)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'ended-sess',
        },
        originalUrl: '/api/v1/impersonation/end',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'ended',
        session: { session_id: 'ended-sess' },
      });
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.actor).toEqual(adminUser);
      expect(req.user).toEqual(adminUser);
      expect(req.impersonation).toEqual({
        session_id: 'ended-sess',
        invalid: 'ended',
      });
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('owned ended session on /impersonation/current -> tolerated (failing input: resolve state="ended", route=current)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'ended-sess',
        },
        originalUrl: '/api/v1/impersonation/current',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'ended',
        session: { session_id: 'ended-sess' },
      });
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.impersonation).toEqual({
        session_id: 'ended-sess',
        invalid: 'ended',
      });
    });

    it('owned ended session on /api/v1/results -> 403 SESSION_INVALID (failing input: resolve state="ended", route=results)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'ended-sess',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'ended',
        session: { session_id: 'ended-sess' },
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'SESSION_INVALID',
      );
    });

    it('expired session on a non-tolerated route -> 403 SESSION_INVALID (failing input: resolve state="expired", route=results)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'expired-sess',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'expired',
        session: { session_id: 'expired-sess' },
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'SESSION_INVALID',
      );
    });

    it('valid session -> swaps req.user to the target (active roles only) and keeps req.actor as the admin (failing input: resolve state="valid")', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'valid-sess',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      const target = {
        sec_user_id: 55,
        first_name: 'Target',
        last_name: 'User',
        email: 't@example.com',
        is_active: true,
        status_id: 1,
        user_role_list: [
          {
            is_active: true,
            user_id: 55,
            role_id: SecRolesEnum.CONTRIBUTOR,
            role: { role_id: SecRolesEnum.CONTRIBUTOR, name: 'Contributor' },
          },
          {
            is_active: false,
            user_id: 55,
            role_id: SecRolesEnum.CENTER_ADMIN,
            role: { role_id: SecRolesEnum.CENTER_ADMIN, name: 'Center Admin' },
          },
        ],
      };
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'valid',
        target,
        session: { session_id: 'valid-sess' },
      });
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.sec_user_id).toBe(55);
      expect(req.user.roles).toEqual([SecRolesEnum.CONTRIBUTOR]);
      expect(req.actor.sec_user_id).toBe(adminUser.sec_user_id);
      expect(req.impersonation).toEqual({ session_id: 'valid-sess' });
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('valid session whose target vanished (null) -> 403 SESSION_INVALID (failing input: resolve state="valid", target=null)', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'valid-sess',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockResolvedValueOnce({
        state: 'valid',
        target: null,
        session: { session_id: 'valid-sess' },
      });
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_INVALID,
        status: HttpStatus.FORBIDDEN,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'SESSION_INVALID',
      );
    });

    it('LOCAL_AUTH_BYPASS branch honours the session header (failing input: nested /start under bypass)', async () => {
      process.env.ARI_LOCAL_AUTH_BYPASS = 'true';
      process.env.ARI_IS_PRODUCTION = 'false';
      const req: any = {
        headers: { 'x-impersonation-session': 'sess-1' },
        originalUrl: '/api/v1/impersonation/start',
      };
      const res = makeRes();
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.NESTED,
        status: HttpStatus.CONFLICT,
      });
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Impersonation-Error',
        'NESTED',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('resolve() rejects -> 503 Impersonation service unavailable, no X-Impersonation-Error header, next not called (T-03 rework: fail closed, not "Unknown token error")', async () => {
      const req: any = {
        headers: {
          authorization: 'Bearer jwt-token',
          'x-impersonation-session': 'sess-1',
        },
        originalUrl: '/api/v1/results',
      };
      const res = makeRes();
      roarManagementService.validateToken.mockResolvedValue({
        isValid: true,
        user: adminUser,
      });
      impersonationService.resolve.mockRejectedValueOnce(
        new Error('connection lost'),
      );
      await expect(middleware.use(req, res, next)).rejects.toMatchObject({
        message: 'Impersonation service unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'X-Impersonation-Error',
        expect.anything(),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('LOCAL_AUTH_BYPASS branch without a session header -> unchanged, hardcoded admin user', async () => {
      process.env.ARI_LOCAL_AUTH_BYPASS = 'true';
      process.env.ARI_IS_PRODUCTION = 'false';
      const req: any = { headers: {}, url: '/api/v1/results' };
      const res = makeRes();
      await middleware.use(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.sec_user_id).toBe(1);
      expect(req.actor).toBeUndefined();
      expect(impersonationService.resolve).not.toHaveBeenCalled();
    });
  });
});
