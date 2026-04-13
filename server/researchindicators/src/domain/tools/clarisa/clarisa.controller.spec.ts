import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaController } from './clarisa.controller';
import { ClarisaService } from './clarisa.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SearchToOpenSearchEnum } from './anum/path.enum';
import { LoggerUtil } from '../../shared/utils/logger.util';

jest.mock('../../shared/utils/response.utils');

describe('ClarisaController', () => {
  let controller: ClarisaController;
  const mockService = {
    cloneAllClarisaEntities: jest.fn(),
    searchToOS: jest.fn(),
    partnerRequest: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    jest.spyOn(LoggerUtil.prototype, '_log').mockImplementation(() => undefined);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaController],
      providers: [{ provide: ClarisaService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('runCloneClarisa starts clone and formats response', () => {
    mockFormat.mockReturnValue({ ok: true });
    const out = controller.runCloneClarisa();
    expect(mockService.cloneAllClarisaEntities).toHaveBeenCalled();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
    expect(out).toEqual({ ok: true });
  });

  it('executeCloneNormalEntities', () => {
    mockFormat.mockReturnValue({});
    controller.executeCloneNormalEntities();
    expect(mockService.cloneAllClarisaEntities).toHaveBeenCalled();
  });

  it('openSearch requires query', async () => {
    mockFormat.mockReturnValue({});
    await controller.openSearch(undefined as any, 'CO', SearchToOpenSearchEnum.COUNTRY);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Query is required',
      status: HttpStatus.BAD_REQUEST,
    });
    expect(mockService.searchToOS).not.toHaveBeenCalled();
  });

  it('openSearch delegates to service', async () => {
    const countries = [{ id: 1 }];
    mockService.searchToOS.mockResolvedValue(countries);
    mockFormat.mockReturnValue({});
    await controller.openSearch('Colombia', 'CO', SearchToOpenSearchEnum.COUNTRY);
    expect(mockService.searchToOS).toHaveBeenCalledWith(
      'Colombia',
      'CO',
      SearchToOpenSearchEnum.COUNTRY,
    );
  });

  it('partnerRequest', async () => {
    const dto = { name: 'p' } as any;
    const created = { id: 1 };
    mockService.partnerRequest.mockResolvedValue(created);
    mockFormat.mockReturnValue({});
    await controller.partnerRequest(dto);
    expect(mockService.partnerRequest).toHaveBeenCalledWith(dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Partner request created',
      data: created,
      status: HttpStatus.OK,
    });
  });
});
