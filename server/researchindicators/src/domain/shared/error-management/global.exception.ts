import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ServerResponseDto } from '../global-dto/server-response.dto';
import { LoggerUtil } from '../utils/logger.util';
import {
  redactCallbackDiagnostics,
  redactCallbackPath,
} from '../utils/path-redaction.util';

@Catch()
export class GlobalExceptions implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const loggedStack = (exception as InternalServerErrorException)?.stack;
    const safeStack =
      typeof loggedStack === 'string'
        ? redactCallbackDiagnostics(loggedStack)
        : loggedStack;
    const _logger: LoggerUtil = new LoggerUtil({
      stack: safeStack ?? '',
    });

    const status = exception?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const description = exception?.name;
    const error = exception?.message;
    const rawErrors = exception?.response?.message
      ? exception.response.message
      : error;
    const errors =
      typeof rawErrors === 'string'
        ? redactCallbackDiagnostics(rawErrors)
        : rawErrors;

    const res: ServerResponseDto<unknown> = {
      description: description,
      status: status,
      errors,
      timestamp: new Date().toISOString(),
      path: redactCallbackPath(request.url),
    };

    _logger._error(safeStack, {
      method: request.method,
      url: redactCallbackPath(request.url),
      userId: request?.user?.sec_user_id,
      // @akili-spec changes/profile-simulation — R-IMP-005/NFR-IMP-004 log
      // attribution: only present under an active impersonation session.
      actorId: request?.actor?.sec_user_id,
      impersonationSessionId: request?.impersonation?.session_id,
    });
    response.status(status).json(res);
  }
}
