import { Controller, Get } from '@nestjs/common';
import { NotificationsappService } from './notificationsapp.service';

@Controller()
export class NotificationsappController {
  constructor(private readonly notificationsappService: NotificationsappService) {}

  @Get()
  getHello(): string {
    return this.notificationsappService.getHello();
  }
}
