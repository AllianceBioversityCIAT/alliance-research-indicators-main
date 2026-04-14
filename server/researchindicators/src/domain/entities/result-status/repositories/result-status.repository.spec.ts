import { DataSource } from 'typeorm';
import { ResultStatusRepository } from './result-status.repository';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';

describe('ResultStatusRepository', () => {
  let repository: ResultStatusRepository;
  let querySpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  const currentUser = { user_id: 42 } as CurrentUserUtil;

  beforeEach(() => {
    repository = new ResultStatusRepository(dataSource, currentUser);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('findAmountOfResultsByStatusCurrentUser embeds user id and runs query', async () => {
    await repository.findAmountOfResultsByStatusCurrentUser();
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('r.created_by = 42'),
    );
    expect(querySpy.mock.calls[0][0] as string).toContain('result_status rs');
  });
});
