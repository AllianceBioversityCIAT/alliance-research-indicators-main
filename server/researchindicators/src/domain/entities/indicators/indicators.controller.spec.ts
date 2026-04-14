import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('IndicatorsController', () => {
  let controller: IndicatorsController;
  const mockService = {
    findAll: jest.fn(),
    customFindOne: jest.fn(),
    findResultsAmountByIndicatorCurrentUser: jest.fn(),
    findIndicatorByAmmountResults: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorsController],
      providers: [{ provide: IndicatorsService, useValue: mockService }],
    }).compile();
    controller = module.get(IndicatorsController);
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
      description: 'Indicators found',
      status: HttpStatus.OK,
    });
  });

  it('findOne uses customFindOne', async () => {
    mockService.customFindOne.mockResolvedValue({ id: 5 });
    mockFormat.mockReturnValue({});
    await controller.findOne(5 as any);
    expect(mockService.customFindOne).toHaveBeenCalledWith(5);
  });

  it('findResultsAmountByCurrentUser', async () => {
    mockService.findResultsAmountByIndicatorCurrentUser.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findResultsAmountByCurrentUser();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: [],
      description: 'Results amount found',
      status: HttpStatus.OK,
    });
  });

  it('findIndicatorByAmmountResults', async () => {
    mockService.findIndicatorByAmmountResults.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findIndicatorByAmmountResults();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: [],
      description: 'Indicators found',
      status: HttpStatus.OK,
    });
  });
});
