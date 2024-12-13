import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';
import { AppConfig } from './app-config.util';
import { UpdateDataUtil } from './update-data.util';

@Global()
@Module({
  providers: [CurrentUserUtil, AppConfig, UpdateDataUtil],
  exports: [CurrentUserUtil, AppConfig, UpdateDataUtil],
})
export class GlobalUtilsModule {}
