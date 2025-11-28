import { Controller } from '@nestjs/common';
import { PooledFundingContractsService } from './pooled-funding-contracts.service';

@Controller('pooled-funding-contracts')
export class PooledFundingContractsController {
  constructor(
    private readonly pooledFundingContractsService: PooledFundingContractsService,
  ) {}
}
