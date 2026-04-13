import { DataSource } from 'typeorm';
import { IndicatorRepository } from './indicators.repository';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';

describe('IndicatorRepository', () => {
  let repository: IndicatorRepository;
  let querySpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  const currentUser = { user_id: 7 } as CurrentUserUtil;

  beforeEach(() => {
    repository = new IndicatorRepository(dataSource, currentUser);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('findAmountResultsByIndicatorCurrentUser filters by created_by', async () => {
    await repository.findAmountResultsByIndicatorCurrentUser();
    expect(querySpy.mock.calls[0][0] as string).toContain('r.created_by = 7');
  });

  it('findIndicatorByAmmountResults runs inner join query', async () => {
    await repository.findIndicatorByAmmountResults();
    const sql = querySpy.mock.calls[0][0] as string;
    expect(sql).toContain('INNER JOIN results r');
    expect(sql).toContain('ORDER BY i.position ASC');
  });
});
