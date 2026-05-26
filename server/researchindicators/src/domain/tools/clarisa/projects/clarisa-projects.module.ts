import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClarisaProjectsService } from './clarisa-projects.service';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.10 / R-BIL-076
//
// Singleton tool module. Imports HttpModule so the underlying Clarisa
// connection (Bearer-token CLARISA client) can issue GET /api/projects.
@Module({
  imports: [HttpModule],
  providers: [ClarisaProjectsService],
  exports: [ClarisaProjectsService],
})
export class ClarisaProjectsModule {}
