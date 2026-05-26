import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { ReactRendererService } from '../services/react-renderer.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
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

  /**
   * Bilateral Project Mappings Page
   * URL: /admin/bilateral-project-mappings
   *
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15 / R-BIL-080 (UI)
   *
   * SSR-renders the first page of the mapping list; the React page then
   * fetches its own refresh + picker data client-side via /api/...
   * endpoints. Auth + role gating is enforced server-side by RolesGuard
   * on /api/bilateral-project-mappings; this SSR route is only the shell.
   */
  @Get('bilateral-project-mappings')
  async bilateralProjectMappings(@Req() req: Request, @Res() res: Response) {
    const mappings = await this.adminService.listBilateralProjectMappings({
      page: 1,
      limit: 20,
    });

    const initialData = { mappings };
    const html = await this.reactRenderer.render(req.url, initialData);
    res.send(html);
  }
}
