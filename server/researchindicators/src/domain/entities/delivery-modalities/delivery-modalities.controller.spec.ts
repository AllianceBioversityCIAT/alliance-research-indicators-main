import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DeliveryModalitiesController } from './delivery-modalities.controller';
import { DeliveryModalitiesService } from './delivery-modalities.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('DeliveryModalitiesController', () => {
  let controller: DeliveryModalitiesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryModalitiesController],
      providers: [
        { provide: DeliveryModalitiesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(DeliveryModalitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Delivery modalities found',
      status: HttpStatus.OK,
      data: [],
    });
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findOne('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
