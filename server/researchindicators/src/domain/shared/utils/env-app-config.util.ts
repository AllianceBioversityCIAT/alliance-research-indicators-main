import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AppConfig as AppConfigEntity } from '../../entities/app-config/entities/app-config.entity';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  AppConfigCategory,
  AppConfigField,
  AppConfigSubcategory,
} from '../../entities/app-config/enum/app-config-catergory.enum';
import { CgiarLogger } from './cgiar-logs/logs.util';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';

@Injectable()
export class EnvAppConfigUtil {
  private readonly repository: Repository<AppConfigEntity>;
  private readonly logger: CgiarLogger = new CgiarLogger('EnvAppConfigUtil');
  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(AppConfigEntity);
  }

  private async getConfig<T = string>(
    configWhere: FindOptionsWhere<AppConfigEntity>,
    type?: TypeResponseAppConfig,
  ): Promise<T> {
    const where: FindOptionsWhere<AppConfigEntity> = new AppConfigEntity();
    where.is_active = true;

    if (configWhere?.key) {
      where.key = configWhere.key;
    }
    if (configWhere?.category) {
      where.category = configWhere.category;
    }
    if (configWhere?.subcategory) {
      where.subcategory = configWhere.subcategory;
    }
    if (configWhere?.field) {
      where.field = configWhere.field;
    }

    const config = await this.repository.findOne({
      where,
    });

    if (!config) {
      this.logger.error(
        'The configuration with the given parameters was not found: ' +
          JSON.stringify(where, null, 2),
      );
      throw new InternalServerErrorException(
        'The configuration with the given parameters was not found',
      );
    }

    return this.formatResponse(config, type);
  }

  private formatResponse<T = string>(
    config: AppConfigEntity,
    type: TypeResponseAppConfig,
  ): T {
    switch (type) {
      case TypeResponseAppConfig.JSON_VALUE:
        return config.json_value as T;
      case TypeResponseAppConfig.ALL:
        return config as T;
      default:
        return config.simple_value as T;
    }
  }

  /**
   * Looks up a config row without throwing and without logging.
   * A missing/inactive row is an ordinary miss (`null`) — the caller
   * decides whether that miss deserves a default, a log, or both.
   * Unlike `getConfig`, this method never raises and never calls the logger,
   * because the absent-row path is the expected resting state of a
   * default-off feature flag, not an application error.
   */
  private async tryGetConfig(
    configWhere: FindOptionsWhere<AppConfigEntity>,
  ): Promise<AppConfigEntity | null> {
    const where: FindOptionsWhere<AppConfigEntity> = new AppConfigEntity();
    where.is_active = true;

    if (configWhere?.key) {
      where.key = configWhere.key;
    }
    if (configWhere?.category) {
      where.category = configWhere.category;
    }
    if (configWhere?.subcategory) {
      where.subcategory = configWhere.subcategory;
    }
    if (configWhere?.field) {
      where.field = configWhere.field;
    }

    return this.repository.findOne({ where });
  }

  private getKey(string: string[]): string {
    return string.join('.');
  }

  /**
   * Get the email list to send the readiness level 7 email
   * @param type - The type of response to return
   * @returns The email list to send the readiness level 7 email
   * @example
   * const to = await this.dbEnv.EMAIL_READINESS_LEVEL_7_TO<string>();
   * generalData.configEmail.to = to.split(',');
   */
  async EMAIL_READINESS_LEVEL_7_TO<T = string>(
    type: TypeResponseAppConfig = TypeResponseAppConfig.SIMPLE_VALUE,
  ): Promise<T> {
    return this.getConfig<T>(
      {
        key: this.getKey([
          AppConfigCategory.EMAIL,
          AppConfigSubcategory.READINESS_LEVEL_7,
          AppConfigField.TO_EMAIL,
        ]),
      },
      type,
    );
  }

  /**
   * Whether the CapDev bulk-upload notification kill switch is enabled.
   * Defaults to `false` (disabled) when the row is absent — an absent
   * config must never be read as "mail everyone" (R-CBU-009, DD-5).
   * Does not throw and does not log; the caller (the notification
   * service) decides whether the `defaulted` marker is worth a warn,
   * because only it holds the batch/process context for that log line.
   * @returns `{ value, defaulted }` — `defaulted` is `true` only when the
   * row was absent, distinguishing "absent" from "present but false".
   */
  async CAPDEV_BULK_UPLOAD_ENABLED(): Promise<{
    value: boolean;
    defaulted: boolean;
  }> {
    const config = await this.tryGetConfig({
      key: this.getKey([
        AppConfigCategory.EMAIL,
        AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
        AppConfigField.ENABLED,
      ]),
    });

    if (!config) {
      return { value: false, defaulted: true };
    }

    return { value: config.simple_value === 'true', defaulted: false };
  }

  /**
   * Whether the CGIAR Portfolio / pool-funding section is open (`POOL_FUNDING.SECTION.ENABLED`),
   * i.e. the bilateral reporting period is running. Same reading as the client's
   * `isFeatureFlagEnabled`: on unless the stored value is `false` (trimmed, any case). An absent
   * row or a failed read counts as on (fail-open, as the client does), so a config problem never
   * locks people out of a section the client shows them; a failed read is logged as a warning so
   * the open is never silent. Read on every call: no cache, so a change in the admin panel takes
   * effect on the next request.
   */
  async POOL_FUNDING_SECTION_ENABLED(): Promise<boolean> {
    try {
      const config = await this.tryGetConfig({
        key: AppConfigKey.POOL_FUNDING_SECTION_ENABLED,
      });
      return config?.simple_value?.trim().toLowerCase() !== 'false';
    } catch (error) {
      this.logger.warn(
        `Could not read ${AppConfigKey.POOL_FUNDING_SECTION_ENABLED}, treating the section as open: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return true;
    }
  }

  /**
   * Additional stakeholders to CC on the CapDev bulk-upload notification.
   * Defaults to `[]` when the row is absent. Stored value is a
   * comma-separated string; entries are trimmed and blanks are dropped so
   * an empty/blank stored value yields `[]` rather than `['']`.
   * Does not throw and does not log — see `CAPDEV_BULK_UPLOAD_ENABLED`.
   * @returns `{ value, defaulted} ` — `defaulted` distinguishes an absent
   * row from a present-but-empty one (both yield `value: []`).
   */
  async CAPDEV_BULK_UPLOAD_CC_EMAIL(): Promise<{
    value: string[];
    defaulted: boolean;
  }> {
    const config = await this.tryGetConfig({
      key: this.getKey([
        AppConfigCategory.EMAIL,
        AppConfigSubcategory.CAPDEV_BULK_UPLOAD,
        AppConfigField.CC_EMAIL,
      ]),
    });

    if (!config) {
      return { value: [], defaulted: true };
    }

    const value = (config.simple_value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    return { value, defaulted: false };
  }
}

export enum TypeResponseAppConfig {
  SIMPLE_VALUE,
  JSON_VALUE,
  ALL,
}
