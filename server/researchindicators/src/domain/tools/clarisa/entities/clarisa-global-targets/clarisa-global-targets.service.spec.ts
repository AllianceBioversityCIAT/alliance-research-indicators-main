import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaGlobalTargetsService } from './clarisa-global-targets.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaGlobalTargetsService', () => {
  let service: ClarisaGlobalTargetsService;
  const mockFind = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaGlobalTargetsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: mockFind,
              findOne: jest.fn(),
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

    service = module.get<ClarisaGlobalTargetsService>(
      ClarisaGlobalTargetsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 172
  describe('findGlobalTargetsByImpactArea', () => {
    it('should query with is_active=true and the given impactAreaId', async () => {
      const mockTargets = [
        { id: 1, impactAreaId: 3, name: 'Target A', is_active: true },
        { id: 2, impactAreaId: 3, name: 'Target B', is_active: true },
      ];
      mockFind.mockResolvedValue(mockTargets);

      const result = await service.findGlobalTargetsByImpactArea(3);

      expect(mockFind).toHaveBeenCalledWith({
        where: { is_active: true, impactAreaId: 3 },
      });
      expect(result).toEqual(mockTargets);
    });

    it('should return empty array when no targets match the impact area', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findGlobalTargetsByImpactArea(999);

      expect(result).toEqual([]);
    });
  });
});
