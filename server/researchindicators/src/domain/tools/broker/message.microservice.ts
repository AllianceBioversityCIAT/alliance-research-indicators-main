import { Injectable } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';

@Injectable()
export class MessageMicroservice extends BrokerConnectionBase {
  constructor() {
    super('cgiar_ms_test_mailer_queue');
  }
}
