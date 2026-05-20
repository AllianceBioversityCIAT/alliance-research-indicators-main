import { Injectable, NotImplementedException } from '@nestjs/common';
import { ENV } from '../../shared/utils/env.utils';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  BilateralPushQueueResponse,
  BilateralPushRequestedMessage,
} from './dto/bilateral-push.dto';

@Injectable()
export class BilateralPushService {
  private readonly logger = new LoggerUtil({ name: BilateralPushService.name });

  async handlePushRequested(
    message: BilateralPushRequestedMessage,
  ): Promise<BilateralPushQueueResponse> {
    if (!ENV.BILATERAL_PUSH_ENABLED) {
      this.logger._warn(
        `Skipped bilateral push for result ${message?.result_code}: feature flag disabled`,
      );
      return {
        status: 'skipped',
        description: 'Bilateral push feature flag is disabled',
      };
    }

    return this.execute(message);
  }

  async execute(
    _message: BilateralPushRequestedMessage,
  ): Promise<BilateralPushQueueResponse> {
    throw new NotImplementedException(
      'Bilateral push execution is deferred until T-26',
    );
  }
}
