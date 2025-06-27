import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TipIntegrationService } from './tip-integration.service';
import { TipIprDataDto } from './dto/tip-ipr-data.dto';

@Controller()
export class TipIntegrationConsumer {
  constructor(private readonly tipIntegrationService: TipIntegrationService) {}

  @MessagePattern('tip.get-ipr-data')
  async handleGetIprData(): Promise<TipIprDataDto[]> {
    return this.tipIntegrationService.getAllIprData();
  }
}
