import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SelfApp } from '../broker/self.app';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';

@Injectable()
export class TipCron {
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: TipCron.name,
  });
  constructor(
    private readonly _selfApp: SelfApp,
    private readonly _reportingYearResolver: ReportingYearResolver,
  ) {
    this.logger._verbose('TipCron initialized');
  }

  @Cron('0 0 * * 0') // Every Sunday at midnight
  cloneNormalEntities(): void {
    this._selfApp.executeTipCloneKnowledgeProducts();
  }

  @Cron('0 0 * * 1-6') // Monday-Saturday at midnight
  async cloneReportingYearKnowledgeProducts(): Promise<void> {
    try {
      const year = await this._reportingYearResolver.resolve();
      this.logger._log(
        `Cloning TIP knowledge products for reporting year ${year}`,
      );
      this._selfApp.executeTipCloneKnowledgeProducts(year);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger._error(
        `Failed to clone TIP knowledge products for the reporting year: ${detail}`,
      );
    }
  }
}
