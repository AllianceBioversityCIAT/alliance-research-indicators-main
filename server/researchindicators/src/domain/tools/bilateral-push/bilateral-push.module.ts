import { Module } from '@nestjs/common';
import { BilateralPushConnection } from './bilateral-push.connection';
import { BilateralPushConsumer } from './bilateral-push.consumer';
import { BilateralPushService } from './bilateral-push.service';

@Module({
  controllers: [BilateralPushConsumer],
  providers: [BilateralPushConnection, BilateralPushService],
  exports: [BilateralPushConnection, BilateralPushService],
})
export class BilateralPushModule {}
