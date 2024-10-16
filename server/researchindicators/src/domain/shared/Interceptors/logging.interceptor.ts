import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Request } from 'express';
import { ENV } from '../utils/env.utils';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly _logger: Logger = new Logger('System');
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();
    let message: string = '';
    if (contextType === 'http') {
      const ctx = context.switchToHttp();
      const request: Request = ctx.getRequest<Request>();
      const ip = request.socket?.remoteAddress;
      message = `[${request.method}]: ${request.url} - By ${ip}`;
    } else if (contextType === 'rpc') {
      const ctx = context.switchToRpc();
      const pattern = ctx.getContext().getPattern();
      message = `[socket]: (${pattern}) - By Alliance Main`;
    }

    return next
      .handle()
      .pipe(finalize(() => ENV.SEE_ALL_LOGS && this._logger.log(message)));
  }
}
