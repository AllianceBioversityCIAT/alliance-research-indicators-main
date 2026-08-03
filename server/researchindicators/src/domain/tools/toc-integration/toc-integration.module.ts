import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TocIntegrationService } from './toc-integration.service';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-01 / R-BIL-090, NFR-BIL-090..092
//
// Singleton tool module. Wraps lambda-toc
// `/api/toc-integration/toc/results/category/{LEVEL}/initiative/{SP}` with a
// 5-min in-memory cache + warm-on-error / cold-503 resilience.
@Module({
  imports: [HttpModule],
  providers: [TocIntegrationService],
  exports: [TocIntegrationService],
})
export class TocIntegrationModule {}
