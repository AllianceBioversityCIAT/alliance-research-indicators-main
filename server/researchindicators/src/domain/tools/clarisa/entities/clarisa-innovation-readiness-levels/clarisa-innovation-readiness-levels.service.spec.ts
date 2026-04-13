import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaInnovationReadinessLevelsService', () => {
  let service: ClarisaInnovationReadinessLevelsService;
  const mockFindOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaInnovationReadinessLevelsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn(),
              findOne: mockFindOne,
              save: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
              metadata: { columns: [], relations: [] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaInnovationReadinessLevelsService>(
      ClarisaInnovationReadinessLevelsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 173
  describe('findByValue', () => {
    it('should query with is_active=true and level equal to value', async () => {
      const mockLevel = { id: 1, level: 7, name: 'TRL 7', is_active: true };
      mockFindOne.mockResolvedValue(mockLevel);

      const result = await service.findByValue(7);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { is_active: true, level: 7 },
      });
      expect(result).toEqual(mockLevel);
    });

    it('should return null when no level matches the provided value', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findByValue(99);

      expect(result).toBeNull();
    });
  });
});
