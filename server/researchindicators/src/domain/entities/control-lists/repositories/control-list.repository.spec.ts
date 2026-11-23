import { DataSource } from 'typeorm';
import { ControlListRepository } from './control-list.repository';

describe('ControlListRepository', () => {
  it('should instantiate with a TypeORM entity manager', () => {
    const createEntityManager = jest.fn().mockReturnValue({});
    const dataSource = {
      createEntityManager,
    } as unknown as DataSource;

    const repository = new ControlListRepository(dataSource);

    expect(createEntityManager).toHaveBeenCalled();
    expect(repository).toBeInstanceOf(ControlListRepository);
  });
});
