import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { BilateralProjectMappingService } from '../../domain/entities/bilateral-project-mapping/bilateral-project-mapping.service';

describe('AdminService', () => {
  let service: AdminService;
  const bilateralList = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: BilateralProjectMappingService,
          useValue: { list: bilateralList },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 150,
        totalResults: 1250,
        activeProjects: 45,
        pendingReviews: 23,
      });
    });
  });

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
  describe('listBilateralProjectMappings', () => {
    it('delegates to BilateralProjectMappingService.list with the given query', async () => {
      const expected = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      bilateralList.mockResolvedValueOnce(expected);

      const result = await service.listBilateralProjectMappings({
        page: 1,
        limit: 20,
      });

      expect(result).toBe(expected);
      expect(bilateralList).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity entries', async () => {
      const result = await service.getRecentActivity();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        action: 'User login',
        user: 'admin@example.com',
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
      expect(result[1]).toMatchObject({
        action: 'Result created',
        user: 'researcher@example.com',
      });
      expect(result[2]).toMatchObject({
        action: 'Project updated',
        user: 'manager@example.com',
      });
    });
  });
});
