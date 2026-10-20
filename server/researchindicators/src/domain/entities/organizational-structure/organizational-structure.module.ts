import { Module } from '@nestjs/common';
import { OrganizationalStructureController } from './organizational-structure.controller';
import { OrgStructureService } from './organizational-structure.service';
import { OrgStructureWriteRepository } from './repositories/org-structure-write.repository';
import { ControlListsModule } from '../control-lists/control-lists.module';
import { OrgStructureReadService } from './org-structure-read.service';
import {
  OrgStructureClock,
  SystemOrgStructureClock,
} from './org-structure.clock';
import { OrgUnitRepository } from './repositories/org-unit.repository';
import { OrgUnitVersionRepository } from './repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from './repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from './repositories/org-unit-change-log.repository';
import { OrgUnitUsageRegistry } from './org-unit-usage.registry';
import { OrgLevelUsageProvider } from './org-level-usage.provider';

// `OrgStructureReadService` is exported and stays a singleton (repositories +
// clock only, no request-scoped dependency), so a consumer module can inject
// it without being forced into request scope (design 2.1, "Why two services").
// T-02 adds the request-scoped write service (save engine, code proposal, staff
// search); it imports ControlListsModule for `ControlListValueLookupService`
// (a singleton). T-03 adds the singleton usage registry (exported, deduplicated by consumer name, no
// constructor dependencies) that feeds the delete blocker. T-04 adds the singleton
// `OrgLevelUsageProvider`, which registers itself in the Control Lists registry
// from `onModuleInit` (the registry comes from the imported `ControlListsModule`).
@Module({
  imports: [ControlListsModule],
  controllers: [OrganizationalStructureController],
  providers: [
    OrgStructureReadService,
    OrgStructureService,
    OrgStructureWriteRepository,
    { provide: OrgStructureClock, useClass: SystemOrgStructureClock },
    OrgUnitRepository,
    OrgUnitVersionRepository,
    OrgUnitDelegateRepository,
    OrgUnitChangeLogRepository,
    OrgUnitUsageRegistry,
    OrgLevelUsageProvider,
  ],
  exports: [OrgStructureReadService, OrgUnitUsageRegistry],
})
export class OrganizationalStructureModule {}
