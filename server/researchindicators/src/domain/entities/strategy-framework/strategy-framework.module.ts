import { Module } from '@nestjs/common';
import { FrameworkReadService } from './framework-read.service';
import { FrameworkUsageRegistry } from './framework-usage.registry';
import { StrategyFrameworkController } from './strategy-framework.controller';
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
 * The route node is `main.routes.ts` (`strategy-framework`); this module is
 * imported by `EntitiesModule` (KZ-017: the route node alone does not mount it).
 */
@Module({
  controllers: [StrategyFrameworkController],
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
