import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';
import { ResultKeywordsModule } from '../result-keywords/result-keywords.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { ResultContractsModule } from '../result-contracts/result-contracts.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';
import { ResultPolicyChangeModule } from '../result-policy-change/result-policy-change.module';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';

@Module({
  controllers: [ResultsController],
  imports: [
    ResultKeywordsModule,
    ResultLeversModule,
    ResultContractsModule,
    ResultKeywordsModule,
    ResultUsersModule,
    ResultCapacitySharingModule,
    ResultPolicyChangeModule,
  ],
  providers: [
    ResultsService,
    ResultRepository,
    AiRoarMiningApp,
    AlianceManagementApp,
  ],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}
