import { Module } from '@nestjs/common';
import { ControlListsController } from './control-lists.controller';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlListUsageRegistry } from './control-list-usage.registry';
import { ControlListValueLookupService } from './control-list-value-lookup.service';
import { PortfoliosModule } from '../portfolios/portfolios.module';

// T-04: exports the registry (so a consumer module can `register()` a
// provider, design §5 rule 5) and the lookup service (so a consumer can call
// `assertValueInList`, design §5 rule 10 / D-CTL-15) ALONGSIDE the existing
// service export. Both are singletons with no request-scoped dependency
// (P-10) — unlike `ControlListsService`, which is itself request-scoped
// (it injects `CurrentUserUtil`), so a consumer should prefer injecting
// these two over the service for anything outside the HTTP request path.
@Module({
  imports: [PortfoliosModule],
  controllers: [ControlListsController],
  providers: [
    ControlListsService,
    ControlListCategoryRepository,
    ControlListRepository,
    ControlListValueRepository,
    ControlListUsageRegistry,
    ControlListValueLookupService,
  ],
  exports: [
    ControlListsService,
    ControlListUsageRegistry,
    ControlListValueLookupService,
  ],
})
export class ControlListsModule {}
