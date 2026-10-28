import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from './logger.util';

export const DEFAULT_REPORTING_YEAR = 2026;

// @sdd-spec docs/specs/bilateral/annualized-project-mapping — T-02 / R-APM-002, NFR-APM-002
//
// Single definition of the current reporting year. SQL readers embed this
// fragment; ReportingYearResolver only executes it. `key` is reserved, so it
// is backticked. CHAR(9)/CHAR(10)/CHAR(13) are tab, LF and CR. MySQL REGEXP
// `$` also matches before a trailing newline, so CHAR_LENGTH pins "exactly
// four ASCII digits". No `?` and no `:word` (namedPlaceholders).
export const currentReportingYearSql = `IFNULL((SELECT CASE WHEN CHAR_LENGTH(norm) = 4 AND norm REGEXP '^[0-9]{4}$' THEN CAST(norm AS UNSIGNED) ELSE ${DEFAULT_REPORTING_YEAR} END FROM (SELECT TRIM(REPLACE(REPLACE(REPLACE(simple_value, CHAR(9), ' '), CHAR(10), ' '), CHAR(13), ' ')) AS norm FROM app_config WHERE \`key\` = '${AppConfigKey.ARI_PRMS_SYNC}' AND is_active = 1) AS normalized_year), ${DEFAULT_REPORTING_YEAR})`;

// SINGLETON. Constructor takes DataSource and nothing else.
// Do NOT inject AppConfigService, CurrentUserUtil, or any other REQUEST-scoped
// provider. AppConfigService carries CurrentUserUtil (Scope.REQUEST); injecting
// it would cascade REQUEST scope onto every year consumer.
//
// No cache. Each resolve() executes currentReportingYearSql again, so an
// admin save is visible on the next call.
@Injectable()
export class ReportingYearResolver {
  private readonly logger = new LoggerUtil({
    name: ReportingYearResolver.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  async resolve(): Promise<number> {
    let raw: string | null;
    let year: number;
    try {
      const rows: Array<{
        reporting_year: string | number | null;
        raw_value: string | null;
      }> = await this.dataSource.query(
        `SELECT ${currentReportingYearSql} AS reporting_year, (SELECT simple_value FROM app_config WHERE \`key\` = '${AppConfigKey.ARI_PRMS_SYNC}' AND is_active = 1) AS raw_value`,
      );
      const row = rows[0];
      raw = row?.raw_value ?? null;
      const parsed = Number(row?.reporting_year);
      year =
        row?.reporting_year === null ||
        row?.reporting_year === undefined ||
        !Number.isFinite(parsed)
          ? DEFAULT_REPORTING_YEAR
          : parsed;
    } catch (error) {
      this.logger._warn(
        `Unreadable app_config key "${AppConfigKey.ARI_PRMS_SYNC}": ${
          (error as Error)?.message ?? error
        }. Falling back to ${DEFAULT_REPORTING_YEAR}.`,
      );
      return DEFAULT_REPORTING_YEAR;
    }

    if (!isUsableReportingYearRaw(raw)) {
      this.logger._warn(
        `Unusable app_config value for key "${AppConfigKey.ARI_PRMS_SYNC}" raw=${JSON.stringify(
          raw,
        )}. Falling back to ${DEFAULT_REPORTING_YEAR}.`,
      );
    }
    return year;
  }
}

/** Warning gate only. The year returned to callers is the SQL column. */
function isUsableReportingYearRaw(raw: string | null): boolean {
  if (typeof raw !== 'string') {
    return false;
  }
  const normalized = raw.replace(/[\t\r\n]/g, ' ').replace(/^ +| +$/g, '');
  return /^[0-9]{4}$/.test(normalized);
}
