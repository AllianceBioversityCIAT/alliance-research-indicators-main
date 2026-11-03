import { TipCron } from './tip.cron';
import { SelfApp } from '../broker/self.app';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { LoggerUtil } from '../../shared/utils/logger.util';

describe('TipCron', () => {
  const executeTipCloneKnowledgeProducts = jest.fn();
  const resolve = jest.fn();
  let cron: TipCron;
  let logger: LoggerUtil;

  beforeEach(() => {
    executeTipCloneKnowledgeProducts.mockReset();
    resolve.mockReset();
    cron = new TipCron(
      {
        executeTipCloneKnowledgeProducts,
      } as unknown as SelfApp,
      { resolve } as unknown as ReportingYearResolver,
    );
    logger = (cron as unknown as { logger: LoggerUtil }).logger;
  });

  it('keeps the full clone on Sunday at midnight', () => {
    expect(
      Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        TipCron.prototype.cloneNormalEntities,
      ),
    ).toEqual(expect.objectContaining({ cronTime: '0 0 * * 0' }));
  });

  it('runs the reporting-year clone Monday through Saturday at midnight', () => {
    expect(
      Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        TipCron.prototype.cloneReportingYearKnowledgeProducts,
      ),
    ).toEqual(expect.objectContaining({ cronTime: '0 0 * * 1-6' }));
  });

  it('weekly clone calls execute with no year', () => {
    cron.cloneNormalEntities();
    expect(executeTipCloneKnowledgeProducts).toHaveBeenCalledTimes(1);
    expect(executeTipCloneKnowledgeProducts).toHaveBeenCalledWith();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('daily clone resolves the reporting year and clones only that year', async () => {
    resolve.mockResolvedValue(2026);
    const logSpy = jest
      .spyOn(logger, '_log')
      .mockImplementation(() => undefined);

    await cron.cloneReportingYearKnowledgeProducts();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(executeTipCloneKnowledgeProducts).toHaveBeenCalledTimes(1);
    expect(executeTipCloneKnowledgeProducts).toHaveBeenCalledWith(2026);
    expect(logSpy).toHaveBeenCalledWith(
      'Cloning TIP knowledge products for reporting year 2026',
    );
  });

  it('does not throw when the reporting year resolver fails', async () => {
    resolve.mockRejectedValue(new Error('db down'));
    const errorSpy = jest
      .spyOn(logger, '_error')
      .mockImplementation(() => undefined);

    await expect(
      cron.cloneReportingYearKnowledgeProducts(),
    ).resolves.toBeUndefined();

    expect(executeTipCloneKnowledgeProducts).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });
});
