import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsController } from './clarisa-innovation-characteristics.controller';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInnovationCharacteristicsController', () => {
  let controller: ClarisaInnovationCharacteristicsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationCharacteristicsController],
      providers: [
        {
          provide: ClarisaInnovationCharacteristicsService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(ClarisaInnovationCharacteristicsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Innovation characteristics label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation characteristics found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
