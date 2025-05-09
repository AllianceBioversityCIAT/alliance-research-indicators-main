import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';
import { AppConfig } from './app-config.util';
import { UpdateDataUtil } from './update-data.util';
import { ResultsUtil } from './results.util';

@Global()
@Module({
  providers: [CurrentUserUtil, AppConfig, UpdateDataUtil, ResultsUtil],
  exports: [CurrentUserUtil, AppConfig, UpdateDataUtil, ResultsUtil],
})
export class GlobalUtilsModule {}
