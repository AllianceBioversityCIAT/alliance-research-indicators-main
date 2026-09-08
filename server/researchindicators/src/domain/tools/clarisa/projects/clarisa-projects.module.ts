import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { MappingPhaseResolver } from './mapping-phase.resolver';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-03 / DD-5, J-F-2
//
// Singleton tool module. Imports HttpModule so the underlying Clarisa
// connection (Bearer-token CLARISA client) can issue GET /api/projects.
// Registers MappingPhaseResolver for phase resolution across bilateral picker and coverage endpoints.
@Module({
  imports: [HttpModule],
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService, MappingPhaseResolver],
  exports: [ClarisaProjectsService, MappingPhaseResolver],
})
export class ClarisaProjectsModule {}
