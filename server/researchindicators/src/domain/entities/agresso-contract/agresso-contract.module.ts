import { Module } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { AgressoContractOpenSearchModule } from '../../tools/open-search/agresso-contract/agresso-contract.opensearch.module';
import { ClarisaLeversModule } from '../../tools/clarisa/entities/clarisa-levers/clarisa-levers.module';
import { ClarisaProjectsModule } from '../../tools/clarisa/projects/clarisa-projects.module';
// @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-01 / design.md §2.1
//
// One-directional import: BilateralProjectMappingModule deliberately does
// NOT import AgressoContractModule (see its own DD-11 comment), so this
// import does not create a module cycle.
import { BilateralProjectMappingModule } from '../bilateral-project-mapping/bilateral-project-mapping.module';

@Module({
  controllers: [AgressoContractController],
  providers: [
    AgressoContractService,
    AgressoContractRepository,
    AlianceManagementApp,
  ],
  imports: [
    ClarisaLeversModule,
    AgressoContractOpenSearchModule,
    ClarisaProjectsModule,
    BilateralProjectMappingModule,
  ],
  exports: [AgressoContractService, AgressoContractRepository],
})
export class AgressoContractModule {}
