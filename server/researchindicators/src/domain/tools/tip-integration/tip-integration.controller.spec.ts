import { Test, TestingModule } from '@nestjs/testing';
import { mockPortfolioUtilProvider } from '../../shared/testing/mock-portfolio.util';
import { ConflictException, HttpStatus } from '@nestjs/common';
import { TipIntegrationController } from './tip-integration.controller';
import { TipIntegrationService } from './tip-integration.service';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';

jest.mock('../../shared/utils/response.utils');

// Jest's vm `process` never receives Node's unhandledRejection, so a process
// listener cannot fail an assertion (Jest records the rejection itself).
// Shadow `.catch` on the promise handed to the controller: if the controller
// does not attach one, the rejection is recorded here and still handled, so
// removing the controller `.catch` turns `expect(missed)` red.
function rejectUnlessCaught(
  reason: unknown,
  missed: unknown[],
): Promise<never> {
  const promise = Promise.reject(reason);
  let caughtByCaller = false;
  const catchRejection = promise.catch.bind(promise);
  promise.catch = ((onRejected) => {
    caughtByCaller = true;
    return catchRejection(onRejected);
  }) as Promise<never>['catch'];
  void catchRejection((rejected: unknown) => {
    if (!caughtByCaller) {
      missed.push(rejected);
    }
  });
  return promise;
}

async function flushRejectionTurn(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('TipIntegrationController', () => {
  let controller: TipIntegrationController;
  const mockService = {
    getAllIprData: jest.fn(),
    getKnowledgeProductsByYear: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipIntegrationController],
      providers: [
        { provide: TipIntegrationService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
        mockPortfolioUtilProvider,
      ],
    }).compile();
    controller = module.get(TipIntegrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('handleGetIprData', async () => {
    const rows = [];
    mockService.getAllIprData.mockResolvedValue(rows);
    await expect(controller.handleGetIprData()).resolves.toBe(rows);
  });

  it('handleTipCloneKnowledgeProducts syncs without year filter', async () => {
    mockService.getKnowledgeProductsByYear.mockResolvedValue(undefined);
    await controller.handleTipCloneKnowledgeProducts();
    expect(mockService.getKnowledgeProductsByYear).toHaveBeenCalledWith();
  });

  it('getIprDataRest', async () => {
    const data = [];
    mockService.getAllIprData.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.getIprDataRest(2025, undefined);
    expect(mockService.getAllIprData).toHaveBeenCalledWith({
      year: 2025,
      productType: undefined,
    });
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'IPR data found successfully',
      status: HttpStatus.OK,
      data,
    });
  });

  it('syncIprData waits for the sync when async is false', async () => {
    const synced = [];
    mockService.getKnowledgeProductsByYear.mockResolvedValue(synced);
    mockFormat.mockReturnValue({});
    await controller.syncIprData('2026', TrueFalseEnum.FALSE);
    expect(mockService.getKnowledgeProductsByYear).toHaveBeenCalledWith(2026);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'IPR data synced successfully',
      status: HttpStatus.OK,
      data: synced,
    });
  });

  it('syncIprData passes undefined when year is not provided', async () => {
    mockService.getKnowledgeProductsByYear.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.syncIprData(undefined, TrueFalseEnum.FALSE);
    expect(mockService.getKnowledgeProductsByYear).toHaveBeenCalledWith(
      undefined,
    );
  });

  it('syncIprData returns immediately when async is true', async () => {
    mockService.getKnowledgeProductsByYear.mockResolvedValue(undefined);
    mockFormat.mockReturnValue({ status: HttpStatus.OK });
    const result = await controller.syncIprData('2025', TrueFalseEnum.TRUE);
    expect(mockService.getKnowledgeProductsByYear).toHaveBeenCalledWith(2025);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: 'IPR data synced asynchronously',
      description: 'IPR data synced asynchronously',
      status: HttpStatus.OK,
    });
    expect(result).toEqual({ status: HttpStatus.OK });
  });

  it('syncIprData logs warn when an async ConflictException is rejected', async () => {
    const conflict = new ConflictException('TIP sync already in progress');
    const missed: unknown[] = [];
    mockService.getKnowledgeProductsByYear.mockImplementation(() =>
      rejectUnlessCaught(conflict, missed),
    );
    mockFormat.mockReturnValue({ status: HttpStatus.OK });
    const logger = (controller as unknown as { logger: LoggerUtil }).logger;
    const warnSpy = jest.spyOn(logger, 'warn');
    const errorSpy = jest.spyOn(logger, 'error');
    try {
      const result = await controller.syncIprData('2025', TrueFalseEnum.TRUE);
      await flushRejectionTurn();
      expect(missed).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith('TIP sync already in progress');
      expect(errorSpy).not.toHaveBeenCalled();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: 'IPR data synced asynchronously',
        description: 'IPR data synced asynchronously',
        status: HttpStatus.OK,
      });
      expect(result).toEqual({ status: HttpStatus.OK });
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('syncIprData logs error when an async sync rejects with another error', async () => {
    const failure = new Error('sync blew up');
    const missed: unknown[] = [];
    mockService.getKnowledgeProductsByYear.mockImplementation(() =>
      rejectUnlessCaught(failure, missed),
    );
    mockFormat.mockReturnValue({ status: HttpStatus.OK });
    const logger = (controller as unknown as { logger: LoggerUtil }).logger;
    const warnSpy = jest.spyOn(logger, 'warn');
    const errorSpy = jest.spyOn(logger, 'error');
    try {
      const result = await controller.syncIprData('2025', TrueFalseEnum.TRUE);
      await flushRejectionTurn();
      expect(missed).toEqual([]);
      expect(errorSpy).toHaveBeenCalledWith('sync blew up', failure.stack);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ status: HttpStatus.OK });
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('syncIprData async=false lets a ConflictException reach the caller', async () => {
    const conflict = new ConflictException('TIP sync already in progress');
    mockService.getKnowledgeProductsByYear.mockRejectedValue(conflict);
    await expect(
      controller.syncIprData('2026', TrueFalseEnum.FALSE),
    ).rejects.toBe(conflict);
    expect(conflict.getStatus()).toBe(HttpStatus.CONFLICT);
  });
});
