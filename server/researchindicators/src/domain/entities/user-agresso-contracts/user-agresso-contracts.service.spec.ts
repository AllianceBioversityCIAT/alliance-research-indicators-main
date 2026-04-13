import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { AgressoContractRepository } from '../agresso-contract/repositories/agresso-contract.repository';
import { UserAgressoContract } from './entities/user-agresso-contract.entity';

describe('UserAgressoContractsService', () => {
  let service: UserAgressoContractsService;
  const mockFindOne = jest.fn();
  const mockUpdate = jest.fn();
  const mockSave = jest.fn();
  const mockAgressoFindByName = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAgressoContractsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: mockFindOne,
              update: mockUpdate,
              save: mockSave,
            }),
          },
        },
        {
          provide: AgressoContractRepository,
          useValue: { findByName: mockAgressoFindByName },
        },
      ],
    }).compile();

    service = module.get<UserAgressoContractsService>(
      UserAgressoContractsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 154
  describe('linkUserToContract', () => {
    it('should create a new link when no existing link is found', async () => {
      mockFindOne.mockResolvedValue(null);
      const newLink: Partial<UserAgressoContract> = {
        user_id: 1,
        agreement_id: 'AGR-001',
        is_active: true,
      };
      mockSave.mockResolvedValue(newLink);

      const result = await service.linkUserToContract(1, 'AGR-001');

      expect(mockSave).toHaveBeenCalledWith({
        user_id: 1,
        agreement_id: 'AGR-001',
      });
      expect(result).toEqual(newLink);
    });

    it('should reactivate an inactive existing link', async () => {
      const existing: Partial<UserAgressoContract> = {
        user_agresso_contract_id: 10,
        user_id: 1,
        agreement_id: 'AGR-002',
        is_active: false,
      };
      mockFindOne.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(undefined);

      const result = await service.linkUserToContract(1, 'AGR-002');

      expect(mockUpdate).toHaveBeenCalledWith(10, { is_active: true });
      expect(result.is_active).toBe(true);
    });

    it('should return existing active link without any mutation', async () => {
      const existing: Partial<UserAgressoContract> = {
        user_agresso_contract_id: 5,
        user_id: 2,
        agreement_id: 'AGR-003',
        is_active: true,
      };
      mockFindOne.mockResolvedValue(existing);

      const result = await service.linkUserToContract(2, 'AGR-003');

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  // [CLAUDE/DONE] 155
  describe('automaticLinkUserAgressoContract', () => {
    it('should find contracts by name and save all as user-agresso links', async () => {
      const user = {
        sec_user_id: 5,
        first_name: 'Ana',
        last_name: 'Garcia',
      } as any;
      const contracts = [
        { agreement_id: 'C001' },
        { agreement_id: 'C002' },
      ];
      const savedLinks = [
        { user_id: 5, agreement_id: 'C001' },
        { user_id: 5, agreement_id: 'C002' },
      ];

      mockAgressoFindByName.mockResolvedValue(contracts);
      mockSave.mockResolvedValue(savedLinks);

      const result = await service.automaticLinkUserAgressoContract(user);

      expect(mockAgressoFindByName).toHaveBeenCalledWith('Ana', 'Garcia');
      expect(mockSave).toHaveBeenCalledWith([
        { agreement_id: 'C001', user_id: 5 },
        { agreement_id: 'C002', user_id: 5 },
      ]);
      expect(result).toEqual(savedLinks);
    });

    it('should save empty array when user has no matching contracts', async () => {
      const user = { sec_user_id: 3, first_name: 'John', last_name: 'Doe' } as any;
      mockAgressoFindByName.mockResolvedValue([]);
      mockSave.mockResolvedValue([]);

      const result = await service.automaticLinkUserAgressoContract(user);

      expect(mockSave).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
