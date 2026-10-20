import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ControlListUsageProvider,
  ControlListUsageRegistry,
} from '../control-lists/control-list-usage.registry';
import { ORG_LEVEL_LIST_KEY } from './org-structure.constants';
import { OrgUnitVersionRepository } from './repositories/org-unit-version.repository';

/**
 * The first `org.level` consumer of Control Lists (R-ORG-011, design 5.8): a
 * level value in use cannot be deleted and *Used by* lists this consumer.
 *
 * A SINGLETON that registers itself from `onModuleInit` (D-ORG-10), because
 * the Control Lists registry pushes blindly (P-3: a provider registered twice
 * doubles every count). Registered "once" is enforced here, not only by Nest
 * calling the hook once: a second `onModuleInit` finds its own consumer name
 * already declared for the key and does nothing. It depends on the registry
 * and a repository only, never `CurrentUserUtil`, so it cannot become
 * request-scoped.
 *
 * The count is the number of VERSIONS using each level value (R-ORG-011
 * AC.1), not entries: an entry that sat on one level for two versions counts 2.
 *
 * @akili-spec institutional-performance/organizational-structure
 */
@Injectable()
export class OrgLevelUsageProvider
  implements OnModuleInit, ControlListUsageProvider
{
  readonly consumerName = 'Organizational Structure › Level';
  readonly listKeys = [ORG_LEVEL_LIST_KEY];

  constructor(
    private readonly registry: ControlListUsageRegistry,
    private readonly versionRepository: OrgUnitVersionRepository,
  ) {}

  onModuleInit(): void {
    const alreadyRegistered = this.registry
      .getConsumerNamesForKey(ORG_LEVEL_LIST_KEY)
      .includes(this.consumerName);
    if (alreadyRegistered) return;
    this.registry.register(this);
  }

  async countByValueIds(valueIds: number[]): Promise<Record<number, number>> {
    const rows = await this.versionRepository.countByLevelValueIds(valueIds);
    const counts: Record<number, number> = {};
    for (const row of rows) {
      counts[Number(row.level_value_id)] = Number(row.versions);
    }
    return counts;
  }
}
