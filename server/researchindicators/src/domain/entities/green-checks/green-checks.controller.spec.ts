import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { GreenChecksController } from './green-checks.controller';
import { GreenChecksService } from './green-checks.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';

jest.mock('../../shared/utils/response.utils');

describe('GreenChecksController', () => {
  let controller: GreenChecksController;
  const mockService = {
    findByResultId: jest.fn(),
    statusManagement: jest.fn(),
    getSubmissionHistory: jest.fn(),
    newReportingCycle: jest.fn(),
    updateChageStatusDate: jest.fn(),
  };
  const mockResultsUtil = {
    resultId: 10,
    resultCode: 'RC1',
    setup: jest.fn().mockResolvedValue(undefined),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GreenChecksController],
      providers: [
        { provide: GreenChecksService, useValue: mockService },
        { provide: ResultsUtil, useValue: mockResultsUtil },
        SetUpInterceptor,
      ],
    }).compile();
    controller = module.get(GreenChecksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findGreenChecksByResultId', async () => {
    const rows = [{ id: 1 }];
    mockService.findByResultId.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.findGreenChecksByResultId();
    expect(mockService.findByResultId).toHaveBeenCalledWith(10);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: rows,
      description: 'Green checks found',
      status: HttpStatus.OK,
    });
  });

  it('submitResult', async () => {
    mockService.statusManagement.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({});
    const body = {} as any;
    await controller.submitResult('c', '4', body);
    expect(mockService.statusManagement).toHaveBeenCalledWith(10, 4, 'c', body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Status changed to ' + ResultStatusEnum[4],
      status: HttpStatus.OK,
    });
  });

  it('findSubmissionHistoryByResultId', async () => {
    mockService.getSubmissionHistory.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findSubmissionHistoryByResultId();
    expect(mockService.getSubmissionHistory).toHaveBeenCalledWith(10);
  });

  it('newReportingCycle', async () => {
    mockService.newReportingCycle.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({});
    await controller.newReportingCycle('2025');
    expect(mockService.newReportingCycle).toHaveBeenCalledWith('RC1', 2025);
  });

  it('changeStatusDate', async () => {
    const updated = { ok: true };
    mockService.updateChageStatusDate.mockResolvedValue(updated);
    mockFormat.mockReturnValue({});
    const d = '2020-01-01T00:00:00.000Z';
    await controller.changeStatusDate('99', d);
    expect(mockService.updateChageStatusDate).toHaveBeenCalledWith(
      10,
      99,
      new Date(d),
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: updated,
      description: 'Status date changed',
      status: HttpStatus.OK,
    });
  });
});
