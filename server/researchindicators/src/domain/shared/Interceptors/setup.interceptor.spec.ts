import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { SetUpInterceptor } from './setup.interceptor';
import { ResultsUtil } from '../utils/results.util';
import { PortfolioUtil } from '../utils/portfolio.util';

describe('SetUpInterceptor', () => {
  it('awaits resultsUtil.setup and portfolioUtil.setup then forwards the handler', async () => {
    const resultsSetup = jest.fn().mockResolvedValue(undefined);
    const portfolioSetup = jest.fn().mockResolvedValue(undefined);
    const resultsUtil = { setup: resultsSetup } as unknown as ResultsUtil;
    const portfolioUtil = { setup: portfolioSetup } as unknown as PortfolioUtil;
    const interceptor = new SetUpInterceptor(resultsUtil, portfolioUtil);
    const next = { handle: () => of('done') };
    const context = {} as any;
    const out = await lastValueFrom(
      await interceptor.intercept(context, next as any),
    );
    expect(resultsSetup).toHaveBeenCalled();
    expect(portfolioSetup).toHaveBeenCalled();
    expect(out).toBe('done');
  });
});
