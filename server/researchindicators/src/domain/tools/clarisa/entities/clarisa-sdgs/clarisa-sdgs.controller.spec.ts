import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaSdgsController } from './clarisa-sdgs.controller';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaSdgsController', () => {
  let controller: ClarisaSdgsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSdgsController],
      providers: [{ provide: ClarisaSdgsService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaSdgsController);
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
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findById('3');
    expect(mockService.findOne).toHaveBeenCalledWith(3);
  });
});
