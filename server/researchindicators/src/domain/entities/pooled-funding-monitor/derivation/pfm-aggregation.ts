import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmMappingStateEnum } from '../enum/pfm-mapping-state.enum';
import { PfmPrmsStatusEnum } from '../enum/pfm-prms-status.enum';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';
import { PfmStatusFilterEnum } from '../enum/pfm-status-filter.enum';
import type {
  PfmMonitoredRow,
  PfmMonthlySync,
} from '../repositories/pooled-funding-monitor.repository';
import {
  derivePfmRow,
  matchesChip,
  matchesStatusFilter,
  PfmDerivedRow,
  rowRank,
} from './pfm-derivation';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-03

/**
 * Pure aggregation over derived rows (design DD-PFM-1): one derivation feeds
 * every number on the page (NFR-PFM-006). No DI, no DB.
 */

export interface PfmDerivedMonitoredRow {
  row: PfmMonitoredRow;
  d: PfmDerivedRow;
}

export const deriveMonitoredRows = (
  rows: PfmMonitoredRow[],
): PfmDerivedMonitoredRow[] =>
  rows.map((row) => ({ row, d: derivePfmRow(row) }));

// ---------------------------------------------------------------- pipeline

export enum PfmStageKeyEnum {
  MAPPING_NOT_STARTED = 'mapping_not_started',
  MAPPING_INCOMPLETE = 'mapping_incomplete',
  READY_TO_SYNC = 'ready_to_sync',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NO_SP_CONTRIBUTION = 'no_sp_contribution',
}

export type PfmStageGroup = 'in_star' | 'in_prms' | 'out_of_scope';

/** Display order of the seven stages. */
export const PFM_STAGES: { key: PfmStageKeyEnum; group: PfmStageGroup }[] = [
  { key: PfmStageKeyEnum.MAPPING_NOT_STARTED, group: 'in_star' },
  { key: PfmStageKeyEnum.MAPPING_INCOMPLETE, group: 'in_star' },
  { key: PfmStageKeyEnum.READY_TO_SYNC, group: 'in_star' },
  { key: PfmStageKeyEnum.PENDING_REVIEW, group: 'in_prms' },
  { key: PfmStageKeyEnum.APPROVED, group: 'in_prms' },
  { key: PfmStageKeyEnum.REJECTED, group: 'in_prms' },
  { key: PfmStageKeyEnum.NO_SP_CONTRIBUTION, group: 'out_of_scope' },
];

/**
 * R-PFM-006 precedence: (1) PRMS != Not sent -> its In-PRMS stage; (2) out of
 * scope; (3) In-STAR rules. DD-PFM-6: Complete mapping but STAR != Approved
 * (so not Ready) lands in Mapping not started - keeps the partition exact.
 */
export const assignPfmStage = (d: PfmDerivedRow): PfmStageKeyEnum => {
  switch (d.prmsStatus) {
    case PfmPrmsStatusEnum.PENDING_REVIEW:
      return PfmStageKeyEnum.PENDING_REVIEW;
    case PfmPrmsStatusEnum.APPROVED:
      return PfmStageKeyEnum.APPROVED;
    case PfmPrmsStatusEnum.REJECTED:
      return PfmStageKeyEnum.REJECTED;
    default:
      break;
  }
  if (d.isOutOfScope) return PfmStageKeyEnum.NO_SP_CONTRIBUTION;
  if (d.isReady) return PfmStageKeyEnum.READY_TO_SYNC;
  if (d.mappingState === PfmMappingStateEnum.INCOMPLETE)
    return PfmStageKeyEnum.MAPPING_INCOMPLETE;
  return PfmStageKeyEnum.MAPPING_NOT_STARTED;
};

export interface PfmPipeline {
  total: number;
  in_scope: number;
  not_synced: number;
  in_prms: number;
  out_of_scope: number;
  stages: { key: PfmStageKeyEnum; group: PfmStageGroup; value: number }[];
}

