import { Module } from '@nestjs/common';
import { AppSecretsService } from './app-secrets.service';
import { AppSecretsController } from './app-secrets.controller';
import { AppSecretRepository } from './repositories/app-secret.repository';

@Module({
  controllers: [AppSecretsController],
  providers: [AppSecretsService, AppSecretRepository],
  exports: [AppSecretsService, AppSecretRepository],
})
export class AppSecretsModule {}
