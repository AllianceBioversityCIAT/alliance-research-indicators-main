import { DataSource } from 'typeorm';
import { ResultContractsRepository } from './result-contracts.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';

describe('ResultContractsRepository', () => {
  let repository: ResultContractsRepository;
  let querySpy: jest.SpyInstance;

  const appConfig = {
    ARI_SECONDARY_MYSQL_NAME: 'sec_db',
  } as AppConfig;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new ResultContractsRepository(dataSource, appConfig);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockQueryBuilder() {
    const execute = jest.fn().mockResolvedValue({ affected: 1 });
    const andWhere = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const set = jest.fn().mockReturnThis();
    const update = jest.fn().mockReturnThis();
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
      update,
      set,
      where,
      andWhere,
      execute,
    } as any);
    return { execute, andWhere, where, set, update };
  }

  it('findAllResultsByContractId uses secondary DB for sec_users', async () => {
    await repository.findAllResultsByContractId('AGR-1');
    expect(querySpy).toHaveBeenCalledWith(expect.any(String), ['AGR-1']);
    expect(querySpy.mock.calls[0][0] as string).toContain(
      'sec_db.sec_users',
    );
  });

  it('findContractsLeverByResultId returns lever id or null', async () => {
    querySpy.mockResolvedValueOnce([{ id: 9 }]);
    await expect(
      repository.findContractsLeverByResultId(3),
    ).resolves.toBe(9);
    querySpy.mockResolvedValueOnce([]);
    await expect(
      repository.findContractsLeverByResultId(3),
    ).resolves.toBeNull();
  });

  it('getPrimaryContractByResultIds maps rows to ResultContract', async () => {
    querySpy.mockResolvedValueOnce([
      {
        contract_id: 'C1',
        result_id: 1,
        is_active: true,
        is_primary: true,
        agreement_id: 'C1',
        description: 'D',
      },
    ]);
    const out = await repository.getPrimaryContractByResultIds([1]);
    expect(out).toHaveLength(1);
    expect(out[0].contract_id).toBe('C1');
    expect(out[0].agresso_contract).toBeDefined();
  });

  it('updateActiveStatus builds update query', async () => {
    const { execute } = mockQueryBuilder();
    await repository.updateActiveStatus({
      result_id: 10,
      contract_role_id: 2,
      result_contract_id: 5,
    } as any);
    expect(execute).toHaveBeenCalled();
  });
});
