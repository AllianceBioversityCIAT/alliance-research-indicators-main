import { Module } from '@nestjs/common';
import { TipIntegrationController } from './tip-integration.controller';
import { TipIntegrationService } from './tip-integration.service';
import { ResultsModule } from '../../entities/results/results.module';
import { ResultCapSharingIpModule } from '../../entities/result-cap-sharing-ip/result-cap-sharing-ip.module';
import { ResultUsersModule } from '../../entities/result-users/result-users.module';

@Module({
  imports: [ResultsModule, ResultCapSharingIpModule, ResultUsersModule],
  controllers: [TipIntegrationController],
  providers: [TipIntegrationService],
})
export class TipIntegrationModule {}
