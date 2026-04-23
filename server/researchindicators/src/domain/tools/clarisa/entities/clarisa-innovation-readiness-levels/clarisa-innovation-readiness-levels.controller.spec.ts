import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsController } from './clarisa-innovation-readiness-levels.controller';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInnovationReadinessLevelsController', () => {
  let controller: ClarisaInnovationReadinessLevelsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationReadinessLevelsController],
      providers: [
        {
          provide: ClarisaInnovationReadinessLevelsService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(ClarisaInnovationReadinessLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Innovation readiness levels label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation readiness levels found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
