import { Module } from '@nestjs/common';
import { Portfolio2026SdgTargetCatalogService } from './portfolio-2026-sdg-target-catalog.service';
import { Portfolio2026SdgTargetsController } from './portfolio-2026-sdg-targets.controller';
import { ResultSdgTargetsService } from './result-sdg-targets.service';

@Module({
  controllers: [Portfolio2026SdgTargetsController],
  providers: [ResultSdgTargetsService, Portfolio2026SdgTargetCatalogService],
  exports: [ResultSdgTargetsService, Portfolio2026SdgTargetCatalogService],
})
export class ResultSdgTargetsModule {}
