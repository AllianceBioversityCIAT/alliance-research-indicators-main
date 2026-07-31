import { Module } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { IndicatorMetadataReportsRepository } from './repositories/indicator-metadata-reports.repository';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { AgressoContractOpenSearchModule } from '../../tools/open-search/agresso-contract/agresso-contract.opensearch.module';
import { ClarisaLeversModule } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.module';

@Module({
  controllers: [AgressoContractController],
  providers: [
    AgressoContractService,
    AgressoContractRepository,
    IndicatorMetadataReportsRepository,
    AlianceManagementApp,
  ],
  imports: [ClarisaLeversModule, AgressoContractOpenSearchModule],
  exports: [AgressoContractService, AgressoContractRepository],
})
export class AgressoContractModule {}
