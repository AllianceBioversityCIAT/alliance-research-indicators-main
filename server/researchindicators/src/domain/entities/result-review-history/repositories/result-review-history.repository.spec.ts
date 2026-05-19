import { DataSource } from 'typeorm';
import { ResultReviewHistoryRepository } from './result-review-history.repository';

describe('ResultReviewHistoryRepository', () => {
  it('should extend TypeORM repository for ResultReviewHistory', () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repo = new ResultReviewHistoryRepository(dataSource);
    expect(repo).toBeDefined();
  });
});
