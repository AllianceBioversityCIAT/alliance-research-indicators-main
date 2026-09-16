import { HttpStatus } from '@nestjs/common';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { IndicatorTypeHomologation } from '../../../tools/prms-normalizer/homologation/indicator-type.homologation';

/**
 * Eligibility facts the gate evaluates. T-11 loads them; this module does not
 * query, persist, or call transport (design.md §5.1, T-10 scope).
 */
export interface SyncGateSnapshot {
  exists: boolean;
  is_synced_to_prms: boolean;
  result_status_id: number | null;
  pool_funding_alignment_green: boolean;
  primary_contract: {
    agreement_id: string;
    is_pool_funding_contributor: boolean;
  } | null;
  indicator_id: number | null;
  /** Resolved PRMS `policy_type.id`. Null when the result is not a policy change. */
  prms_policy_type_id: number | null;
}

export type SyncGateEntryId =
  | 'result_exists'
  | 'not_already_synced'
  | 'approved'
  | 'alignment_green'
  | 'pool_funding_contributor'
  | 'indicator_mappable'
  | 'indicator_not_gated'
  | 'policy_type_not_gated';

export interface SyncGateEntry {
  id: SyncGateEntryId;
  httpStatus: number;
  description: string | ((snapshot: SyncGateSnapshot) => string);
  fails: (snapshot: SyncGateSnapshot) => boolean;
  /** JD-3: entries 1–2 write no log row; entries 3–8 write REFUSED_BY_STAR. */
  persistsRow: boolean;
}

export interface SyncGateDecision {
  allowed: boolean;
  entryId: SyncGateEntryId | null;
  httpStatus: number | null;
  description: string | null;
  persistsRow: boolean;
}

const UNMAPPABLE_INDICATORS = new Set<number>([
  IndicatorsEnum.KNOWLEDGE_PRODUCT,
  IndicatorsEnum.OICR,
]);

/** PRMS `policy_type.id = 1` — Program, Budget, or Investment (D-2). */
const PRMS_POLICY_TYPE_PROGRAM_BUDGET_OR_INVESTMENT = 1;

const contractDescription = (snapshot: SyncGateSnapshot): string => {
  const agreementId = snapshot.primary_contract?.agreement_id;
  if (agreementId) {
    return `Primary contract ${agreementId} is not a pool-funding contributor`;
  }
  return 'Primary contract is missing or is not a pool-funding contributor';
};

/**
 * Ordered refusal list (design.md §5.1). Data, not scattered conditionals.
 * Evaluate first-failure-wins. Lifting a gated type is removing one entry
 * (QA-5 / family R-F6).
 */
export const SYNC_GATE_ENTRIES: readonly SyncGateEntry[] = [
  {
    id: 'result_exists',
    httpStatus: HttpStatus.NOT_FOUND,
    description: 'Result not found',
    fails: (snapshot) => !snapshot.exists,
    persistsRow: false,
  },
  {
    id: 'not_already_synced',
    httpStatus: HttpStatus.CONFLICT,
    description: 'Result is already synced to PRMS',
    fails: (snapshot) => snapshot.is_synced_to_prms === true,
    persistsRow: false,
  },
  {
    id: 'approved',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Result is not Approved; only results with result_status_id = 6 can be sent to PRMS',
    fails: (snapshot) =>
      snapshot.result_status_id !== ResultStatusEnum.APPROVED,
    persistsRow: true,
  },
  {
    id: 'alignment_green',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Pool Funding Alignment is not green-checked',
    fails: (snapshot) => snapshot.pool_funding_alignment_green !== true,
    persistsRow: true,
  },
  {
    id: 'pool_funding_contributor',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description: contractDescription,
    fails: (snapshot) =>
      snapshot.primary_contract?.is_pool_funding_contributor !== true,
    persistsRow: true,
  },
  {
    id: 'indicator_mappable',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Indicator is unmappable to a PRMS type; Knowledge Product and OICR cannot be sent',
    fails: (snapshot) => {
      if (snapshot.indicator_id == null) {
        return true;
      }
      if (UNMAPPABLE_INDICATORS.has(snapshot.indicator_id)) {
        return true;
      }
      return IndicatorTypeHomologation[snapshot.indicator_id] == null;
    },
    persistsRow: true,
  },
  {
    id: 'indicator_not_gated',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Innovation Use is gated: STAR holds no investment declarations (usd_budget / is_determined)',
    fails: (snapshot) =>
      snapshot.indicator_id === IndicatorsEnum.INNOVATION_USE,
    persistsRow: true,
  },
  {
    id: 'policy_type_not_gated',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'Policy type Program, Budget, or Investment is gated: STAR holds no status_amount or amount fields',
    fails: (snapshot) =>
      snapshot.prms_policy_type_id ===
      PRMS_POLICY_TYPE_PROGRAM_BUDGET_OR_INVESTMENT,
    persistsRow: true,
  },
];

export function evaluateSyncGate(
  snapshot: SyncGateSnapshot,
  entries: readonly SyncGateEntry[] = SYNC_GATE_ENTRIES,
): SyncGateDecision {
  for (const entry of entries) {
    if (entry.fails(snapshot)) {
      const description =
        typeof entry.description === 'function'
          ? entry.description(snapshot)
          : entry.description;
      return {
        allowed: false,
        entryId: entry.id,
        httpStatus: entry.httpStatus,
        description,
        persistsRow: entry.persistsRow,
      };
    }
  }
  return {
    allowed: true,
    entryId: null,
    httpStatus: null,
    description: null,
    persistsRow: false,
  };
}
