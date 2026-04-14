import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultStatusController } from './result-status.controller';
import { ResultStatusService } from './result-status.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ResultStatusController', () => {
  let controller: ResultStatusController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAmountOfResultsByStatusCurrentUser: jest.fn(),
    findReviewStatuses: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultStatusController],
      providers: [{ provide: ResultStatusService, useValue: mockService }],
    }).compile();
    controller = module.get(ResultStatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result status found',
      status: HttpStatus.OK,
      data: [],
    });
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findOne('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });

  it('findAmountOfResultsByStatusCurrentUser', async () => {
    mockService.findAmountOfResultsByStatusCurrentUser.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findAmountOfResultsByStatusCurrentUser();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result status found',
      status: HttpStatus.OK,
      data: {},
    });
  });

  it('findReviewStatuses', async () => {
    mockService.findReviewStatuses.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findReviewStatuses();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Review statuses found',
      status: HttpStatus.OK,
      data: [],
    });
  });
});
