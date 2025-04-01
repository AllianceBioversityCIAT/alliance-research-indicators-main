import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
import { PayloadAiRoarDto } from './dto/payload-ai-roar.dto';
import { RootAi } from '../../entities/results/dto/result-ai.dto';

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
    return this.sendToPattern<PayloadAiRoarDto, RootAi>(
      'mining-create',
      payload,
    );
  }

  cleanDataNotProvided<T>(
    data: T,
    parse: 'date' | 'string' | 'number' | 'boolean' | 'any' = 'any',
  ) {
    if (data == 'Not collected') {
      return null;
    }

    switch (parse) {
      case 'date':
        return new Date(data as string);
      case 'string':
        return String(data);
      case 'number':
        return Number(data);
      case 'boolean':
        return Boolean(data);
      default:
        return data;
    }
  }
}
