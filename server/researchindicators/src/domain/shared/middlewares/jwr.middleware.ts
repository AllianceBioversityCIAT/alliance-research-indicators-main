import { Request, Response, NextFunction } from 'express';
import {
  HttpStatus,
  Injectable,
  Logger,
  NestMiddleware,
  Next,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { RoarManagementService } from '../../tools/roar-management/roar-management.service';
import { ResultsUtil } from '../utils/results.util';
import { AppSecretsService } from '../../entities/app-secrets/app-secrets.service';
import { ENV } from '../utils/env.utils';
import { SecRolesEnum } from '../enum/sec_role.enum';
import { ImpersonationService } from '../../entities/impersonation/impersonation.service';
import { ImpersonationErrorCodeEnum } from '../../entities/impersonation/enum/impersonation-error-code.enum';
import { ImpersonationException } from '../errors/impersonation.exception';
import {
  ImpersonationCredential,
  RequestUser,
  RequestWithUser,
} from '../global-dto/request-with-user.dto';

/** `X-Impersonation-Session` request header — case-insensitive per Express. */
const IMPERSONATION_SESSION_HEADER = 'x-impersonation-session';
/** Response header the client reads the machine-readable code from. */
const IMPERSONATION_ERROR_HEADER = 'X-Impersonation-Error';

/**
 * Matches `/impersonation/(start|users|end|current)` regardless of the API
 * version prefix, a trailing slash, or a query string — applied to
 * `req.originalUrl` (falls back to `req.url`/`req.path`).
 */
const IMPERSONATION_ROUTE_PATTERN =
  /\/impersonation\/(start|users|end|current)(?:\/)?(?:$|[?#])/i;

type ImpersonationRouteAction = 'start' | 'users' | 'end' | 'current';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  constructor(
    private readonly alianceManagementApp: AlianceManagementApp,
    private readonly roarManagementService: RoarManagementService,
    private readonly resultsUtil: ResultsUtil,
    private readonly appSecretsService: AppSecretsService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  async use(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    // LOCAL DEVELOPMENT ONLY — see ENV.LOCAL_AUTH_BYPASS for full safety contract.
    // Active when ARI_LOCAL_AUTH_BYPASS=true AND IS_PRODUCTION=false.
    // MUST NOT be enabled in any deployed environment.
    if (ENV.LOCAL_AUTH_BYPASS) {
      this.logger.warn(
        `[LOCAL_AUTH_BYPASS] Skipping JWT validation for ${req.method} ${req.url} — DEV ONLY`,
      );
      req.user = {
        sec_user_id: 1,
        email: 'local-dev@example.com',
        first_name: 'Local',
        last_name: 'Dev',
        roles: [SecRolesEnum.SYSTEM_ADMIN],
      };
      await this.applyImpersonation(req, res, 'bypass');
      return next();
    }

    const { authorization } = req.headers;
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Token not found');
    }

    const parts = authorization.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid format token');
    }

    const token = parts[1];
    const tokenData = this.validateTokenType(token);

    if (tokenData) {
      const origin = req.headers['origin'];
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip;

      const isValid = await this.appSecretsService.validation(
        tokenData.client_id,
        tokenData.client_secret,
        origin ?? ip,
      );

      if (!isValid.isValid) throw new UnauthorizedException('Invalid token');

      req.user = isValid.user as RequestUser;
      await this.applyImpersonation(req, res, 'machine');
      return next();
    } else {
      try {
        const responseService =
          await this.roarManagementService.validateToken(token);

        if (responseService.isValid === false)
          throw new UnauthorizedException('Invalid token');
        req.user = responseService.user as RequestUser;
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          throw new UnauthorizedException('Token expired');
        } else if (error instanceof JsonWebTokenError) {
          throw new UnauthorizedException('Invalid token');
        } else {
          throw new UnauthorizedException('Unknown token error');
        }
      }
      await this.applyImpersonation(req, res, 'jwt');
      return next();
    }
  }

  /**
   * @akili-spec changes/profile-simulation
   * design §5 "Resolve on every request" steps 1-8. Called by all three
   * `req.user` assignment branches right after `req.user` is set and
   * before their `next()`. Mutates `req.user`/`req.actor`/`req.impersonation`
   * in place; throws `ImpersonationException` (after setting the
   * `X-Impersonation-Error` response header) for every rejection.
   */
  private async applyImpersonation(
    req: RequestWithUser,
    res: Response,
    credential: ImpersonationCredential,
  ): Promise<void> {
    req.credential = credential;

    // Step 1 — no header, unchanged behaviour.
    const sessionId = this.getSessionHeader(req);
    if (!sessionId) {
      return;
    }

    const actor = req.user;
    const routeAction = this.getImpersonationRouteAction(req);

    // Step 2 — machine tokens can never simulate.
    if (credential === 'machine') {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.NOT_ALLOWED,
        HttpStatus.FORBIDDEN,
        actor?.sec_user_id,
        sessionId,
      );
    }

    // Step 3 — only a SYSTEM_ADMIN JWT (or bypass) may carry the header.
    if (!actor?.roles?.includes(SecRolesEnum.SYSTEM_ADMIN)) {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.NOT_ALLOWED,
        HttpStatus.FORBIDDEN,
        actor?.sec_user_id,
        sessionId,
      );
    }

    const actorId = actor.sec_user_id;

    // Step 4 — nested attempt: reject before RolesGuard, distinct status per route.
    if (routeAction === 'start') {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.NESTED,
        HttpStatus.CONFLICT,
        actorId,
        sessionId,
      );
    }
    if (routeAction === 'users') {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.NESTED,
        HttpStatus.FORBIDDEN,
        actorId,
        sessionId,
      );
    }

    // Step 5 — resolve; not found or foreign (actor mismatch) → always 403.
    // `resolve()` failing outright (e.g. a DB error) must fail closed with
    // a distinct, clear status — never fall through to the JWT branch's
    // catch-all "Unknown token error" 401 (T-03 rework).
    const resolveStartedAt = performance.now();
    let result: Awaited<ReturnType<typeof this.impersonationService.resolve>>;
    try {
      result = await this.impersonationService.resolve(sessionId, actorId);
    } catch (error) {
      const latencyMs = performance.now() - resolveStartedAt;
      this.logger.error(
        `impersonation.resolve failed latency_ms=${latencyMs} actor_user_id=${actorId} session_id=${sessionId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new ServiceUnavailableException(
        'Impersonation service unavailable',
      );
    }
    this.logger.debug(
      `impersonation.resolve latency_ms=${performance.now() - resolveStartedAt} actor_user_id=${actorId} session_id=${sessionId} state=${result.state}`,
    );

    if (result.state === 'invalid') {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.SESSION_INVALID,
        HttpStatus.FORBIDDEN,
        actorId,
        sessionId,
      );
    }

    // Step 6 — owned but ended/expired: tolerated only on /end and /current.
    if (result.state === 'ended' || result.state === 'expired') {
      if (routeAction === 'end' || routeAction === 'current') {
        req.actor = actor;
        req.impersonation = { session_id: sessionId, invalid: 'ended' };
        return;
      }
      this.reject(
        res,
        ImpersonationErrorCodeEnum.SESSION_INVALID,
        HttpStatus.FORBIDDEN,
        actorId,
        sessionId,
      );
    }

    // Step 7 — valid; a vanished target is treated as SESSION_INVALID.
    if (!result.target) {
      this.reject(
        res,
        ImpersonationErrorCodeEnum.SESSION_INVALID,
        HttpStatus.FORBIDDEN,
        actorId,
        sessionId,
      );
    }

    req.actor = actor;
    req.user = {
      ...result.target,
      roles: result.target.user_role_list
        .filter((role) => role.is_active)
        .map((role) => role.role_id),
    };
    req.impersonation = { session_id: sessionId };
  }

  /** Step 8 — set the response header, log, then throw. Never returns. */
  private reject(
    res: Response,
    code: ImpersonationErrorCodeEnum,
    status: HttpStatus.FORBIDDEN | HttpStatus.CONFLICT,
    actorUserId?: number,
    sessionId?: string,
  ): never {
    res.setHeader(IMPERSONATION_ERROR_HEADER, code);
    this.logger.warn(
      `impersonation.reject code=${code} actor_user_id=${actorUserId} session_id=${sessionId}`,
    );
    throw new ImpersonationException(code, status);
  }

  private getSessionHeader(req: Request): string | undefined {
    const raw = req.headers[IMPERSONATION_SESSION_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private getImpersonationRouteAction(
    req: Request,
  ): ImpersonationRouteAction | undefined {
    const rawUrl = req.originalUrl ?? req.url ?? req.path ?? '';
    const match = IMPERSONATION_ROUTE_PATTERN.exec(rawUrl);
    return match?.[1]?.toLowerCase() as ImpersonationRouteAction | undefined;
  }

  private validateTokenType(
    token: string,
  ): { client_id: string; client_secret: string } | null {
    try {
      const obj = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      return obj?.client_id && obj?.client_secret ? obj : null;
    } catch {
      return null;
    }
  }
}
