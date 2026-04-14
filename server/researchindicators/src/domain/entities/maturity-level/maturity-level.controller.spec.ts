import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { MaturityLevelController } from './maturity-level.controller';
import { MaturityLevelService } from './maturity-level.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('MaturityLevelController', () => {
  let controller: MaturityLevelController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaturityLevelController],
      providers: [{ provide: MaturityLevelService, useValue: mockService }],
    }).compile();
    controller = module.get(MaturityLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Maturity levels label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Maturity levels found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
