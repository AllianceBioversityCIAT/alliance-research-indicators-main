import { DataSource } from 'typeorm';
import { PortfoliosRepository } from './portfolios.repository';

describe('PortfoliosRepository', () => {
  it('should instantiate with a TypeORM entity manager', () => {
    const createEntityManager = jest.fn().mockReturnValue({});
    const dataSource = {
      createEntityManager,
    } as unknown as DataSource;

    const repository = new PortfoliosRepository(dataSource);

    expect(createEntityManager).toHaveBeenCalled();
    expect(repository).toBeInstanceOf(PortfoliosRepository);
  });
});
