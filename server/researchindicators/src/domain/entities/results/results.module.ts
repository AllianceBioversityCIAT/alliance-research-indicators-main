import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { ResultRepository } from './repositories/result.repository';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { ResultContractsRepository } from '../result-contracts/repositories/result-contracts.repository';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { ResultLeversRepository } from '../result-levers/repositories/result-levers.repository';

@Module({
  controllers: [ResultsController],
  providers: [
    ResultsService,
    ResultRepository,
    UserService,
    ResultContractsService,
    ResultContractsRepository,
    ResultLeversService,
    ResultLeversRepository,
  ],
  exports: [ResultsService, ResultRepository],
})
export class ResultsModule {}
