import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { QueryService } from './query.service';
import { Result } from '../../entities/results/entities/result.entity';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';

describe('QueryService', () => {
  let service: QueryService;
  const mockQuery = jest.fn();
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockGetRepository = jest.fn(() => ({
    findOne: mockFindOne,
    find: mockFind,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: DataSource,
          useValue: {
            query: mockQuery,
            getRepository: mockGetRepository,
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findResultFamilyIds', () => {
    it('should return live and snapshot ids sharing official code and platform', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 10,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.PRMS,
        is_snapshot: false,
      });
      mockFind.mockResolvedValue([
        { result_id: 10 },
        { result_id: 11 },
        { result_id: 12 },
      ]);

      const ids = await service.findResultFamilyIds(10);

      expect(mockGetRepository).toHaveBeenCalledWith(Result);
      expect(mockFind).toHaveBeenCalledWith({
        where: {
          result_official_code: 7001,
          platform_code: ReportingPlatformEnum.PRMS,
        },
        select: { result_id: true },
      });
      expect(ids).toEqual([10, 11, 12]);
    });

    it('should return an empty array when the seed result does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const ids = await service.findResultFamilyIds(999);

      expect(ids).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });
  });

  describe('resolveResultDeleteTargetIds', () => {
    it('should return the full family when the seed row is live', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 10,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: false,
      });
      mockFind.mockResolvedValue([{ result_id: 10 }, { result_id: 11 }]);

      const ids = await service.resolveResultDeleteTargetIds(10);

      expect(ids).toEqual([10, 11]);
    });

    it('should return only the seed id when the row is a snapshot', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 11,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: true,
      });

      const ids = await service.resolveResultDeleteTargetIds(11);

      expect(ids).toEqual([11]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should treat null is_snapshot as live and resolve the full family', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 20,
        result_official_code: 8000,
        platform_code: ReportingPlatformEnum.PRMS,
        is_snapshot: null,
      });
      mockFind.mockResolvedValue([{ result_id: 20 }, { result_id: 21 }]);

      const ids = await service.resolveResultDeleteTargetIds(20);

      expect(ids).toEqual([20, 21]);
    });
  });

  describe('deleteResultById', () => {
    it('should soft-delete every target id for a live row', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 42,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: false,
      });
      mockFind.mockResolvedValue([{ result_id: 42 }, { result_id: 43 }]);
      mockQuery.mockResolvedValue(undefined);

      await service.deleteLogicalResultById(42);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT delete_result(?)', [
        42,
      ]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, 'SELECT delete_result(?)', [
        43,
      ]);
    });

    it('should soft-delete only the snapshot id when seed is a snapshot', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 43,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: true,
      });
      mockQuery.mockResolvedValue(undefined);

      await service.deleteLogicalResultById(43);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT delete_result(?)', [43]);
    });
  });

  describe('deleteFullResultById', () => {
    it('should hard-delete every target id for a live row', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 42,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: false,
      });
      mockFind.mockResolvedValue([{ result_id: 42 }, { result_id: 43 }]);
      mockQuery.mockResolvedValue(undefined);

      await service.deleteFullResultById(42);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT full_delete_result_version(?)',
        [42],
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'SELECT full_delete_result_version(?)',
        [43],
      );
    });

    it('should hard-delete only the snapshot id when seed is a snapshot', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 43,
        result_official_code: 7001,
        platform_code: ReportingPlatformEnum.TIP,
        is_snapshot: true,
      });
      mockQuery.mockResolvedValue(undefined);

      await service.deleteFullResultById(43);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT full_delete_result_version(?)',
        [43],
      );
    });

    it('should do nothing when the seed result does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await service.deleteFullResultById(1);

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should resolve without returning a value', async () => {
      mockFindOne.mockResolvedValue({
        result_id: 1,
        result_official_code: 100,
        platform_code: ReportingPlatformEnum.STAR,
        is_snapshot: false,
      });
      mockFind.mockResolvedValue([{ result_id: 1 }]);
      mockQuery.mockResolvedValue(undefined);

      const result = await service.deleteFullResultById(1);

      expect(result).toBeUndefined();
    });
  });
});
