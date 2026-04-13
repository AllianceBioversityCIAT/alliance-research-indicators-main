import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultStatusTransitionsService } from './result-status-transitions.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultStatusTransitionsService', () => {
  let service: ResultStatusTransitionsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultStatusTransitionsService,
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
        {
          provide: CurrentUserUtil,
          useValue: { audit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ResultStatusTransitionsService>(ResultStatusTransitionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 96
  describe('findNextStatuses', () => {
    it('should return active transitions from the given status', async () => {
      const mockTransitions = [{ id: 1, from_status_id: 2, to_status_id: 3 }];
      mockFind.mockResolvedValue(mockTransitions);

      const result = await service.findNextStatuses(2);

      expect(mockFind).toHaveBeenCalledWith({
        where: { from_status_id: 2, is_active: true },
      });
      expect(result).toEqual(mockTransitions);
    });

    it('should return empty array when no transitions found', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findNextStatuses(99);

      expect(result).toEqual([]);
    });
  });
});
