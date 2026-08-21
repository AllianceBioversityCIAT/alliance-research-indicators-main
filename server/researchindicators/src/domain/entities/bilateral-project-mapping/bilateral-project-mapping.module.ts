import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { AutomapperService } from './automapper.service';
import { AutomapperController } from './automapper.controller';
import { ClarisaProjectsModule } from '../../tools/clarisa/projects/clarisa-projects.module';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 (shell) / T-15.14 (CRUD)
// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 (coverage wiring)
// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 (automapper wiring),
// T-05 (AutomapperController wiring)
//
// All providers are SINGLETON-scoped — no CurrentUserUtil / ResultsUtil
// injection — per parent design.md §3.4 Constraint A and §12 DD-11.
// User identity flows from the controller via @Req().
// Do NOT import AgressoContractModule or provide AgressoContractRepository (DD-11).
//
// ⚠️ CONTROLLER ORDER MATTERS (T-05 Finding 3). AutomapperController owns
// `GET coverage`; BilateralProjectMappingController owns `GET :id`. Nest
// registers each controller's routes onto the underlying Express router in
// the order listed below, and Express matches in registration order — not
// by specificity. AutomapperController MUST come first, or a request to
// .../coverage matches `:id` first and ParseIntPipe rejects the literal
// string "coverage". See automapper.controller.ts's header for the full
// rationale and bilateral-project-mapping.controller.ts's own
// `coverage-report` vs `:id` comment — this module now carries the same
// hazard twice, deliberately guarded both times.
@Module({
  imports: [
    TypeOrmModule.forFeature([BilateralProjectMapping]),
    ClarisaProjectsModule,
  ],
  controllers: [AutomapperController, BilateralProjectMappingController],
  providers: [
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
    BilateralMappingCoverageService,
    AutomapperService,
  ],
  exports: [
    TypeOrmModule,
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
    BilateralMappingCoverageService,
    AutomapperService,
  ],
})
export class BilateralProjectMappingModule {}
