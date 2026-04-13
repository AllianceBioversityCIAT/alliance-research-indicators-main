import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { SetUpInterceptor } from './setup.interceptor';
import { ResultsUtil } from '../utils/results.util';

describe('SetUpInterceptor', () => {
  it('awaits resultsUtil.setup then forwards the handler', async () => {
    const setup = jest.fn().mockResolvedValue(undefined);
    const resultsUtil = { setup } as unknown as ResultsUtil;
    const interceptor = new SetUpInterceptor(resultsUtil);
    const next = { handle: () => of('done') };
    const context = {} as any;
    const out = await lastValueFrom(
      await interceptor.intercept(context, next as any),
    );
    expect(setup).toHaveBeenCalled();
    expect(out).toBe('done');
  });
});
