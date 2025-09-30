import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ServerResponseDto } from '../global-dto/server-response.dto';
import { LoggerUtil } from '../utils/logger.util';

@Catch()
export class GlobalExceptions implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const stack = exception?.stack ?? '';
    const _logger: LoggerUtil = new LoggerUtil({
      stack: stack,
    });

    const status = exception?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const description = exception?.name;
    const error = exception?.message;

    const res: ServerResponseDto<unknown> = {
      description: description,
      status: status,
      errors: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    _logger._error((exception as InternalServerErrorException)?.stack, {
      method: request.method,
      url: request.url,
      userId: (request as any)?.user?.sec_user_id,
    });
    response.status(status).json(res);
  }
}
