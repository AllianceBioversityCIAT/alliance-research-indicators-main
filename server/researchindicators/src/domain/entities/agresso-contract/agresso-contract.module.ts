import { Module } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { AgressoContractOpenSearchModule } from '../../tools/open-search/agresso-contract/agresso-contract.opensearch.module';

@Module({
  controllers: [AgressoContractController],
  providers: [
    AgressoContractService,
    AgressoContractRepository,
    AlianceManagementApp,
  ],
  exports: [AgressoContractService, AgressoContractRepository],
  imports: [AgressoContractOpenSearchModule],
})
export class AgressoContractModule {}
