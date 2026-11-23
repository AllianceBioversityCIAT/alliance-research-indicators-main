import { DataSource } from 'typeorm';
import { ControlListValueRepository } from './control-list-value.repository';

describe('ControlListValueRepository', () => {
  it('should instantiate with a TypeORM entity manager', () => {
    const createEntityManager = jest.fn().mockReturnValue({});
    const dataSource = {
      createEntityManager,
    } as unknown as DataSource;

    const repository = new ControlListValueRepository(dataSource);

    expect(createEntityManager).toHaveBeenCalled();
    expect(repository).toBeInstanceOf(ControlListValueRepository);
  });
});
