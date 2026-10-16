// @akili-spec changes/profile-simulation
import { HttpException, HttpStatus } from '@nestjs/common';
import { ImpersonationErrorCodeEnum } from '../enum/impersonation-error-code.enum';

/**
 * Thrown by `ImpersonationService` for the 404/409 domain-validation
 * failures in `start` (target missing/inactive, target is admin, target
 * is self). Keeps `code` retrievable for whoever needs the machine-readable
 * `ImpersonationErrorCodeEnum` value (the envelope's `errors` field stays a
 * string per D-imp-11 — `code` is not part of it).
 *
 * This is deliberately NOT `src/domain/shared/errors/impersonation.exception.ts`
 * (T-03's `ImpersonationException`, which sets the `X-Impersonation-Error`
 * response header from the middleware). T-03 may extend this class or keep
 * its own hierarchy independent — either is fine, since both only need to
 * carry `code` + an HTTP status.
 */
export class ImpersonationServiceError extends HttpException {
  constructor(
    public readonly code: ImpersonationErrorCodeEnum,
    status: HttpStatus,
    message?: string,
  ) {
    super(message ?? code, status);
  }
}
