import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { LeverStrategicOutcomeService } from './lever-strategic-outcome.service';
import { LeverStrategicOutcome } from './entities/lever-strategic-outcome.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('LeverStrategicOutcomeService', () => {
  let service: LeverStrategicOutcomeService;
  const find = jest.fn();

  const mockRepository = {
    find,
    metadata: {
      primaryColumns: [{ propertyName: 'id' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = { user_id: 1, audit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeverStrategicOutcomeService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<LeverStrategicOutcomeService>(
      LeverStrategicOutcomeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByLeverId', () => {
    it('should return active strategic outcomes for lever ordered by name', async () => {
      const rows = [{ id: 1, lever_id: 7 } as LeverStrategicOutcome];
      find.mockResolvedValue(rows);

      const result = await service.findByLeverId(7);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(
        LeverStrategicOutcome,
      );
      expect(find).toHaveBeenCalledWith({
        where: { lever_id: 7, is_active: true },
        order: { strategic_outcome: 'ASC' },
      });
      expect(result).toBe(rows);
    });
  });
});
