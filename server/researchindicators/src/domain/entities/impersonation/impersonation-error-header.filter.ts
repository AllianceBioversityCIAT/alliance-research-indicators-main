// @akili-spec changes/profile-simulation
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { ImpersonationServiceError } from './errors/impersonation-service.error';

/**
 * D-imp-11 / requirements §6: `errors` stays a plain string (unchanged
 * `GlobalExceptions` envelope) while the machine-readable
 * `ImpersonationErrorCodeEnum` code travels in the `X-Impersonation-Error`
 * response header. Scoped to `ImpersonationServiceError` only (`start`'s
 * 404/409 domain failures, and `end`'s `SESSION_HEADER_REQUIRED`/
 * `SESSION_INVALID`) — every other exception in this controller (guard
 * `ForbiddenException`, DTO `BadRequestException`) still falls through to
 * the global `GlobalExceptions` filter untouched.
 *
 * Delegates the actual envelope shape to `GlobalExceptions` itself (rather
 * than re-implementing it) so the two never drift.
 */
@Catch(ImpersonationServiceError)
export class ImpersonationErrorHeaderFilter implements ExceptionFilter {
  private readonly delegate = new GlobalExceptions();

  catch(exception: ImpersonationServiceError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    response.setHeader('X-Impersonation-Error', exception.code);
    this.delegate.catch(exception, host);
  }
}
