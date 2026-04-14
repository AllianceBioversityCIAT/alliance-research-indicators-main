import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultInstitutionsController } from './result-institutions.controller';
import { ResultInstitutionsService } from './result-institutions.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultInstitutionsController', () => {
  let controller: ResultInstitutionsController;
  const mockService = {
    updatePartners: jest.fn(),
    findAll: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInstitutionsController],
      providers: [
        { provide: ResultInstitutionsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 8,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultInstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateResultInstitutions', async () => {
    const dto = { partners: [] } as any;
    const out = [];
    mockService.updatePartners.mockResolvedValue(out);
    mockFormat.mockReturnValue({});
    await controller.updateResultInstitutions(dto);
    expect(mockService.updatePartners).toHaveBeenCalledWith(8, dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result institutions updated',
      status: HttpStatus.OK,
      data: out,
    });
  });

  it('getInstitutions', async () => {
    const role = 'PRIMARY' as any;
    const rows = [];
    mockService.findAll.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.getInstitutions(role);
    expect(mockService.findAll).toHaveBeenCalled();
  });
});
