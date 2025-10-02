import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import { ServerResponseDto } from '../global-dto/server-response.dto';
import { ServiceResponseDto } from '../global-dto/service-response.dto';
import { ENV } from '../utils/env.utils';
import { LoggerUtil } from '../utils/logger.util';

export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ServerResponseDto<unknown>> {
    const _logger: LoggerUtil = new LoggerUtil({
      context: context,
    });
    const ctx = context.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const request: Request = ctx.getRequest<Request>();
    const ip = request.socket?.remoteAddress;
    const contextType = context.getType();

    return next.handle().pipe(
      map((res: any) => {
        if (contextType === 'rpc') {
          const ctxRpc = context.switchToRpc();
          const pattern = ctxRpc.getContext().getPattern();
          _logger._verbose(`- By Alliance Main`, {
            method: 'socket',
            url: pattern,
          });
          return res;
        }
        let modifiedData: ServerResponseDto<unknown> = {
          data: [],
          status: HttpStatus.OK,
          description: 'Unknown message',
          errors: null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (this.isServiceResponseDto(res)) {
          modifiedData = {
            ...modifiedData,
            ...res,
          };
        } else if (this.isError(res)) {
          modifiedData = {
            ...modifiedData,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            description: res.name,
            errors: res.message,
          };
        }
        const description: string = `status: ${modifiedData.status} - By ${ip}`;
        this.logBasedOnStatus(
          modifiedData.status,
          description,
          _logger,
          res?.stack,
          request.method,
          request.url,
          (request as any)?.user?.sec_user_id,
        );

        response.status(modifiedData?.status);
        return modifiedData;
      }),
    );
  }

  private logBasedOnStatus(
    status: HttpStatus,
    message: string,
    logger: LoggerUtil,
    error?: any,
    method?: string,
    url?: string,
    userId?: string,
  ) {
    if (
      status >= HttpStatus.AMBIGUOUS &&
      status < HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      logger._warn(message, { method, url, userId });
      logger._warn(error, { method, url, userId });
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logger._error(message, { method, url, userId });
      logger._error(error, { method, url, userId });
    } else if (
      !ENV.IS_PRODUCTION &&
      ENV.SEE_ALL_LOGS &&
      status >= HttpStatus.OK &&
      status < HttpStatus.AMBIGUOUS
    ) {
      logger._verbose(message, { method, url, userId });
    }
  }

  private isServiceResponseDto(arg: any): arg is ServiceResponseDto<unknown> {
    return (
      arg?.status !== undefined &&
      arg?.description !== undefined &&
      arg?.stack === undefined
    );
  }

  private isError(arg: any): arg is InternalServerErrorException {
    return (
      arg?.name !== undefined &&
      arg?.description !== undefined &&
      arg?.stack !== undefined
    );
  }
}
