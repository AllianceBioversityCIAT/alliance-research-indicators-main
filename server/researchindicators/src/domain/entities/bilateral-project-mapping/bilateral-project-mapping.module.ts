import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 (shell) / T-15.14 (CRUD)
//
// All providers are SINGLETON-scoped — no CurrentUserUtil / ResultsUtil
// injection — per parent design.md §3.4 Constraint A. User identity flows
// from the controller via @Req().
@Module({
  imports: [TypeOrmModule.forFeature([BilateralProjectMapping])],
  controllers: [BilateralProjectMappingController],
  providers: [
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
  ],
  exports: [
    TypeOrmModule,
    BilateralProjectMappingService,
    BilateralProjectMappingRepository,
  ],
})
export class BilateralProjectMappingModule {}
