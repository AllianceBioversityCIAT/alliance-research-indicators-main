import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
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
      { action: 'User login', user: 'admin@example.com', timestamp: new Date() },
      { action: 'Result created', user: 'researcher@example.com', timestamp: new Date() },
      { action: 'Project updated', user: 'manager@example.com', timestamp: new Date() },
    ];
  }
}
