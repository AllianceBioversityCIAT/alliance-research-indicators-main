import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ResultsUtil } from '../utils/results.util';

@Injectable()
export class SetUpInterceptor implements NestInterceptor {
  constructor(private readonly resultsUtil: ResultsUtil) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    await this.resultsUtil.setup();
    return next.handle();
  }
}
