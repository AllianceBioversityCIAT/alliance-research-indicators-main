import { BadRequestException, Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BILATERAL_PUSH_REQUESTED_PATTERN } from './bilateral-push.constants';
import { BilateralPushService } from './bilateral-push.service';
import {
  BilateralPushQueueResponse,
  BilateralPushRequestedMessage,
} from './dto/bilateral-push.dto';

@Controller()
export class BilateralPushConsumer {
  constructor(private readonly bilateralPushService: BilateralPushService) {}

  @EventPattern(BILATERAL_PUSH_REQUESTED_PATTERN)
  async handlePushRequested(
    @Payload() payload: BilateralPushRequestedMessage | string,
  ): Promise<BilateralPushQueueResponse> {
    return this.bilateralPushService.handlePushRequested(
      this.parsePayload(payload),
    );
  }

  private parsePayload(
    payload: BilateralPushRequestedMessage | string,
  ): BilateralPushRequestedMessage {
    if (typeof payload !== 'string') {
      return payload;
    }

    try {
      return JSON.parse(payload) as BilateralPushRequestedMessage;
    } catch {
      throw new BadRequestException('Invalid bilateral push message payload');
    }
  }
}
