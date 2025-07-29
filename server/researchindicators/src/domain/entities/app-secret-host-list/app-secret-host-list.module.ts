import { Module } from '@nestjs/common';
import { AppSecretHostListService } from './app-secret-host-list.service';
import { AppSecretHostListController } from './app-secret-host-list.controller';

@Module({
  controllers: [AppSecretHostListController],
  providers: [AppSecretHostListService],
})
export class AppSecretHostListModule {}
