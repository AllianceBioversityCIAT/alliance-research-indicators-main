import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultContractsService } from './result-contracts.service';
import { ResultContractsRepository } from './repositories/result-contracts.repository';
import { ResultContract } from './entities/result-contract.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultContractsService', () => {
  let service: ResultContractsService;

  const findContractsLeverByResultId = jest.fn();
  const findOne = jest.fn();
  const update = jest.fn();
  const getPrimaryContractByResultIds = jest.fn();
  const findAllResultsByContractId = jest.fn();

  const mockRepo = {
    findContractsLeverByResultId,
    findOne,
    update,
    getPrimaryContractByResultIds,
    findAllResultsByContractId,
    metadata: {
      primaryColumns: [{ propertyName: 'result_contract_id' }],
    },
  };

  const mockDataSource = { getRepository: jest.fn() };

  const mockCurrentUser = { user_id: 1, audit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultContractsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ResultContractsRepository, useValue: mockRepo },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultContractsService>(ResultContractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLeverFromPrimaryContract', () => {
    it('should delegate to repository', async () => {
      findContractsLeverByResultId.mockResolvedValue(42);

      const leverId = await service.getLeverFromPrimaryContract(9);

      expect(findContractsLeverByResultId).toHaveBeenCalledWith(9);
      expect(leverId).toBe(42);
    });
  });

  describe('deleteAll', () => {
    it('should soft-deactivate all contracts for result', async () => {
      update.mockResolvedValue({ affected: 3 });

      const res = await service.deleteAll(5);

      expect(update).toHaveBeenCalledWith(
        { result_id: 5 },
        { is_active: false },
      );
      expect(res).toEqual({ affected: 3 });
    });
  });

  describe('getPrimaryContract', () => {
    it('should find primary active contract', async () => {
      const row = { result_contract_id: 1 } as ResultContract;
      findOne.mockResolvedValue(row);

      const result = await service.getPrimaryContract(8);

      expect(findOne).toHaveBeenCalledWith({
        where: { result_id: 8, is_primary: true, is_active: true },
      });
      expect(result).toBe(row);
    });
  });

  describe('getPrincipalContractByResultsIds', () => {
    it('should return empty array when ids empty', () => {
      expect(service.getPrincipalContractByResultsIds([])).toEqual([]);
      expect(getPrimaryContractByResultIds).not.toHaveBeenCalled();
    });

    it('should delegate to repository when ids present', async () => {
      const rows = [{ result_id: 1 } as ResultContract];
      getPrimaryContractByResultIds.mockResolvedValue(rows);

      const out = await service.getPrincipalContractByResultsIds([1, 2]);

      expect(getPrimaryContractByResultIds).toHaveBeenCalledWith([1, 2]);
      expect(out).toBe(rows);
    });
  });

  describe('findAllResultByContractId', () => {
    it('should delegate to repository query', async () => {
      const rows = [{ result_id: 10 } as any];
      findAllResultsByContractId.mockResolvedValue(rows);

      const out = await service.findAllResultByContractId('C-1');

      expect(findAllResultsByContractId).toHaveBeenCalledWith('C-1');
      expect(out).toBe(rows);
    });
  });
});
