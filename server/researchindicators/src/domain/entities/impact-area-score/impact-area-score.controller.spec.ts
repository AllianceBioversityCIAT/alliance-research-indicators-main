import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ImpactAreaScoreController } from './impact-area-score.controller';
import { ImpactAreaScoreService } from './impact-area-score.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ImpactAreaScoreController', () => {
  let controller: ImpactAreaScoreController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpactAreaScoreController],
      providers: [{ provide: ImpactAreaScoreService, useValue: mockService }],
    }).compile();
    controller = module.get(ImpactAreaScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Impact Area Score label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Impact Area Score found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
