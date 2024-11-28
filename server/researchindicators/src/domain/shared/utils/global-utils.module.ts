import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';
import { AppConfig } from './app-config.util';

@Global()
@Module({
  providers: [CurrentUserUtil, AppConfig],
  exports: [CurrentUserUtil, AppConfig],
})
export class GlobalUtilsModule {}
