import { Module } from '@nestjs/common';
import { FrameworkReadService } from './framework-read.service';
import { FrameworkUsageRegistry } from './framework-usage.registry';
import { StrategyFrameworkService } from './strategy-framework.service';
import { FrameworkElementRepository } from './repositories/framework-element.repository';
import { FrameworkElementResponsibleRepository } from './repositories/framework-element-responsible.repository';
import { FrameworkLevelRepository } from './repositories/framework-level.repository';
import { InstitutionalObjectiveElementRepository } from './repositories/institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from './repositories/institutional-objective.repository';
import { PortfolioLookupRepository } from './repositories/portfolio-lookup.repository';

/**
 * Strategy framework module (design 2.1, D-STF-1). Exports the singleton
 * read service and usage registry so a later module can inject them without
 * request scope. The write service is request-scoped and stays unexported.
 * Not on the route graph yet (that registration is T-08).
 */
@Module({
  providers: [
    FrameworkLevelRepository,
    FrameworkElementRepository,
    FrameworkElementResponsibleRepository,
    InstitutionalObjectiveRepository,
    InstitutionalObjectiveElementRepository,
    PortfolioLookupRepository,
    FrameworkUsageRegistry,
    FrameworkReadService,
    StrategyFrameworkService,
  ],
  exports: [FrameworkReadService, FrameworkUsageRegistry],
})
export class StrategyFrameworkModule {}
