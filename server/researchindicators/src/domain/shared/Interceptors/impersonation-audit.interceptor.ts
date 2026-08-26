// @akili-spec changes/profile-simulation
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ImpersonationService } from '../../entities/impersonation/impersonation.service';
import { RequestWithUser } from '../global-dto/request-with-user.dto';
import { LogActionInput } from '../../entities/impersonation/types/impersonation.types';
import { RESULT_CODE_PARAM } from '../utils/results.util';
import { LoggerUtil } from '../utils/logger.util';

/** `path` column is `varchar(512)` (design §3) — never insert past it. */
const MAX_PATH_LENGTH = 512;
/** `route_pattern` column is `varchar(255)` (design §3). */
const MAX_ROUTE_PATTERN_LENGTH = 255;

/**
 * R-IMP-005 / design §5 "Audit". Global interceptor: writes one
 * `impersonation_actions` row per non-GET request served under an active,
 * valid impersonation session. Registered as `APP_INTERCEPTOR` in
 * `app.module.ts`. Status is read from the handler's returned
 * `ServerResponseDto` or thrown `HttpException` (D-imp-10), never from
 * `res.statusCode` directly — see `app.module.ts` for the one known,
 * accepted gap this has relative to registration order.
 *
 * Fire-and-forget: `ImpersonationService.logAction` is never awaited on the
 * response path. `ImpersonationService.logAction` already swallows its own
 * failures internally, but this interceptor still guards its own call with
 * `.catch` (defense in depth per design §5 — "rejection -> LoggerUtil
 * error, response unaffected") so a mocked/replaced service that DOES
 * reject can never surface as an unhandled rejection or an altered
 * response.
 */
@Injectable()
export class ImpersonationAuditInterceptor implements NestInterceptor {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: ImpersonationAuditInterceptor.name,
  });

  constructor(private readonly impersonationService: ImpersonationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionId = request.impersonation?.session_id;

    if (
      !sessionId ||
      request.impersonation?.invalid ||
      request.method === 'GET'
    ) {
      return next.handle();
    }

    const method = request.method;
    const routePattern = this.resolveRoutePattern(request);
    const path = this.resolvePath(request);
    const resultOfficialCode = this.resolveResultCode(request);

    return next.handle().pipe(
      tap({
        next: (dto: { status?: HttpStatus } | undefined) => {
          this.log({
            session_id: sessionId,
            method,
            route_pattern: routePattern,
            path,
            status_code: dto?.status ?? HttpStatus.OK,
            result_official_code: resultOfficialCode,
          });
        },
        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;
          this.log({
            session_id: sessionId,
            method,
            route_pattern: routePattern,
            path,
            status_code: statusCode,
            result_official_code: resultOfficialCode,
          });
        },
      }),
    );
  }

  private resolveRoutePattern(request: RequestWithUser): string {
    const rawPattern = (request as any).route?.path ?? request.originalUrl;
    const pattern =
      typeof rawPattern === 'string' ? rawPattern : String(rawPattern ?? '');
    return pattern.slice(0, MAX_ROUTE_PATTERN_LENGTH);
  }

  private resolvePath(request: RequestWithUser): string {
    return (request.originalUrl ?? '').slice(0, MAX_PATH_LENGTH);
  }

  private resolveResultCode(request: RequestWithUser): number | undefined {
    const raw = (request.params as Record<string, string> | undefined)?.[
      RESULT_CODE_PARAM
    ];
    if (raw === undefined) {
      return undefined;
    }
    const parsed = parseInt(raw, 10);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }

  /**
   * Fire-and-forget: never returned, never awaited by the caller. Wrapped in
   * `try/catch` in addition to `.catch` so a SYNCHRONOUS throw from
   * `logAction` (e.g. a mocked/replaced service) can never escape and alter
   * the response either.
   */
  private log(input: LogActionInput): void {
    try {
      this.impersonationService.logAction(input)?.catch((error) => {
        this.logError(input.session_id, error);
      });
    } catch (error) {
      this.logError(input.session_id, error);
    }
  }

  private logError(sessionId: string, error: unknown): void {
    this.logger._error(
      `impersonation.audit failed to log action session_id=${sessionId}: ${
        (error as { message?: string })?.message ?? error
      }`,
    );
  }
}
