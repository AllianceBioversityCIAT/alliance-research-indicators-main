import { Module } from '@nestjs/common';
import { TipIntegrationConsumer } from './tip-integration.consumer';
import { TipIntegrationService } from './tip-integration.service';

@Module({
  providers: [TipIntegrationService, TipIntegrationConsumer],
})
export class TipIntegrationModule {}
