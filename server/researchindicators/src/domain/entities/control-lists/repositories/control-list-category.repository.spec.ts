import { DataSource } from 'typeorm';
import { ControlListCategoryRepository } from './control-list-category.repository';

describe('ControlListCategoryRepository', () => {
  it('should instantiate with a TypeORM entity manager', () => {
    const createEntityManager = jest.fn().mockReturnValue({});
    const dataSource = {
      createEntityManager,
    } as unknown as DataSource;

    const repository = new ControlListCategoryRepository(dataSource);

    expect(createEntityManager).toHaveBeenCalled();
    expect(repository).toBeInstanceOf(ControlListCategoryRepository);
  });
});
