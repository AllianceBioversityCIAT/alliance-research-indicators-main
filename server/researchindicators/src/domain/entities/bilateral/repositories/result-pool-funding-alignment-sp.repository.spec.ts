import { DataSource } from 'typeorm';
import { ResultPoolFundingAlignmentSpRepository } from './result-pool-funding-alignment-sp.repository';

describe('ResultPoolFundingAlignmentSpRepository', () => {
  it('should extend TypeORM repository for ResultPoolFundingAlignmentSp', () => {
    const dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource;
    const repo = new ResultPoolFundingAlignmentSpRepository(dataSource);
    expect(repo).toBeDefined();
  });
});
