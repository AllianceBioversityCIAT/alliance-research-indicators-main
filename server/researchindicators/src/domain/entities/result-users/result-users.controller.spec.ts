import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { HttpStatus } from '@nestjs/common';
import { ResultUsersController } from './result-users.controller';
import { ResultUsersService } from './result-users.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

jest.mock('../../shared/utils/response.utils');

describe('ResultUsersController', () => {
  let controller: ResultUsersController;
  const mockService = {
    findAuthorContactUserByResultId: jest.fn(),
    saveAuthorContactUserByResultId: jest.fn(),
    deleteAuthorContactByResultIdAndKey: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultUsersController],
      providers: [
        { provide: ResultUsersService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 5,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
        mockPortfolioUtilProvider,
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();
    controller = module.get(ResultUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAuthorContactUserByResultId', async () => {
    const res = {};
    mockService.findAuthorContactUserByResultId.mockResolvedValue(res);
    mockFormat.mockReturnValue({});
    await controller.findAuthorContactUserByResultId();
    expect(mockService.findAuthorContactUserByResultId).toHaveBeenCalledWith(5);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: res,
      description: 'Author contact user retrieved successfully',
      status: HttpStatus.OK,
    });
  });

  it('saveAuthorContactUserByResultId', async () => {
    const body = {} as any;
    const saved = {};
    mockService.saveAuthorContactUserByResultId.mockResolvedValue(saved);
    mockFormat.mockReturnValue({});
    await controller.saveAuthorContactUserByResultId(body);
    expect(mockService.saveAuthorContactUserByResultId).toHaveBeenCalledWith(
      5,
      body,
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: saved,
      description: 'Author contact user saved successfully',
      status: HttpStatus.CREATED,
    });
  });

  it('deleteAuthorContactUserByResultId', async () => {
    const deleted = {};
    mockService.deleteAuthorContactByResultIdAndKey.mockResolvedValue(deleted);
    mockFormat.mockReturnValue({});
    await controller.deleteAuthorContactUserByResultId(12);
    expect(
      mockService.deleteAuthorContactByResultIdAndKey,
    ).toHaveBeenCalledWith(5, 12);
  });
});
