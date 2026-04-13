import { Test, TestingModule } from '@nestjs/testing';
import { ResultStatusService } from './result-status.service';
import { ResultStatusRepository } from './repositories/result-status.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultStatusEnum } from './enum/result-status.enum';

describe('ResultStatusService', () => {
  let service: ResultStatusService;
  const mockFind = jest.fn();
  const mockFindAmountOfResultsByStatusCurrentUser = jest.fn();

  const mockRepo = {
    find: mockFind,
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    findAmountOfResultsByStatusCurrentUser:
      mockFindAmountOfResultsByStatusCurrentUser,
    metadata: { columns: [], relations: [] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultStatusService,
        { provide: ResultStatusRepository, useValue: mockRepo },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ResultStatusService>(ResultStatusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 129
  describe('findAmountOfResultsByStatusCurrentUser', () => {
    it('should delegate to repository.findAmountOfResultsByStatusCurrentUser', async () => {
      const mockData = [{ status: 'Approved', count: 5 }];
      mockFindAmountOfResultsByStatusCurrentUser.mockResolvedValue(mockData);

      const result = await service.findAmountOfResultsByStatusCurrentUser();

      expect(mockFindAmountOfResultsByStatusCurrentUser).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  // [CLAUDE/DONE] 130
  describe('findReviewStatuses', () => {
    it('should return active APPROVED, REJECTED and REVISED statuses', async () => {
      const mockStatuses = [
        { result_status_id: ResultStatusEnum.APPROVED, is_active: true },
        { result_status_id: ResultStatusEnum.REJECTED, is_active: true },
        { result_status_id: ResultStatusEnum.REVISED, is_active: true },
      ];
      mockFind.mockResolvedValue(mockStatuses);

      const result = await service.findReviewStatuses();

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          is_active: true,
          result_status_id: expect.anything(),
        },
      });
      expect(result).toEqual(mockStatuses);
    });
  });
});
