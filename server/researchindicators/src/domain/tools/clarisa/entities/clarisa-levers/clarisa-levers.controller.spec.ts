import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaLeversController } from './clarisa-levers.controller';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaLeversController', () => {
  let controller: ClarisaLeversController;
  const raw = [{ id: 1 }];
  const mapped = [{ id: 1, icon: 'x' }];
  const mockService = {
    findAll: jest.fn().mockResolvedValue(raw),
    findOne: jest.fn(),
    iconMapper: jest.fn().mockReturnValue(mapped),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockService.findAll.mockResolvedValue(raw);
    mockService.iconMapper.mockReturnValue(mapped);
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaLeversController],
      providers: [{ provide: ClarisaLeversService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaLeversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find maps icons', async () => {
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(mockService.iconMapper).toHaveBeenCalledWith(raw);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Levers found',
      data: mapped,
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
