import { Test, TestingModule } from '@nestjs/testing';
import { ResultContractsController } from './result-contracts.controller';
import { ResultContractsService } from './result-contracts.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ResultContractsController', () => {
  let controller: ResultContractsController;
  const mockService = { findAllResultByContractId: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultContractsController],
      providers: [{ provide: ResultContractsService, useValue: mockService }],
    }).compile();
    controller = module.get(ResultContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAllResultsByContractId', async () => {
    const rows = [{ result_id: 1 }];
    mockService.findAllResultByContractId.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.findAllResultsByContractId('C-1');
    expect(mockService.findAllResultByContractId).toHaveBeenCalledWith('C-1');
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Results found',
      status: 200,
      data: rows,
    });
  });
});
