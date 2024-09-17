import { Module } from '@nestjs/common';
import { ResultContractsService } from './result-contracts.service';
import { ResultContractsController } from './result-contracts.controller';
import { ResultContractsRepository } from './repositories/result-contracts.repository';

@Module({
  controllers: [ResultContractsController],
  providers: [ResultContractsService, ResultContractsRepository],
})
export class ResultContractsModule {}
