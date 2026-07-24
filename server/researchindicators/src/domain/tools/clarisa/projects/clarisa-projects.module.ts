import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.10 + T-15.15
//
// Singleton tool module. Imports HttpModule so the underlying Clarisa
// connection (Bearer-token CLARISA client) can issue GET /api/projects.
// Controller landed in T-15.15 to power the admin picker.
@Module({
  imports: [HttpModule],
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService],
  exports: [ClarisaProjectsService],
})
export class ClarisaProjectsModule {}
