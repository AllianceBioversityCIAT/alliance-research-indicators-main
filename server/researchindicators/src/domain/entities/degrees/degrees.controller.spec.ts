import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DegreesController } from './degrees.controller';
import { DegreesService } from './degrees.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('DegreesController', () => {
  let controller: DegreesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DegreesController],
      providers: [{ provide: DegreesService, useValue: mockService }],
    }).compile();
    controller = module.get(DegreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll formats degrees', async () => {
    const data = [{ id: 1 }];
    mockService.findAll.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Degrees found',
      status: HttpStatus.OK,
      data,
    });
  });

  it('findOne formats single degree', async () => {
    mockService.findOne.mockResolvedValue({ id: 2 });
    mockFormat.mockReturnValue({});
    await controller.findOne('2');
    expect(mockService.findOne).toHaveBeenCalledWith(2);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Degree found',
      status: HttpStatus.OK,
      data: { id: 2 },
    });
  });
});
