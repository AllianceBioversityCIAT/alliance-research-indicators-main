import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { AppSecretsModule } from '../app-secrets/app-secrets.module';

@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService],
  imports: [AppSecretsModule],
  exports: [AppConfigService],
})
export class AppConfigModule {}
