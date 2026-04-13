import { DataSource } from 'typeorm';
import { ResultLeversRepository } from './result-levers.repository';

describe('ResultLeversRepository', () => {
  let repository: ResultLeversRepository;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new ResultLeversRepository(dataSource);
  });

  it('updateActiveStatus executes query builder', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 2 });
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    } as any);

    await repository.updateActiveStatus({
      result_id: 1,
      lever_id: 2,
      lever_role_id: 3,
      result_lever_id: 4,
    } as any);

    expect(execute).toHaveBeenCalled();
  });
});
