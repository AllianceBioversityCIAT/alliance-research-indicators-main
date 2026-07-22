import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ResultsUtil } from '../utils/results.util';
import { PortfolioUtil } from '../utils/portfolio.util';

@Injectable()
export class SetUpInterceptor implements NestInterceptor {
  constructor(
    private readonly resultsUtil: ResultsUtil,
    private readonly portfolioUtil: PortfolioUtil,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    await this.resultsUtil.setup();
    await this.portfolioUtil.setup();
    return next.handle();
  }
}
