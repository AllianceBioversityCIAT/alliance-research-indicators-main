import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { ClarisaProjectsModule } from '../../tools/clarisa/projects/clarisa-projects.module';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 (shell) / T-15.14 (CRUD)
// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 (coverage wiring)
//
// All providers are SINGLETON-scoped — no CurrentUserUtil / ResultsUtil
// injection — per parent design.md §3.4 Constraint A and §12 DD-11.
// User identity flows from the controller via @Req().
// Do NOT import AgressoContractModule or provide AgressoContractRepository (DD-11).
@Module({
  imports: [
    TypeOrmModule.forFeature([BilateralProjectMapping]),
    ClarisaProjectsModule,
  ],
  controllers: [BilateralProjectMappingController],
  providers: [
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
    BilateralMappingCoverageService,
  ],
  exports: [
    TypeOrmModule,
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
    BilateralMappingCoverageService,
  ],
})
export class BilateralProjectMappingModule {}
