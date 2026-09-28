// @akili-spec changes/agresso-staff-deactivation (T-07 — R-AGD-011, R-AGD-012)
//
// SINGLETON-SCOPED BY DESIGN.
// Constructor takes DataSource and NOTHING ELSE.
// Do NOT inject the request-scoped config service, CurrentUserUtil, or any
// other REQUEST-scoped provider. That service carries CurrentUserUtil
// (Scope.REQUEST); injecting it would cascade REQUEST scope into the
// fire-and-forget staff sync.
//
// No cache. A TTL here would hide a config save for the length of the window
// (K-016). Every resolve() reads app_config.
import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { AppConfig } from '../../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import {
  DeactivationConfigFailure,
  DeactivationConfigResolution,
} from './dto/deactivation-config.dto';

export { EXTERNAL_STATUS_ID } from './dto/deactivation-config.dto';

const STAFF_DEACTIVATION_CONFIG_KEYS: AppConfigKey[] = [
  AppConfigKey.ARI_STAFF_DEACTIVATION_DRY_RUN,
  AppConfigKey.ARI_STAFF_DEACTIVATION_CEILING_FRACTION,
  AppConfigKey.ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR,
  AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
];

@Injectable()
export class StaffDeactivationConfigResolver {
  private readonly logger = new LoggerUtil({
    name: StaffDeactivationConfigResolver.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  async resolve(): Promise<DeactivationConfigResolution> {
    const byKey = await this.loadByKey();
    const dryRun = this.parseDryRun(
      this.readRaw(byKey.get(AppConfigKey.ARI_STAFF_DEACTIVATION_DRY_RUN)),
    );

    const failures: DeactivationConfigFailure[] = [];
    const ceilingFraction = this.readLoud(
      byKey,
      AppConfigKey.ARI_STAFF_DEACTIVATION_CEILING_FRACTION,
      false,
      'C-3',
      failures,
    );
    const absoluteFloor = this.readLoud(
      byKey,
      AppConfigKey.ARI_STAFF_DEACTIVATION_ABSOLUTE_FLOOR,
      true,
      'C-3',
      failures,
    );
    const externalStatusId = this.readLoud(
      byKey,
      AppConfigKey.ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID,
      true,
      'C-4',
      failures,
    );

    return {
      config: { dryRun, ceilingFraction, absoluteFloor, externalStatusId },
      failures,
    };
  }

  private readLoud(
    byKey: Map<string, AppConfig>,
    key: AppConfigKey,
    integer: boolean,
    abortReason: DeactivationConfigFailure['abortReason'],
    failures: DeactivationConfigFailure[],
  ): number | null {
    const parsed = this.parsePositive(this.readRaw(byKey.get(key)), integer);
    if (parsed == null) {
      // Unreadable. Do not substitute a seed constant — a missing ceiling must
      // not become "no ceiling", and a missing external id must not shield nobody.
      failures.push({ key, abortReason });
      return null;
    }
    return parsed;
  }

  private async loadByKey(): Promise<Map<string, AppConfig>> {
    try {
      const repo = this.dataSource.getRepository(AppConfig);
      const rows = await repo.find({
        where: { key: In(STAFF_DEACTIVATION_CONFIG_KEYS) },
      });
      return new Map(rows.map((row) => [row.key, row]));
    } catch (error) {
      this.logger._warn(
        `Failed to read staff deactivation app_config keys: ${
          (error as Error)?.message ?? error
        }. Dry-run fails safe; ceiling and external status fail loud.`,
      );
      return new Map();
    }
  }

  /** Inactive, blank, or missing rows are unreadable. */
  private readRaw(row: AppConfig | undefined): string | null {
    if (!row) {
      return null;
    }
    const flag = row.is_active as boolean | number | undefined;
    if (flag === false || flag === 0) {
      return null;
    }
    if (row.simple_value == null) {
      return null;
    }
    const trimmed = String(row.simple_value).trim();
    return trimmed === '' ? null : trimmed;
  }

  /**
   * Boolean. Only an explicit `false` disables dry-run. Anything unreadable
   * fails safe to enabled.
   */
  private parseDryRun(raw: string | null): boolean {
    const normalized = raw?.toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
    return true;
  }

  /** Finite and `> 0`. Integers reject a fractional part. Unreadable → null. */
  private parsePositive(raw: string | null, integer: boolean): number | null {
    if (raw == null) {
      return null;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    if (integer && !Number.isInteger(parsed)) {
      return null;
    }
    return parsed;
  }
}
