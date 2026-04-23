import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IndicatorTypesController } from './indicator-types.controller';
import { IndicatorTypesService } from './indicator-types.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('IndicatorTypesController', () => {
  let controller: IndicatorTypesController;
  const mockService = { findAll: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorTypesController],
      providers: [{ provide: IndicatorTypesService, useValue: mockService }],
    }).compile();
    controller = module.get(IndicatorTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: [],
      description: 'Indicator types found',
      status: HttpStatus.OK,
    });
  });
});
