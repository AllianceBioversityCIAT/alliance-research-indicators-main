import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../shared/enum/queries.enum';

jest.mock('../../../shared/utils/response.utils');

describe('PrmsOpenSearchController', () => {
  let controller: PrmsOpenSearchController;
  const mockPrmsService = {
    getData: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrmsOpenSearchController],
      providers: [
        { provide: PrmsOpenSearchService, useValue: mockPrmsService },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PrmsOpenSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('fetchPrmsData should call getData with parsed year and format response when async is false', async () => {
    const response = { total: 10 };
    mockPrmsService.getData.mockResolvedValue(response);
    mockFormat.mockReturnValue({ ok: true });

    const result = await controller.fetchPrmsData('2024', TrueFalseEnum.FALSE);

    expect(mockPrmsService.getData).toHaveBeenCalledWith(2024);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: response,
      description: 'Prms data fetched',
      status: HttpStatus.OK,
    });
    expect(result).toEqual({ ok: true });
  });

  it('fetchPrmsData should trigger getData without awaiting when async is true', async () => {
    mockPrmsService.getData.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({ async: true });

    const result = await controller.fetchPrmsData('2024', TrueFalseEnum.TRUE);

    expect(mockPrmsService.getData).toHaveBeenCalledWith(2024);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: 'Prms data fetched asynchronously',
      description: 'Prms data fetched asynchronously',
      status: HttpStatus.OK,
    });
    expect(result).toEqual({ async: true });
  });
});
