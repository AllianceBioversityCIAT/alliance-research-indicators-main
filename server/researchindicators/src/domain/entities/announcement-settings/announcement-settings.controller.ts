import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AnnouncementSettingsService } from './announcement-settings.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Announcement Settings')
@Controller()
@ApiBearerAuth()
export class AnnouncementSettingsController {
  constructor(
    private readonly announcementSettingsService: AnnouncementSettingsService,
  ) {}

  @Get('available')
  async getAvailableAnnouncements() {
    return this.announcementSettingsService
      .getAvailableAnnouncements()
      .then((data) =>
        ResponseUtils.format({
          description: 'Get available announcements',
          data,
          status: HttpStatus.OK,
        }),
      );
  }
}
