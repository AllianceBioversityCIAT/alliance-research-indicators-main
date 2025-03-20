import { Injectable } from '@nestjs/common';
import { AnnouncementSetting } from '../entities/announcement-setting.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AnnouncementSettingRepository extends Repository<AnnouncementSetting> {
  constructor(dataSource: DataSource) {
    super(AnnouncementSetting, dataSource.createEntityManager());
  }
}
