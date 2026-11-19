import { Module } from '@nestjs/common';
import { FrameworkElementRepository } from './repositories/framework-element.repository';
import { FrameworkElementResponsibleRepository } from './repositories/framework-element-responsible.repository';
import { FrameworkLevelRepository } from './repositories/framework-level.repository';
import { InstitutionalObjectiveElementRepository } from './repositories/institutional-objective-element.repository';
import { InstitutionalObjectiveRepository } from './repositories/institutional-objective.repository';
import { PortfolioLookupRepository } from './repositories/portfolio-lookup.repository';

/**
 * Strategy framework module shell (design 2.1, D-STF-1).
 * Declares the repositories. `FrameworkReadService` and
 * `FrameworkUsageRegistry` are exported by a later task; this module is not
 * on the route graph yet.
 */
@Module({
  providers: [
    FrameworkLevelRepository,
    FrameworkElementRepository,
    FrameworkElementResponsibleRepository,
    InstitutionalObjectiveRepository,
    InstitutionalObjectiveElementRepository,
    PortfolioLookupRepository,
  ],
})
export class StrategyFrameworkModule {}
