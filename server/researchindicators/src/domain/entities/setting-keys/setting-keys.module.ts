import { Module } from '@nestjs/common';
import { SettingKeysService } from './setting-keys.service';
import { SettingKeysController } from './setting-keys.controller';

@Module({
  controllers: [SettingKeysController],
  providers: [SettingKeysService],
})
export class SettingKeysModule {}
