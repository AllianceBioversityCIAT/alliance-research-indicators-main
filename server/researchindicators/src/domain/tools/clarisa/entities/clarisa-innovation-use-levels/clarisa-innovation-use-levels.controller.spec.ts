import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInnovationUseLevelsController } from './clarisa-innovation-use-levels.controller';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInnovationUseLevelsController', () => {
  let controller: ClarisaInnovationUseLevelsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationUseLevelsController],
      providers: [
        {
          provide: ClarisaInnovationUseLevelsService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(ClarisaInnovationUseLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // R-IUA-010 AC.1, AC.2 — the ten rows come back wrapped in the
  // ServerResponseDto envelope under the "Innovation use levels" label.
  it('find uses the Innovation use levels label and returns the envelope', async () => {
    const rows = [
      { id: 1, level: 0, name: 'Idea', definition: 'd0' },
      { id: 2, level: 1, name: 'Basic research', definition: 'd1' },
    ];
    mockService.findAll.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});

    await controller.find();

    expect(mockService.findAll).toHaveBeenCalled();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation use levels found',
      data: rows,
      status: HttpStatus.OK,
    });
  });
});
