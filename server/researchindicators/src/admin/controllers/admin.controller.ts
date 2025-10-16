import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { ReactRendererService } from '../services/react-renderer.service';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reactRenderer: ReactRendererService,
    private readonly authService: AuthService,
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
   * Login Page (SSR)
   * URL: /admin/login
   */
  @Get('login')
  async loginPage(@Req() req: Request, @Res() res: Response) {
    // Check if already logged in
    const token = req.cookies?.['admin_token'];
    if (token) {
      const isValid = await this.authService.verifyToken(token);
      if (isValid) {
        // Redirect to dashboard if already authenticated
        return res.redirect('/admin/dashboard');
      }
    }

    const initialData = { isLoginPage: true };
    const html = await this.reactRenderer.render(req.url, initialData);
    res.send(html);
  }

  /**
   * Login API Endpoint
   * URL: POST /admin/api/login
   */
  @Post('api/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate admin user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const { token, isValid } =
        await this.authService.validateCredentials(loginDto);

      if (!isValid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Set cookie with token (7 days expiration)
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict',
      });

      return res.json({
        success: true,
        message: 'Login successful',
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: error.message || 'Invalid credentials',
      });
    }
  }

  /**
   * Logout API Endpoint
   * URL: POST /admin/api/logout
   */
  @Post('api/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout admin user' })
  async logout(@Res() res: Response): Promise<Response> {
    res.clearCookie('admin_token');
    return res.json({
      success: true,
      message: 'Logout successful',
    });
  }

  /**
   * Check Authentication Status
   * URL: GET /admin/api/auth/check
   */
  @Get('api/auth/check')
  @ApiOperation({ summary: 'Check if user is authenticated' })
  async checkAuth(@Req() req: Request): Promise<{ authenticated: boolean }> {
    const token = req.cookies?.['admin_token'];
    if (!token) {
      return { authenticated: false };
    }

    const isValid = await this.authService.verifyToken(token);
    return { authenticated: isValid };
  }
}
