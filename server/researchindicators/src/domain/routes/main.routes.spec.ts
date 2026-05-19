import { BilateralModule } from '../entities/bilateral/bilateral.module';
import { ResultsModule } from '../entities/results/results.module';
import { RESULT_CODE } from '../shared/utils/results.util';
import { route } from './main.routes';

describe('main routes', () => {
  it('registers the bilateral alignment endpoint under /results/:resultCode', () => {
    const resultsRoute = route.find((item) => item.module === ResultsModule);

    expect(resultsRoute?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: `${RESULT_CODE}/pool-funding-alignment`,
          module: BilateralModule,
        }),
      ]),
    );
  });
});
