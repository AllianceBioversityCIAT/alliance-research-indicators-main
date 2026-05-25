import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { BilateralProjectMappingRepository } from './repositories/bilateral-project-mapping.repository';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 (shell)
//
// Module is intentionally minimal at T-15.13: only registers the entity +
// repository so downstream modules (T-15.11 / T-15.14) can inject the
// repository. The service + controller arrive in T-15.14.
@Module({
  imports: [TypeOrmModule.forFeature([BilateralProjectMapping])],
  providers: [BilateralProjectMappingRepository],
  exports: [TypeOrmModule, BilateralProjectMappingRepository],
})
export class BilateralProjectMappingModule {}