export const buildPfmPipeline = (
  rows: PfmDerivedMonitoredRow[],
): PfmPipeline => {
  const counts = new Map<PfmStageKeyEnum, number>();
  for (const { d } of rows) {
    const key = assignPfmStage(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const stages = PFM_STAGES.map((s) => ({
    ...s,
    value: counts.get(s.key) ?? 0,
  }));
  const sum = (group: PfmStageGroup): number =>
    stages.filter((s) => s.group === group).reduce((a, s) => a + s.value, 0);
  return {
    total: rows.length,
    in_scope: rows.filter(({ d }) => !d.isOutOfScope).length,
    not_synced: sum('in_star'),
    in_prms: sum('in_prms'),
    out_of_scope: sum('out_of_scope'),
    stages,
  };
};

// ---------------------------------------------------------------- summary

export interface PfmSpCoverage {
  code: string;
  name: string;
  synced: number;
  total: number;
}

/** R-PFM-007: primary SPs only; out-of-scope and no-primary rows excluded; by code. */
export const buildSpCoverage = (
  rows: PfmDerivedMonitoredRow[],
): PfmSpCoverage[] => {
  const byCode = new Map<string, PfmSpCoverage>();
  for (const { row, d } of rows) {
    if (d.isOutOfScope || !row.primary_sp) continue;
    const { code, name } = row.primary_sp;
    const entry = byCode.get(code) ?? { code, name, synced: 0, total: 0 };
    entry.total += 1;
    if (d.prmsStatus !== PfmPrmsStatusEnum.NOT_SENT) entry.synced += 1;
    byCode.set(code, entry);
  }
  return [...byCode.values()].sort((a, b) =>
    a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
  );
};

/** R-PFM-008: last six UTC calendar months incl. current, oldest first, zero-filled. */
export const buildMonthlySeries = (
  sparse: PfmMonthlySync[],
  now: Date,
): PfmMonthlySync[] => {
  const bySparse = new Map(sparse.map((m) => [m.month, m.synced]));
  const out: PfmMonthlySync[] = [];
  for (let back = 5; back >= 0; back--) {
    const dt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1),
    );
    const month = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ month, synced: bySparse.get(month) ?? 0 });
  }
  return out;
};

export interface PfmSummaryInput {
  scope: PfmScopeEnum;
  /** Derived rows of the scope set (no filters). */
  rows: PfmDerivedMonitoredRow[];
  /** countContributingProjects() */
  projectsTotal: number;
  /** findMonthlySyncs() output (sparse). */
  monthlySyncs: PfmMonthlySync[];
  /** DISTINCT results accepted this calendar year (cannot be summed from months). */
  syncedThisYear: number;
  isPiOfAny: boolean;
  now: Date;
}

export interface PfmSummary {
  scope: PfmScopeEnum;
  is_pi_of_any: boolean;
  kpis: {
    projects: number;
    projects_total: number;
    monitored: number;
    need_attention: number;
    synced: number;
    in_prms_scope: number;
  };
  pipeline: PfmPipeline;
  sp_coverage: PfmSpCoverage[];
  monthly: PfmMonthlySync[];
  synced_this_year: number;
}

export const buildPfmSummary = (i: PfmSummaryInput): PfmSummary => ({
  scope: i.scope,
  is_pi_of_any: i.isPiOfAny,
  kpis: {
    projects: new Set(i.rows.map(({ row }) => row.project_code)).size,
    projects_total: i.projectsTotal,
    monitored: i.rows.length,
    need_attention: i.rows.filter(({ d }) => d.needsAttention).length,
    synced: i.rows.filter(
      ({ d }) => d.prmsStatus !== PfmPrmsStatusEnum.NOT_SENT,
    ).length,
    in_prms_scope: i.rows.filter(({ d }) => !d.isOutOfScope).length,
  },
  pipeline: buildPfmPipeline(i.rows),
  sp_coverage: buildSpCoverage(i.rows),
  monthly: buildMonthlySeries(i.monthlySyncs, i.now),
  synced_this_year: i.syncedThisYear,
});

// ------------------------------------------------------------------ queue

export interface PfmQueueFilters {
  project?: string;
  sp?: string;
  status?: PfmStatusFilterEnum;
  type?: number;
  chip?: PfmChipEnum;
}

/** Response key of each chip (design §4 chip_counts). */
export const PFM_CHIP_COUNT_KEYS = {
  [PfmChipEnum.ALL]: 'all',
  [PfmChipEnum.NEED_ATTENTION]: 'attention',
  [PfmChipEnum.MAPPING_INCOMPLETE]: 'mapping',
  [PfmChipEnum.READY_TO_SYNC]: 'ready',
  [PfmChipEnum.AWAITING_PI]: 'pending',
  [PfmChipEnum.REJECTED]: 'prms_rejected',
  [PfmChipEnum.SYNCED]: 'synced',
} as const;

export type PfmChipCounts = Record<
  (typeof PFM_CHIP_COUNT_KEYS)[PfmChipEnum],
  number
>;

