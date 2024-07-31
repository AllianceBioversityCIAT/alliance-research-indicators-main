import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ServerResponseDto } from '../global-dto/server-response.dto';

@Catch()
export class GlobalExceptions implements ExceptionFilter {
  private readonly _logger: Logger = new Logger('System');
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const description = exception?.name;
    const error = exception?.message;

    const res: ServerResponseDto<unknown> = {
      description: description,
      status: status,
      errors: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this._logger.error((exception as InternalServerErrorException)?.stack);
    response.status(status).json(res);
  }
}
