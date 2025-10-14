import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { ReactRendererService } from '../services/react-renderer.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reactRenderer: ReactRendererService,
  ) {}

  /**
   * Admin Dashboard - Main page
   * URL: /admin or /admin/dashboard
   */
  @Get(['/', 'dashboard'])
  async dashboard(@Req() req: Request, @Res() res: Response) {
    const stats = await this.adminService.getDashboardStats();
    const recentActivity = await this.adminService.getRecentActivity();

    const initialData = {
      stats,
      recentActivity,
    };

    const html = await this.reactRenderer.render(req.url, initialData);
    res.send(html);
  }

  /**
   * Users Management Page
   * URL: /admin/users
   */
  @Get('users')
  async users(@Req() req: Request, @Res() res: Response) {
    // Aquí puedes obtener usuarios de tu servicio real
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    ];

    const initialData = { users };
    const html = await this.reactRenderer.render(req.url, initialData);
    res.send(html);
  }

  /**
   * Settings Page
   * URL: /admin/settings
   */
  @Get('settings')
  async settings(@Req() req: Request, @Res() res: Response) {
    const initialData = {
      settings: {
        siteName: 'Research Indicators',
        maintenanceMode: false,
      },
    };

    const html = await this.reactRenderer.render(req.url, initialData);
    res.send(html);
  }
}
