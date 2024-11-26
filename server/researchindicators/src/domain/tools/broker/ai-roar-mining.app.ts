import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
import { PayloadAiRoarDto } from './dto/payload-ai-roar.dto';

@Injectable()
export class AiRoarMiningApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(AiRoarMiningApp.name);
  constructor() {
    super(env.ARI_QUEUE_AI);
  }

  async create(file: Express.Multer.File) {
    const payload: PayloadAiRoarDto = {
      role: 'user',
      tool: 'file_search',
      file: file,
    };
    return this.sendToPattern<PayloadAiRoarDto>('mining-create', payload);
  }
}
