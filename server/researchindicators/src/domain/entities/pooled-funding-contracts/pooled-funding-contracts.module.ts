import { Module } from '@nestjs/common';
import { PooledFundingContractsService } from './pooled-funding-contracts.service';
import { PooledFundingContractsController } from './pooled-funding-contracts.controller';

@Module({
  controllers: [PooledFundingContractsController],
  providers: [PooledFundingContractsService],
})
export class PooledFundingContractsModule {}
