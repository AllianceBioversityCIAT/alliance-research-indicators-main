import { Module } from '@nestjs/common';
import { NotificationsappController } from './notificationsapp.controller';
import { NotificationsappService } from './notificationsapp.service';

@Module({
  imports: [],
  controllers: [NotificationsappController],
  providers: [NotificationsappService],
})
export class NotificationsappModule {}
