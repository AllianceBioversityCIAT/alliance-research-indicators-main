import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from './logger.util';

export const DEFAULT_REPORTING_YEAR = 2026;

// @sdd-spec docs/specs/bilateral/pool-funding-reporting-year — T-01 / R-PRY-001, NFR-PRY-002
//
// SINGLETON. Constructor takes DataSource and nothing else.
// Do NOT inject AppConfigService, CurrentUserUtil, or any other REQUEST-scoped
// provider. AppConfigService carries CurrentUserUtil (Scope.REQUEST); injecting
// it would cascade REQUEST scope onto every year consumer.
//
// No cache (D-2). Each resolve() reads the active ARI_PRMS_SYNC row again, so
// an admin save is visible on the next call.
@Injectable()
export class ReportingYearResolver {
  private readonly logger = new LoggerUtil({
    name: ReportingYearResolver.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  async resolve(): Promise<number> {
    let raw: string | null;
    try {
      const row = await this.dataSource.getRepository(AppConfig).findOne({
        where: {
          key: AppConfigKey.ARI_PRMS_SYNC,
          is_active: true,
        },
      });
      raw = row?.simple_value ?? null;
    } catch (error) {
      this.logger._warn(
        `Unreadable app_config key "${AppConfigKey.ARI_PRMS_SYNC}": ${
          (error as Error)?.message ?? error
        }. Falling back to ${DEFAULT_REPORTING_YEAR}.`,
      );
      return DEFAULT_REPORTING_YEAR;
    }

    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (/^\d{4}$/.test(trimmed)) {
      return Number(trimmed);
    }

    this.logger._warn(
      `Unusable app_config value for key "${AppConfigKey.ARI_PRMS_SYNC}" raw=${JSON.stringify(
        raw,
      )}. Falling back to ${DEFAULT_REPORTING_YEAR}.`,
    );
    return DEFAULT_REPORTING_YEAR;
  }
}
