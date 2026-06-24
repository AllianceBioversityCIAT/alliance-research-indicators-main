import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { HttpStatus } from '@nestjs/common';
import { AppSecretsController } from './app-secrets.controller';
import { AppSecretsService } from './app-secrets.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard } from '../../shared/guards/roles.guard';

jest.mock('../../shared/utils/response.utils');

describe('AppSecretsController', () => {
  let controller: AppSecretsController;
  const mockService = { createCredentials: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppSecretsController],
      providers: [
        { provide: AppSecretsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        mockPortfolioUtilProvider,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AppSecretsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createAppSecret', async () => {
    const dto = { name: 'x' } as any;
    const created = { id: 1 };
    mockService.createCredentials.mockResolvedValue(created);
    mockFormat.mockReturnValue({});
    await controller.createAppSecret(dto);
    expect(mockService.createCredentials).toHaveBeenCalledWith(dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'App secret created successfully',
      status: HttpStatus.CREATED,
      data: created,
    });
  });
});
