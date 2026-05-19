import { Injectable, NotImplementedException } from '@nestjs/common';
import { BilateralPushConnectionResponse } from './dto/bilateral-push.dto';

@Injectable()
export class BilateralPushConnection {
  async send(
    _payload: unknown,
    _idempotencyKey: string,
  ): Promise<BilateralPushConnectionResponse> {
    throw new NotImplementedException(
      'Bilateral PRMS push connection is deferred until T-21/T-23 decisions are resolved',
    );
  }
}
