import { Module } from '@nestjs/common';
import { OrganizationalStructureController } from './organizational-structure.controller';
import { OrgStructureReadService } from './org-structure-read.service';
import {
  OrgStructureClock,
  SystemOrgStructureClock,
} from './org-structure.clock';
import { OrgUnitRepository } from './repositories/org-unit.repository';
import { OrgUnitVersionRepository } from './repositories/org-unit-version.repository';
import { OrgUnitDelegateRepository } from './repositories/org-unit-delegate.repository';
import { OrgUnitChangeLogRepository } from './repositories/org-unit-change-log.repository';

// T-01: the read half. `OrgStructureReadService` is exported and stays a
// singleton (repositories + clock only, no request-scoped dependency), so a
// consumer module can inject it without being forced into request scope
// (design 2.1, "Why two services"). The write service, the usage registry and
// the control-lists wiring join this module in T-02..T-04.
@Module({
  controllers: [OrganizationalStructureController],
  providers: [
    OrgStructureReadService,
    { provide: OrgStructureClock, useClass: SystemOrgStructureClock },
    OrgUnitRepository,
    OrgUnitVersionRepository,
    OrgUnitDelegateRepository,
    OrgUnitChangeLogRepository,
  ],
  exports: [OrgStructureReadService],
})
export class OrganizationalStructureModule {}
