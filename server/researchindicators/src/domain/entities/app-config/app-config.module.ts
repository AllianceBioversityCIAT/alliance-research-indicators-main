import { Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { AppSecretsModule } from '../app-secrets/app-secrets.module';
import { AppConfigRepository } from './repositories/app-config.repository';

@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService, AppConfigRepository],
  imports: [AppSecretsModule],
  exports: [AppConfigService, AppConfigRepository],
})
export class AppConfigModule {}
