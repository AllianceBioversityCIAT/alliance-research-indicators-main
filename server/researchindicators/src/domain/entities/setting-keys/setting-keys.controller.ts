import { Controller } from '@nestjs/common';
import { SettingKeysService } from './setting-keys.service';
import { BaseController } from '../../shared/global-dto/base-controller';

@Controller('setting-keys')
export class SettingKeysController extends BaseController<SettingKeysService> {
  constructor(service: SettingKeysService) {
    super(service, 'Innovation types');
  }
}
