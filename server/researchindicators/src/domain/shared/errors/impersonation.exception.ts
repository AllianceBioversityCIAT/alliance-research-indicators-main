// @akili-spec changes/profile-simulation
import { HttpException, HttpStatus } from '@nestjs/common';
import { ImpersonationErrorCodeEnum } from '../../entities/impersonation/enum/impersonation-error-code.enum';

/**
 * Human-readable text per code (requirements R-IMP-003 steps 2 and 4).
 * Covers only the codes this exception actually carries — `NOT_ALLOWED`,
 * `NESTED`, `SESSION_INVALID`. Any other code falls back to itself, same
 * as before this map existed.
 */
const IMPERSONATION_EXCEPTION_MESSAGES: Partial<
  Record<ImpersonationErrorCodeEnum, string>
> = {
  [ImpersonationErrorCodeEnum.NOT_ALLOWED]: 'Impersonation not allowed',
  [ImpersonationErrorCodeEnum.NESTED]: 'Nested simulation is not allowed',
  [ImpersonationErrorCodeEnum.SESSION_INVALID]: 'Impersonation session invalid',
};

/**
 * Thrown by `applyImpersonation` (`jwr.middleware.ts`, T-03) for the
 * request-level rejections in design §5 "Resolve on every request" (steps
 * 2-4, 6-7): `NOT_ALLOWED`, `NESTED`, `SESSION_INVALID`. The caller MUST
 * call `res.setHeader('X-Impersonation-Error', code)` before throwing —
 * this class does not touch the response itself.
 *
 * Deliberately distinct from `ImpersonationServiceError`
 * (`entities/impersonation/errors/impersonation-service.error.ts`), which
 * carries the domain-validation failures thrown by `ImpersonationService
 * .start` (404/409 `TARGET_NOT_FOUND`/`TARGET_IS_ADMIN`/`TARGET_IS_SELF`).
 * Both carry `code` + an HTTP status; the envelope's `errors` field stays a
 * string (D-imp-11) — `code` travels only in the `X-Impersonation-Error`
 * response header.
 */
export class ImpersonationException extends HttpException {
  constructor(
    public readonly code: ImpersonationErrorCodeEnum,
    status: HttpStatus.FORBIDDEN | HttpStatus.CONFLICT,
    message?: string,
  ) {
    super(message ?? IMPERSONATION_EXCEPTION_MESSAGES[code] ?? code, status);
  }
}
