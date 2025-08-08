import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { SettingKey } from './entities/setting-key.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class SettingKeysService extends ControlListBaseService<
  SettingKey,
  Repository<SettingKey>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(SettingKey, dataSource.getRepository(SettingKey), currentUser, 'key');
  }
}
