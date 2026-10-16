import { Injectable } from '@nestjs/common';
import { InstitutionRolesEnum } from '../../../entities/institution-roles/enums/institution-roles.enum';
import { PolicyStagesEnum } from '../../../entities/policy-stages/enum/policy-stages.enum';
import { PolicyTypesEnum } from '../../../entities/policy-types/enum/policy-types.enum';
import { PrmsSyncAggregate } from '../dto/prms-sync-aggregate';
import { PrmsPayloadBuildError } from './common-fields.builder';

/**
 * STAR `policy_types.name` transcribed from migration
 * `1730993015550-insertLinkResultRole.ts` (homologation.md §9 / §12.1).
 * Send `name`, never the STAR or PRMS id (DD-7).
 */
const POLICY_TYPE_NAMES: Record<number, string> = {
  [PolicyTypesEnum.POLICY_OR_STRATEGY]: 'Policy or Strategy',
  [PolicyTypesEnum.LEGAL_INSTRUMENT]: 'Legal instrument',
  [PolicyTypesEnum.PROGRAM_BUDGET_OR_INVESTMENT]:
    'Program, Budget, or Investment',
};

/**
 * STAR `policy_stage.name` transcribed from the same seed migration.
 */
const POLICY_STAGE_NAMES: Record<number, string> = {
  [PolicyStagesEnum.STAGE_1]: 'Stage 1',
  [PolicyStagesEnum.STAGE_2]: 'Stage 2',
  [PolicyStagesEnum.STAGE_3]: 'Stage 3',
};

const asNumber = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Type-specific block for `policy_change` (homologation.md §9).
 * Nesting under `policy_change` is D-B, confirmed by T-01 spike 04.
 * `status_amount` / `amount` are never emitted (D-2 / P-1); non-type-1
 * payloads must not carry those keys (R-PRMS-006 AC.2).
 */
@Injectable()
export class PolicyChangeBuilder {
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const slice = aggregate.type_slices?.policy_change ?? {};
    const typeId = asNumber(slice.policy_type_id);
    const stageId = asNumber(slice.policy_stage_id);
    const typeName = typeId == null ? undefined : POLICY_TYPE_NAMES[typeId];
    const stageName = stageId == null ? undefined : POLICY_STAGE_NAMES[stageId];

    if (!typeName) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'policy_type'`,
        'policy_type',
      );
    }
    if (!stageName) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'policy_stage'`,
        'policy_stage',
      );
    }

    const implementing = implementingOrganizations(slice);
    if (implementing.length === 0) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'implementing_organization'`,
        'implementing_organization',
      );
    }

    return {
      policy_change: {
        policy_type: { name: typeName },
        policy_stage: { name: stageName },
        implementing_organization: implementing,
      },
    };
  }
}

const implementingOrganizations = (
  slice: Record<string, unknown>,
): Record<string, unknown>[] => {
  const rows = Array.isArray(slice.implementing_organizations)
    ? (slice.implementing_organizations as Record<string, unknown>[])
    : [];

  return rows
    .filter(
      (row) =>
        asNumber(row.institution_role_id) ===
        InstitutionRolesEnum.POLICY_CHANGE,
    )
    .map((row) => {
      const org: Record<string, unknown> = {};
      const id = asNumber(row.institution_id);
      const acronym = String(row.acronym ?? '').trim();
      const name = String(row.name ?? '').trim();
      if (id != null) {
        org.institutions_id = id;
      }
      if (acronym) {
        org.institutions_acronym = acronym;
      }
      if (name) {
        org.institutions_name = name;
      }
      if (Object.keys(org).length === 0) {
        throw new PrmsPayloadBuildError(
          `Missing mandatory field 'implementing_organization'`,
          'implementing_organization',
        );
      }
      return org;
    });
};