/** R-PFM-009: project / SP (primary OR contributing) / status / type, AND-combined. Chip not applied. */
export const applyPfmFilters = (
  rows: PfmDerivedMonitoredRow[],
  f: PfmQueueFilters,
): PfmDerivedMonitoredRow[] =>
  rows.filter(
    ({ row, d }) =>
      (!f.project || row.project_code === f.project) &&
      (!f.sp ||
        row.primary_sp?.code === f.sp ||
        row.contributing_sps.some((s) => s.code === f.sp)) &&
      (!f.status || matchesStatusFilter(d, f.status)) &&
      (f.type == null || row.indicator_id === f.type),
  );

export const applyPfmChip = (
  rows: PfmDerivedMonitoredRow[],
  chip: PfmChipEnum | undefined,
): PfmDerivedMonitoredRow[] =>
  chip ? rows.filter(({ d }) => matchesChip(d, chip)) : rows;

export const countPfmChips = (
  rows: PfmDerivedMonitoredRow[],
): PfmChipCounts => {
  const out = {} as PfmChipCounts;
  for (const chip of Object.values(PfmChipEnum)) {
    out[PFM_CHIP_COUNT_KEYS[chip]] = rows.filter(({ d }) =>
      matchesChip(d, chip),
    ).length;
  }
  return out;
};

export interface PfmGroup {
  code: string;
  name: string | null;
  lead_pi: string | null;
  donor: string | null;
  result_count: number;
  attention: number;
  counts: {
    approved: number;
    pending: number;
    rejected: number;
    out_of_scope: number;
    not_sent: number;
  };
}

/** R-PFM-011 flag copy. */
export const pfmAttentionFlag = (attention: number): string =>
  attention === 0
    ? 'All clear'
    : `${attention} ${attention === 1 ? 'needs' : 'need'} attention`;

/** Attention desc, then project code asc. */
export const buildPfmGroups = (rows: PfmDerivedMonitoredRow[]): PfmGroup[] => {
  const byProject = new Map<string, PfmGroup>();
  for (const { row, d } of rows) {
    const g = byProject.get(row.project_code) ?? {
      code: row.project_code,
      name: row.project_name,
      lead_pi: row.lead_pi,
      donor: row.donor,
      result_count: 0,
      attention: 0,
      counts: {
        approved: 0,
        pending: 0,
        rejected: 0,
        out_of_scope: 0,
        not_sent: 0,
      },
    };
    g.result_count += 1;
    if (d.needsAttention) g.attention += 1;
    switch (d.prmsStatus) {
      case PfmPrmsStatusEnum.APPROVED:
        g.counts.approved += 1;
        break;
      case PfmPrmsStatusEnum.PENDING_REVIEW:
        g.counts.pending += 1;
        break;
      case PfmPrmsStatusEnum.REJECTED:
        g.counts.rejected += 1;
        break;
      default:
        if (d.isOutOfScope) g.counts.out_of_scope += 1;
        else g.counts.not_sent += 1;
    }
    byProject.set(row.project_code, g);
  }
  return [...byProject.values()].sort(
    (a, b) =>
      b.attention - a.attention ||
      (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
  );
};

export interface PfmQueueAggregate {
  chip_counts: PfmChipCounts;
  groups: PfmGroup[];
  totals: { results: number; projects: number; monitored_total: number };
}

/**
 * R-PFM-010 order of operations: filters -> chip counts (filtered set) -> chip
 * -> groups + totals. `filter_options` are NOT built here: they come from the
 * scope set via the repository (design §4).
 * `monitored_total` = ALL monitored results of the scope set, unfiltered (the
 * "{total} flagged portfolio-wide" of R-PFM-015, same population as KPI card 2).
 */
export const buildPfmQueue = (
  scopeRows: PfmDerivedMonitoredRow[],
  f: PfmQueueFilters,
): PfmQueueAggregate => {
  const filtered = applyPfmFilters(scopeRows, f);
  const chip_counts = countPfmChips(filtered);
  const shown = applyPfmChip(filtered, f.chip);
  const groups = buildPfmGroups(shown);
  return {
    chip_counts,
    groups,
    totals: {
      results: shown.length,
      projects: groups.length,
      monitored_total: scopeRows.length,
    },
  };
};

/** Rows of one group, ranked (R-PFM-012), stable on ties. Used by the lazy-rows endpoint. */
export const rankPfmRows = (
  rows: PfmDerivedMonitoredRow[],
): PfmDerivedMonitoredRow[] =>
  rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rowRank(a.r.d) - rowRank(b.r.d) || a.i - b.i)
    .map(({ r }) => r);
