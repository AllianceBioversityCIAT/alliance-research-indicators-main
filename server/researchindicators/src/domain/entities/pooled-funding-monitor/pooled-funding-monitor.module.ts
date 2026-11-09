import { Module } from '@nestjs/common';
import { PfmAccessGuard } from './guards/pfm-access.guard';
import { PooledFundingMonitorController } from './pooled-funding-monitor.controller';
import { PooledFundingMonitorService } from './pooled-funding-monitor.service';
import { PooledFundingMonitorRepository } from './repositories/pooled-funding-monitor.repository';
import { EnvAppConfigUtil } from '../../shared/utils/env-app-config.util';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05
// Registered in BOTH entities.module.ts and routes/main.routes.ts (KZ-017).
// DataSource comes from the root TypeOrmModule (global), no forFeature needed.
// EnvAppConfigUtil (POOL_FUNDING.SECTION.ENABLED in the guard) is provided here, not taken from the
// global GlobalUtilsModule, so the module stands on its own (the e2e boots it without that module).
// It is stateless (DataSource only), so a second instance is harmless.
@Module({
  controllers: [PooledFundingMonitorController],
  providers: [
    PooledFundingMonitorRepository,
    PooledFundingMonitorService,
    PfmAccessGuard,
    EnvAppConfigUtil,
  ],
})
export class PooledFundingMonitorModule {}
