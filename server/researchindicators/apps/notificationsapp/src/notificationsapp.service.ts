import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsappService {
  getHello(): string {
    return 'Hello World!';
  }
}
