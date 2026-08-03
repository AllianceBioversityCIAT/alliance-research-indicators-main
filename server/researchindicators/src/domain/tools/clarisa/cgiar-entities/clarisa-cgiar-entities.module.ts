import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClarisaCgiarEntitiesService } from './clarisa-cgiar-entities.service';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Singleton tool module. Imports HttpModule so the underlying Clarisa
// connection can issue GET /api/cgiar-entities?version=2 — the canonical
// SP→AOW catalog consumed by the bilateral HLO/indicator panel.
@Module({
  imports: [HttpModule],
  providers: [ClarisaCgiarEntitiesService],
  exports: [ClarisaCgiarEntitiesService],
})
export class ClarisaCgiarEntitiesModule {}
