import { Injectable } from '@nestjs/common';
import { AnnouncementSettingRepository } from './repositories/announcement-setting.repository';

@Injectable()
export class AnnouncementSettingsService {
  constructor(private readonly mainRepo: AnnouncementSettingRepository) {}

  async getAvailableAnnouncements() {
    return this.mainRepo.find({
      where: {
        is_active: true,
      },
    });
  }
}
