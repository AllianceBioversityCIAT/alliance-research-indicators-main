import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { ResultImpactAreaGlobalTargetsService } from './result-impact-area-global-targets.service';
import { ResultImpactAreaGlobalTarget } from './entities/result-impact-area-global-target.entity';
import { ResultImpactArea } from '../result-impact-areas/entities/result-impact-area.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultImpactAreaGlobalTargetsService', () => {
  let service: ResultImpactAreaGlobalTargetsService;

  const impactAreaFind = jest.fn();
  const globalFind = jest.fn();
  const globalUpdate = jest.fn();

  const impactAreaRepo = { find: impactAreaFind };
  const globalTargetRepo = {
    find: globalFind,
    update: globalUpdate,
    metadata: {
      primaryColumns: [{ propertyName: 'id' }],
    },
  };

  const getRepository = jest.fn((entity: unknown) => {
    if (entity === ResultImpactArea) {
      return impactAreaRepo;
    }
    return globalTargetRepo;
  });

  const mockDataSource = { getRepository };

  const mockCurrentUser = { user_id: 1, audit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    getRepository.mockImplementation((entity: unknown) => {
      if (entity === ResultImpactArea) {
        return impactAreaRepo;
      }
      return globalTargetRepo;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultImpactAreaGlobalTargetsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultImpactAreaGlobalTargetsService>(
      ResultImpactAreaGlobalTargetsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('disableAllByResultId', () => {
    it('should do nothing when no impact areas for result', async () => {
      impactAreaFind.mockResolvedValue([]);

      await service.disableAllByResultId(10);

      expect(impactAreaFind).toHaveBeenCalled();
      expect(globalUpdate).not.toHaveBeenCalled();
    });

    it('should deactivate global targets for impact area ids', async () => {
      impactAreaFind.mockResolvedValue([{ id: 3 }, { id: 4 }]);
      globalUpdate.mockResolvedValue({ affected: 2 });

      await service.disableAllByResultId(7);

      expect(globalUpdate).toHaveBeenCalledWith(
        { result_impact_area_id: In([3, 4]) },
        { is_active: false },
      );
    });
  });

  describe('findByResultImpactAreaIds', () => {
    it('should find active rows by impact area ids', async () => {
      const rows = [{ id: 1 } as ResultImpactAreaGlobalTarget];
      globalFind.mockResolvedValue(rows);

      const out = await service.findByResultImpactAreaIds([1, 2]);

      expect(globalFind).toHaveBeenCalledWith({
        where: {
          result_impact_area_id: In([1, 2]),
          is_active: true,
        },
      });
      expect(out).toBe(rows);
    });
  });
});
