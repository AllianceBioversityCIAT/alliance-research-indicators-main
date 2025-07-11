import { Module } from '@nestjs/common';
import { TipIntegrationController } from './tip-integration.controller';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsModule } from '../../entities/results/results.module';

@Module({
  imports: [ResultsModule],
  controllers: [TipIntegrationController],
  providers: [TipIntegrationService],
})
export class TipIntegrationModule {}
