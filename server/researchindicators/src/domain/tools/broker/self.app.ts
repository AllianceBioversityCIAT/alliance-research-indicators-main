import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { AppConfig } from '../../shared/utils/app-config.util';
@Injectable()
export class SelfApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(SelfApp.name);

  constructor(appConfig: AppConfig) {
    super(appConfig.ARI_QUEUE);
  }

  executeCloneNormalEntities(): void {
    this.emitToPattern('clone-normal-entities', {});
  }

  executeTipCloneKnowledgeProducts(years: number[]): void {
    this.emitToPattern('tip-clone-knowledge-products', { years });
  }
}
