import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppConfig } from './entities/app-config.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { UpdateAppConfigDto } from './dtos/update-app-config.dto';
import {
  AppConfigFindAllResult,
  AppConfigRepository,
} from './repositories/app-config.repository';
import { AppConfigSorting } from './enum/app-config-forting.enum';
import { AppConfigKey } from './enum/app-config-key.enum';
import { AppConfigTypesDto } from './dtos/app-config-types.dto';

@Injectable()
export class AppConfigService {
  private readonly mainRepo: Repository<AppConfig>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUserUtil: CurrentUserUtil,
    private readonly appConfigRepository: AppConfigRepository,
  ) {
    this.mainRepo = this.dataSource.getRepository(AppConfig);
  }

  async findConfigByKey(key: string): Promise<AppConfig> {
    return this.mainRepo.findOne({
      where: { key, is_active: true },
    });
  }

  async updateConfig(key: string, updateData: UpdateAppConfigDto) {
    const config = await this.mainRepo.findOne({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException(`Config with key ${key} not found`);
    }

    const update: QueryDeepPartialEntity<AppConfig> = {
      simple_value: updateData?.simple_value,
      json_value: updateData?.json_value,
      description: updateData?.description,
      category: updateData?.category,
      subcategory: updateData?.subcategory,
      ...this.currentUserUtil.audit(SetAuditEnum.UPDATE),
    };

    await this.mainRepo.update(config.key, update);

    return { ...config, ...update };
  }

  async getAllConfigs(
    filters: { category?: string; subcategory?: string },
    sorting?: { field?: AppConfigSorting; order?: 'ASC' | 'DESC' },
    pagination?: { page?: number; limit?: number },
    search?: string,
  ): Promise<AppConfigFindAllResult> {
    return this.appConfigRepository.findAll(
      filters,
      sorting ?? {},
      pagination,
      search,
    );
  }

  async getCategoriesAndSubcategories(): Promise<{
    categories: string[];
    subcategories: string[];
  }> {
    return this.appConfigRepository.findAllCategoriesAndSubcategories();
  }

  async getEnv<T = unknown>(key: AppConfigKey): Promise<AppConfigTypesDto<T>> {
    const config = await this.findConfigByKey(key);
    if (!config) {
      throw new NotFoundException(`Config with key ${key} not found`);
    }

    return new AppConfigTypesDto<T>(config);
  }
}
