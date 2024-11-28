import { Module } from '@nestjs/common';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { UserAgressoContractsController } from './user-agresso-contracts.controller';
import { AgressoContractRepository } from '../agresso-contract/repositories/agresso-contract.repository';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';

@Module({
  controllers: [UserAgressoContractsController],
  providers: [
    UserAgressoContractsService,
    AgressoContractRepository,
    AlianceManagementApp,
  ],
  exports: [UserAgressoContractsService, AgressoContractRepository],
})
export class UserAgressoContractsModule {}
