import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrmsTocService } from './prms-toc.service';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// Singleton tool module. Wraps PRMS public-results-framework `/toc-results`
// with a 5-min in-memory cache + warm-on-error / cold-503 resilience.
@Module({
  imports: [HttpModule],
  providers: [PrmsTocService],
  exports: [PrmsTocService],
})
export class PrmsTocModule {}
