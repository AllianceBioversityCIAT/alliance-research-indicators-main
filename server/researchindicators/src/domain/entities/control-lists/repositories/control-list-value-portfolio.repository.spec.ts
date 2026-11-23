import { DataSource } from 'typeorm';
import { ControlListValuePortfolioRepository } from './control-list-value-portfolio.repository';

describe('ControlListValuePortfolioRepository', () => {
  it('should instantiate with a TypeORM entity manager', () => {
    const createEntityManager = jest.fn().mockReturnValue({});
    const dataSource = {
      createEntityManager,
    } as unknown as DataSource;

    const repository = new ControlListValuePortfolioRepository(dataSource);

    expect(createEntityManager).toHaveBeenCalled();
    expect(repository).toBeInstanceOf(ControlListValuePortfolioRepository);
  });
});
