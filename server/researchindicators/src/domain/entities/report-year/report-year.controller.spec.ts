import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ReportYearController } from './report-year.controller';
import { ReportYearService } from './report-year.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';

jest.mock('../../shared/utils/response.utils');

describe('ReportYearController', () => {
  let controller: ReportYearController;
  const mockService = { getReportYear: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportYearController],
      providers: [
        { provide: ReportYearService, useValue: mockService },
        SetUpInterceptor,
        { provide: ResultsUtil, useValue: { setup: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    controller = module.get(ReportYearController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getReportYear', async () => {
    const years = [2024];
    mockService.getReportYear.mockResolvedValue(years);
    mockFormat.mockReturnValue({});
    await controller.getReportYear();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: years,
      description: 'Report year list',
      status: HttpStatus.OK,
    });
  });
});
