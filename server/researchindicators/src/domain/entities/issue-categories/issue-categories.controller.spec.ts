import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IssueCategoriesController } from './issue-categories.controller';
import { IssueCategoriesService } from './issue-categories.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('IssueCategoriesController', () => {
  let controller: IssueCategoriesController;
  const mockService = { find: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssueCategoriesController],
      providers: [{ provide: IssueCategoriesService, useValue: mockService }],
    }).compile();
    controller = module.get(IssueCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.find.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Issue categories found',
      status: HttpStatus.OK,
      data: [],
    });
  });
});
