import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultEvidencesController } from './result-evidences.controller';
import { ResultEvidencesService } from './result-evidences.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('ResultEvidencesController', () => {
  let controller: ResultEvidencesController;
  const mockService = {
    updateResultEvidences: jest.fn(),
    find: jest.fn(),
    findPrincipalEvidence: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultEvidencesController],
      providers: [
        { provide: ResultEvidencesService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: {
            resultId: 99,
            setup: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ResultEvidencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateResultEvidences', async () => {
    const dto = { evidences: [] } as any;
    const updated = [];
    mockService.updateResultEvidences.mockResolvedValue(updated);
    mockFormat.mockReturnValue({});
    await controller.updateResultEvidences(dto);
    expect(mockService.updateResultEvidences).toHaveBeenCalledWith(99, dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Result evidences updated',
      status: HttpStatus.OK,
      data: updated,
    });
  });

  it('getEvidences', async () => {
    const found = [];
    mockService.find.mockResolvedValue(found);
    mockFormat.mockReturnValue({});
    await controller.getEvidences(undefined as any);
    expect(mockService.find).toHaveBeenCalledWith(99, undefined);
  });

  it('getPrincipalEvidence', async () => {
    const principal = {};
    mockService.findPrincipalEvidence.mockResolvedValue(principal);
    mockFormat.mockReturnValue({});
    await controller.getPrincipalEvidence();
    expect(mockService.findPrincipalEvidence).toHaveBeenCalledWith(99);
  });
});
