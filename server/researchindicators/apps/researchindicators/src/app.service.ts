import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    @Inject('NOTIFICATIONS_SERVICE') private clientMail: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello main app!';
  }

  newEmail(email: any) {
    try {
      this.clientMail.emit('new_notification', email);
      return 'Email sent to queue!';
    } catch (error) {
      console.error(error);
    }
  }
}
