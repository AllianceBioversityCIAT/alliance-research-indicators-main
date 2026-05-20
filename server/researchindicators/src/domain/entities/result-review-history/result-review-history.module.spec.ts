import { ResultReviewHistoryModule } from './result-review-history.module';
import { ResultReviewHistoryRepository } from './repositories/result-review-history.repository';

describe('ResultReviewHistoryModule', () => {
  it('declares the review history repository as provider and export', () => {
    const providers = Reflect.getMetadata(
      'providers',
      ResultReviewHistoryModule,
    );
    const moduleExports = Reflect.getMetadata(
      'exports',
      ResultReviewHistoryModule,
    );

    expect(providers).toEqual(
      expect.arrayContaining([ResultReviewHistoryRepository]),
    );
    expect(moduleExports).toEqual(
      expect.arrayContaining([ResultReviewHistoryRepository]),
    );
  });
});
