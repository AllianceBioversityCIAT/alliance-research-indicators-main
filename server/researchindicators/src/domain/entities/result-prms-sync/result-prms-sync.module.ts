import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { CapacitySharingBuilder } from '../../tools/prms-normalizer/builders/capacity-sharing.builder';
import { CommonFieldsBuilder } from '../../tools/prms-normalizer/builders/common-fields.builder';
import { InnovationDevelopmentBuilder } from '../../tools/prms-normalizer/builders/innovation-development.builder';
import { InnovationUseBuilder } from '../../tools/prms-normalizer/builders/innovation-use.builder';
import { KnowledgeProductBuilder } from '../../tools/prms-normalizer/builders/knowledge-product.builder';
import { PayloadBuilder } from '../../tools/prms-normalizer/builders/payload.builder';
import { PolicyChangeBuilder } from '../../tools/prms-normalizer/builders/policy-change.builder';
import { PrmsNormalizerModule } from '../../tools/prms-normalizer/prms-normalizer.module';
import { PrmsWebhookDeliveryRepository } from '../prms-webhook/repositories/prms-webhook-delivery.repository';
import { ResultPrmsSyncAggregateRepository } from './repositories/result-prms-sync-aggregate.repository';
import { ResultPrmsSyncLogRepository } from './repositories/result-prms-sync-log.repository';
import { ResultPrmsSyncController } from './result-prms-sync.controller';
import { ResultPrmsSyncStatusReader } from './result-prms-sync-status.reader';
import { ResultPrmsSyncService } from './result-prms-sync.service';

@Module({
  imports: [PrmsNormalizerModule, AppConfigModule, ResultUsersModule],
  controllers: [ResultPrmsSyncController],
  providers: [
    ResultPrmsSyncService,
    ResultPrmsSyncStatusReader,
    ResultPrmsSyncLogRepository,
    ResultPrmsSyncAggregateRepository,
    // T-11: the outbound PENDING_REVIEW history write. Provided directly
    // here (not via a PrmsWebhookModule import) — the repository's only
    // dependency is the globally-provided DataSource, and importing the
    // sibling feature module for one repository would be a wider coupling
    // than the write needs.
    PrmsWebhookDeliveryRepository,
    PayloadBuilder,
    CommonFieldsBuilder,
    CapacitySharingBuilder,
    InnovationDevelopmentBuilder,
    PolicyChangeBuilder,
    InnovationUseBuilder,
    KnowledgeProductBuilder,
    ResultOwnerGuard,
  ],
  exports: [ResultPrmsSyncService, ResultPrmsSyncStatusReader],
})
export class ResultPrmsSyncModule {}
