import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { ReactRendererService } from './services/react-renderer.service';
import { BilateralProjectMappingModule } from '../domain/entities/bilateral-project-mapping/bilateral-project-mapping.module';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.15
// Imports BilateralProjectMappingModule so AdminService can SSR the
// initial list page for /admin/bilateral-project-mappings.
@Module({
  imports: [BilateralProjectMappingModule],
  controllers: [AdminController],
  providers: [AdminService, ReactRendererService],
})
export class AdminModule {}
