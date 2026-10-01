import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { ROLES_KEY, RolesGuard } from '../../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../shared/enum/queries.enum';

jest.mock('../../../shared/utils/response.utils');

describe('PrmsOpenSearchController', () => {
  let controller: PrmsOpenSearchController;
  const mockPrmsService = {
    getData: jest.fn(),
    getDataAsStar: jest.fn(),
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
  describe('fetchPrmsDataAsStar', () => {
    const call = (async: TrueFalseEnum) =>
      controller.fetchPrmsDataAsStar(
        '2025',
        'CIAT (Alliance)',
        'policy_change',
        undefined,
        'W3/Bilateral',
        undefined,
        '1,2,3',
        async,
      );

    const expectedParams = {
      year: '2025',
      centerAcronym: 'CIAT (Alliance)',
      resultType: 'policy_change',
      resultCode: undefined,
      source: 'W3/Bilateral',
      fundingType: undefined,
      statusId: '1,2,3',
    };

    it('should be restricted to SYSTEM_ADMIN only', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.fetchPrmsDataAsStar),
      ).toEqual([SecRolesEnum.SYSTEM_ADMIN]);
    });

    it('should pass every query param to getDataAsStar and format the response', async () => {
      mockPrmsService.getDataAsStar.mockResolvedValue(undefined);
      mockFormat.mockReturnValue({ ok: true });

      const result = await call(TrueFalseEnum.FALSE);

      expect(mockPrmsService.getDataAsStar).toHaveBeenCalledWith(
        expectedParams,
      );
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: undefined,
        description: 'Prms data fetched as STAR',
        status: HttpStatus.OK,
      });
      expect(result).toEqual({ ok: true });
    });

    it('should not wait for the import when async is true', async () => {
      mockPrmsService.getDataAsStar.mockReturnValue(new Promise(() => {}));
      mockFormat.mockReturnValue({ async: true });

      const result = await call(TrueFalseEnum.TRUE);

      expect(mockPrmsService.getDataAsStar).toHaveBeenCalledWith(
        expectedParams,
      );
      expect(result).toEqual({ async: true });
    });
  });
});
