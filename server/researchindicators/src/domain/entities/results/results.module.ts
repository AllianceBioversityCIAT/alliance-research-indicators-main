import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { ResultKeywordsModule } from '../result-keywords/result-keywords.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { ResultContractsModule } from '../result-contracts/result-contracts.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultCapacitySharingModule } from '../result-capacity-sharing/result-capacity-sharing.module';

@Module({
  controllers: [ResultsController],
  imports: [
    ResultKeywordsModule,
    ResultLeversModule,
    ResultContractsModule,
    ResultKeywordsModule,
    ResultUsersModule,
    ResultCapacitySharingModule,
  ],
  providers: [ResultsService, ResultRepository, UserService],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}
