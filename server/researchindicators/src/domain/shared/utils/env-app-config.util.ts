import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AppConfig as AppConfigEntity } from '../../entities/app-config/entities/app-config.entity';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  AppConfigCategory,
  AppConfigField,
  AppConfigSubcategory,
} from '../../entities/app-config/enum/app-config-catergory.enum';
import { CgiarLogger } from './cgiar-logs/logs.util';

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
}

export enum TypeResponseAppConfig {
  SIMPLE_VALUE,
  JSON_VALUE,
  ALL,
}
