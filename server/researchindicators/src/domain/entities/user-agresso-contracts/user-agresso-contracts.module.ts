import { Module } from '@nestjs/common';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { UserAgressoContractsController } from './user-agresso-contracts.controller';
import { AgressoContractRepository } from '../agresso-contract/repositories/agresso-contract.repository';

@Module({
  controllers: [UserAgressoContractsController],
  providers: [UserAgressoContractsService, AgressoContractRepository],
  exports: [UserAgressoContractsService, AgressoContractRepository],
})
export class UserAgressoContractsModule {}
