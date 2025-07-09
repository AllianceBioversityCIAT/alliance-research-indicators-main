import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppConfig } from './entities/app-config.entity';
import {
  cleanObject,
  isEmpty,
  validObject,
} from '../../shared/utils/object.utils';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class AppConfigService {
  private readonly mainRepo: Repository<AppConfig>;
  constructor(private readonly dataSource: DataSource) {
    this.mainRepo = this.dataSource.getRepository(AppConfig);
  }

  async findConfigByKey(key: string): Promise<AppConfig> {
    return this.mainRepo.findOne({
      where: { key, is_active: true },
    });
  }

  async updateConfig(key: string, updateData: Partial<AppConfig>) {
    const config = await this.mainRepo.findOne({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException(`Config with key ${key} not found`);
    }

    const objToUpdate = cleanObject(updateData);
    const update: QueryDeepPartialEntity<AppConfig> = {};

    if (!isEmpty(objToUpdate?.description)) {
      update.description = objToUpdate.description;
    }

    if (!isEmpty(objToUpdate?.simple_value)) {
      update.simple_value = objToUpdate.simple_value;
    }

    if (!isEmpty(objToUpdate?.json_value)) {
      update.json_value = objToUpdate.json_value;
    }

    await this.mainRepo.update(config.key, update);

    return { ...config, ...update };
  }
}
