import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementSettingDto } from './create-announcement-setting.dto';

export class UpdateAnnouncementSettingDto extends PartialType(
  CreateAnnouncementSettingDto,
) {}
