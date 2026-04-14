import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SessionLengthsController } from './session-lengths.controller';
import { SessionLengthsService } from './session-lengths.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('SessionLengthsController', () => {
  let controller: SessionLengthsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionLengthsController],
      providers: [{ provide: SessionLengthsService, useValue: mockService }],
    }).compile();
    controller = module.get(SessionLengthsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Session lengths found',
      status: HttpStatus.OK,
      data: [],
    });
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findOne('3');
    expect(mockService.findOne).toHaveBeenCalledWith(3);
  });
});
