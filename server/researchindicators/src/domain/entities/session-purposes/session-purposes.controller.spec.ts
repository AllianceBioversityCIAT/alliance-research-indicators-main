import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SessionPurposesController } from './session-purposes.controller';
import { SessionPurposesService } from './session-purposes.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('SessionPurposesController', () => {
  let controller: SessionPurposesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionPurposesController],
      providers: [{ provide: SessionPurposesService, useValue: mockService }],
    }).compile();
    controller = module.get(SessionPurposesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Session purposes found',
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
});
