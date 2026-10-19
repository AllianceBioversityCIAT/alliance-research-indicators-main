import { Module } from '@nestjs/common';
import { NotContributorOnlyGuard } from './guards/not-contributor-only.guard';
import { PooledFundingMonitorController } from './pooled-funding-monitor.controller';
import { PooledFundingMonitorService } from './pooled-funding-monitor.service';
import { PooledFundingMonitorRepository } from './repositories/pooled-funding-monitor.repository';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05
// Registered in BOTH entities.module.ts and routes/main.routes.ts (KZ-017).
// DataSource comes from the root TypeOrmModule (global), no forFeature needed.
@Module({
  controllers: [PooledFundingMonitorController],
  providers: [
    PooledFundingMonitorRepository,
    PooledFundingMonitorService,
    NotContributorOnlyGuard,
  ],
})
export class PooledFundingMonitorModule {}
