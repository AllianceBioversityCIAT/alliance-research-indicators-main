import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

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
