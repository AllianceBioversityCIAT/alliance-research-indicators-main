import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaRegionsController } from './clarisa-regions.controller';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaRegionsController', () => {
  let controller: ClarisaRegionsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaRegionsController],
      providers: [{ provide: ClarisaRegionsService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaRegionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Regions found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({ id: 2 });
    mockFormat.mockReturnValue({});
    await controller.findById('2');
    expect(mockService.findOne).toHaveBeenCalledWith(2);
  });
});
