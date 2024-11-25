import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';

@Global()
@Module({
  providers: [CurrentUserUtil],
  exports: [CurrentUserUtil],
})
export class GlobalUtilsModule {}
