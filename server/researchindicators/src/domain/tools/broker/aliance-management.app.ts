import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
import { ValidJwtResponse } from '../../shared/global-dto/management-response.dto';
@Injectable()
export class AlianceManagementApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(AlianceManagementApp.name);

  constructor() {
    super(env.ARI_QUEUE_SECONDARY);
  }

  async validJwtToken(token: string): Promise<ValidJwtResponse> {
    return this.sendToPattern<string, ValidJwtResponse>('valid-jwt', token);
  }
}
