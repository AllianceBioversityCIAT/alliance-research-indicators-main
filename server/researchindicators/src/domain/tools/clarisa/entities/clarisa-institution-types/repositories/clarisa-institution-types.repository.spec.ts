import { DataSource } from 'typeorm';
import { ClarisaInstitutionTypesRepository } from './clarisa-institution-types.repository';

describe('ClarisaInstitutionTypesRepository', () => {
  let repository: ClarisaInstitutionTypesRepository;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new ClarisaInstitutionTypesRepository(dataSource);
  });

  it('findActiveWithNoChildren uses query builder chain', async () => {
    const getMany = jest.fn().mockResolvedValue([{ code: 'LEAF' }]);
    const subChain = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('(SELECT child.code FROM ...)'),
    };
    const andWhere = jest.fn(function (this: any, arg: unknown) {
      if (typeof arg === 'function') {
        const sql = arg({ subQuery: () => subChain } as any);
        expect(sql).toContain('NOT EXISTS');
      }
      return this;
    });
    const where = jest.fn().mockReturnThis();
    const leftJoinAndSelect = jest.fn().mockReturnThis();
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
      leftJoinAndSelect,
      where,
      andWhere,
      getMany,
    } as any);

    const rows = await repository.findActiveWithNoChildren();
    expect(leftJoinAndSelect).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
    expect(andWhere).toHaveBeenCalled();
    expect(subChain.select).toHaveBeenCalledWith('child.code');
    expect(subChain.getQuery).toHaveBeenCalled();
    expect(getMany).toHaveBeenCalled();
    expect(rows).toEqual([{ code: 'LEAF' }]);
  });
});
