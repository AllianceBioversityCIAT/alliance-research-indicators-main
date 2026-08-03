import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from '../services/admin.service';
import { ReactRendererService } from '../services/react-renderer.service';

describe('AdminController', () => {
  let controller: AdminController;
  const mockAdminService = {
    getDashboardStats: jest.fn(),
    getRecentActivity: jest.fn(),
    listBilateralProjectMappings: jest.fn(),
  };
  const mockRenderer = {
    render: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAdminService.getDashboardStats.mockResolvedValue({ total: 1 });
    mockAdminService.getRecentActivity.mockResolvedValue([]);
    mockRenderer.render.mockResolvedValue('<html></html>');
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: ReactRendererService, useValue: mockRenderer },
      ],
    }).compile();
    controller = module.get(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('dashboard sends rendered html', async () => {
    const req = { url: '/admin' } as any;
    const res = { send: jest.fn() } as any;
    await controller.dashboard(req, res);
    expect(mockAdminService.getDashboardStats).toHaveBeenCalled();
    expect(mockAdminService.getRecentActivity).toHaveBeenCalled();
    expect(mockRenderer.render).toHaveBeenCalledWith('/admin', {
      stats: { total: 1 },
      recentActivity: [],
    });
    expect(res.send).toHaveBeenCalledWith('<html></html>');
  });

  it('users sends rendered html', async () => {
    const req = { url: '/admin/users' } as any;
    const res = { send: jest.fn() } as any;
    await controller.users(req, res);
    expect(mockRenderer.render).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  it('settings sends rendered html', async () => {
    const req = { url: '/admin/settings' } as any;
    const res = { send: jest.fn() } as any;
    await controller.settings(req, res);
    expect(mockRenderer.render).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
  it('bilateral-project-mappings SSR-loads the first page and renders', async () => {
    const initialPage = {
      items: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    };
    mockAdminService.listBilateralProjectMappings.mockResolvedValueOnce(
      initialPage,
    );
    const req = { url: '/admin/bilateral-project-mappings' } as any;
    const res = { send: jest.fn() } as any;
    await controller.bilateralProjectMappings(req, res);
    expect(mockAdminService.listBilateralProjectMappings).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    expect(mockRenderer.render).toHaveBeenCalledWith(
      '/admin/bilateral-project-mappings',
      { mappings: initialPage },
    );
    expect(res.send).toHaveBeenCalledWith('<html></html>');
  });
});
