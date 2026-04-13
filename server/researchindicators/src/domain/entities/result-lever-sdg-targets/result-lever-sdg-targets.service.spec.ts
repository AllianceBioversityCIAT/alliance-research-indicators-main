import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultLeverSdgTargetsService } from './result-lever-sdg-targets.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultLeverSdgTargetsService', () => {
  let service: ResultLeverSdgTargetsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultLeverSdgTargetsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              save: jest.fn(),
              metadata: { primaryColumns: [{ propertyName: 'id' }] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { audit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResultLeverSdgTargetsService>(ResultLeverSdgTargetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 83
  describe('findByMultiplesResultLeverIds', () => {
    it('should return active records matching the provided lever ids', async () => {
      const mockRecords = [{ id: 1, result_lever_id: 10 }, { id: 2, result_lever_id: 20 }];
      mockFind.mockResolvedValue(mockRecords);

      const result = await service.findByMultiplesResultLeverIds([10, 20]);

      expect(mockFind).toHaveBeenCalledWith({
        where: { result_lever_id: expect.anything(), is_active: true },
      });
      expect(result).toEqual(mockRecords);
    });

    it('should return empty array when no matching records found', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByMultiplesResultLeverIds([999]);

      expect(result).toEqual([]);
    });
  });
});
