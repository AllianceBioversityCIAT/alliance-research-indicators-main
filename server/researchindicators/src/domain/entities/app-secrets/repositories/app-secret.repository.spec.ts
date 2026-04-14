import { EntityManager } from 'typeorm';
import { AppSecretRepository } from './app-secret.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';

describe('AppSecretRepository', () => {
  let repository: AppSecretRepository;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    repository = new AppSecretRepository(
      {} as EntityManager,
      {} as AppConfig,
      {} as CurrentUserUtil,
    );
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getUserValidation returns null when no row', async () => {
    querySpy.mockResolvedValueOnce([]);
    await expect(repository.getUserValidation(99)).resolves.toBeNull();
    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [99]);
  });

  it('getUserValidation returns first row', async () => {
    const row = { sec_user_id: 1, roles: '[1,2]' };
    querySpy.mockResolvedValueOnce([row]);
    await expect(repository.getUserValidation(1)).resolves.toBe(row);
  });
});
