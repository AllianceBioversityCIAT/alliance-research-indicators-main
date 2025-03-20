import { Module } from '@nestjs/common';
import { AnnouncementSettingsService } from './announcement-settings.service';
import { AnnouncementSettingsController } from './announcement-settings.controller';
import { AnnouncementSettingRepository } from './repositories/announcement-setting.repository';

@Module({
  controllers: [AnnouncementSettingsController],
  providers: [AnnouncementSettingsService, AnnouncementSettingRepository],
  exports: [AnnouncementSettingsService],
})
export class AnnouncementSettingsModule {}
