import { Test, TestingModule } from '@nestjs/testing';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectIndicatorsResult } from './entities/project_indicators_result.entity';
import { SyncProjectIndicatorsResultDto } from './dto/sync-project_indicators_result.dto';

describe('ProjectIndicatorsResultsService', () => {
  let service: ProjectIndicatorsResultsService;

  const mockRepo = {
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectIndicatorsResultsService,
        {
          provide: getRepositoryToken(ProjectIndicatorsResult),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ProjectIndicatorsResultsService>(
      ProjectIndicatorsResultsService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByResultId', () => {
    it('should call repo.query with correct params and return rows', async () => {
      const resultId = 1;
      const agreementId = 'AG123';
      const mockRows = [{ id: 1, contribution_value: 10 }];
      mockRepo.query.mockResolvedValue(mockRows);

      const rows = await service.findByResultId(resultId, agreementId);

      expect(mockRepo.query).toHaveBeenCalledWith(expect.any(String), [
        resultId,
        agreementId,
      ]);
      expect(rows).toBe(mockRows);
    });
  });

  describe('syncResultToIndicator', () => {
    it('should create new contributions and save them', async () => {
      const dtos: SyncProjectIndicatorsResultDto[] = [
        {
          contribution_id: undefined,
          result_id: 1,
          indicator_id: 2,
          contribution_value: 100,
        },
      ];
      const resultId = 1;
      const mockExisting = [];
      const mockCreated = {
        id: 10,
        result_id: { result_id: 1 },
        indicator_id: { id: 2 },
        contribution_value: 100,
      };
      const mockSaved = [mockCreated];

      mockRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExisting),
      });
      mockRepo.create.mockReturnValue(mockCreated);
      mockRepo.save.mockResolvedValue(mockSaved);

      const result = await service.syncResultToIndicator(dtos, resultId);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith({
        result_id: { result_id: dtos[0].result_id },
        indicator_id: { id: dtos[0].indicator_id },
        contribution_value: dtos[0].contribution_value,
      });
      expect(mockRepo.save).toHaveBeenCalledWith([mockCreated]);
      expect(result).toBe(mockSaved);
    });

    it('should update existing contributions', async () => {
      const dtos: SyncProjectIndicatorsResultDto[] = [
        {
          contribution_id: 5,
          result_id: 1,
          indicator_id: 2,
          contribution_value: 200,
        },
      ];
      const resultId = 1;
      const mockExisting = [
        { id: 5, result_id: {}, indicator_id: {}, contribution_value: 100 },
      ];
      const mockSaved = [mockExisting[0]];

      mockRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExisting),
      });
      mockRepo.save.mockResolvedValue(mockSaved);

      const result = await service.syncResultToIndicator(dtos, resultId);

      expect(mockRepo.save).toHaveBeenCalledWith([mockExisting[0]]);
      expect(result).toBe(mockSaved);
      expect(mockExisting[0].contribution_value).toBe(200);
    });

    it('should throw error if contribution_id not found', async () => {
      const dtos: SyncProjectIndicatorsResultDto[] = [
        {
          contribution_id: 99,
          result_id: 1,
          indicator_id: 2,
          contribution_value: 200,
        },
      ];
      const resultId = 1;
      const mockExisting = [{ id: 5 }];

      mockRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExisting),
      });

      await expect(
        service.syncResultToIndicator(dtos, resultId),
      ).rejects.toThrow('Contribution with id 99 not found');
    });

    it('should update deleted_at and is_active for removed contributions', async () => {
      const dtos: SyncProjectIndicatorsResultDto[] = [
        {
          contribution_id: 1,
          result_id: 1,
          indicator_id: 2,
          contribution_value: 100,
        },
      ];
      const resultId = 1;
      const mockExisting = [
        { id: 1, result_id: {}, indicator_id: {}, contribution_value: 100 },
        { id: 2, result_id: {}, indicator_id: {}, contribution_value: 200 },
      ];
      const mockSaved = [mockExisting[0]];

      mockRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockExisting),
      });
      mockRepo.save.mockResolvedValue(mockSaved);
      mockRepo.update.mockResolvedValue({});

      await service.syncResultToIndicator(dtos, resultId);

      expect(mockRepo.update).toHaveBeenCalledWith(
        [2],
        expect.objectContaining({
          is_active: false,
          deleted_at: expect.any(Date),
        }),
      );
    });
  });
});
