import { Injectable } from '@nestjs/common';
import { BilateralProjectMappingService } from '../../domain/entities/bilateral-project-mapping/bilateral-project-mapping.service';
import { ListBilateralProjectMappingsQueryDto } from '../../domain/entities/bilateral-project-mapping/dto/list-bilateral-project-mappings.query.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly bilateralProjectMappingService: BilateralProjectMappingService,
  ) {}

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
  // Thin SSR wrapper around BilateralProjectMappingService.list. The React
  // page does its own client-side refresh after CRUD, so this only powers
  // the first paint.
  async listBilateralProjectMappings(
    query: ListBilateralProjectMappingsQueryDto,
  ) {
    return this.bilateralProjectMappingService.list(query);
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    // Example data - replace with real database queries
    return {
      totalUsers: 150,
      totalResults: 1250,
      activeProjects: 45,
      pendingReviews: 23,
    };
  }

  /**
   * Get recent activity logs
   */
  async getRecentActivity() {
    return [
      {
        action: 'User login',
        user: 'admin@example.com',
        timestamp: new Date(),
      },
      {
        action: 'Result created',
        user: 'researcher@example.com',
        timestamp: new Date(),
      },
      {
        action: 'Project updated',
        user: 'manager@example.com',
        timestamp: new Date(),
      },
    ];
  }
}
