import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Request } from 'express';
import { ENV } from '../utils/env.utils';
import { LoggerUtil } from '../utils/logger.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const _logger: LoggerUtil = new LoggerUtil({
      context: context,
    });
    const contextType = context.getType();
    let method: string = '';
    let url: string = '';
    let message: string = '';
    if (contextType === 'http') {
      const ctx = context.switchToHttp();
      const request: Request = ctx.getRequest<Request>();
      const ip = request.socket?.remoteAddress;
      method = request.method;
      url = request.url;
      message = `- By ${ip}`;
    } else if (contextType === 'rpc') {
      const ctx = context.switchToRpc();
      const pattern = ctx.getContext().getPattern();
      method = 'socket';
      url = pattern;
      message = ` - By Alliance Main`;
    }

    return next
      .handle()
      .pipe(
        finalize(
          () => ENV.SEE_ALL_LOGS && _logger.log(message, { method, url }),
        ),
      );
  }
}
