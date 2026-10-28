import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-03 / DD-5, J-F-2
//
// Singleton tool module. Imports HttpModule so the underlying Clarisa
// connection (Bearer-token CLARISA client) can issue GET /api/projects.
@Module({
  imports: [HttpModule],
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService],
  exports: [ClarisaProjectsService],
})
export class ClarisaProjectsModule {}
