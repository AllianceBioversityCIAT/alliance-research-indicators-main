import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
import { PayloadAiRoarDto } from './dto/payload-ai-roar.dto';

@Injectable()
export class AiRoarMiningApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(AiRoarMiningApp.name);
  private authHeaderMs6 = JSON.stringify({
    username: env.ARI_QUEUE_AI_USER,
    password: env.ARI_QUEUE_AI_PASSWORD,
  });
  constructor() {
    super(env.ARI_QUEUE_AI);
  }

  async create(file: Express.Multer.File) {
    const payload: PayloadAiRoarDto = {
      role: 'user',
      tool: 'file_search',
      file: file,
      credentials: this.authHeaderMs6,
    };
    return this.sendToPattern<PayloadAiRoarDto>('mining-create', payload);
  }
}
