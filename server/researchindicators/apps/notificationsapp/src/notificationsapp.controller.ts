import { Controller } from '@nestjs/common';
import { NotificationsappService } from './notificationsapp.service';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class NotificationsappController {
  constructor(
    private readonly notificationsappService: NotificationsappService,
  ) {}

  @EventPattern('new_notification')
  handleNewEmail(email: any) {
    this.notificationsappService.sendEmail(email);
  }
}
