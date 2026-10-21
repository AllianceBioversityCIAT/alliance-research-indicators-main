import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmMappingStateEnum } from '../enum/pfm-mapping-state.enum';
import { PfmPrmsStatusEnum } from '../enum/pfm-prms-status.enum';
import { PfmStarLabelEnum } from '../enum/pfm-star-label.enum';

/**
 * One monitored result as projected by the base query (design.md §3.2).
 * Pure input: this module never queries or persists (T-01).
 */
export interface PfmRawRow {
  result_status_id: number;
  /** STAR status name; shown as-is for ids outside the D-3 table. */
  result_status_name: string;
  /** Date the result last entered status 6 (D-4). */
  approved_at: Date | null;
  has_alignment: boolean | number;
  has_contribution: boolean | number | null;
  mapping_complete: boolean | number | null;
  primary_sp: { code: string; name: string } | null;
  contributing_sp_names: string[];
  is_synced_to_prms: boolean | number;
  /** Latest result_prms_sync_history.status (e.g. PENDING_REVIEW); null when no row. */
  prms_history_status: string | null;
  prms_justification: string | null;
  /** Creator display name (`sec_users` of `results.created_by`); null when unresolved. */
  creator: string | null;
  /** `results.updated_at` is nullable: a missing stamp renders "—", it never throws. */
  updated_at: Date | null;
}

export interface PfmDerivedRow {
  /** One of PfmStarLabelEnum, or the STAR status name for any other id. */
  starLabel: string;
  piLine: string;
  /** "Approved dd Mon yyyy" for an approved row with a date; null otherwise. */
  approvedLabel: string | null;
  mappingState: PfmMappingStateEnum;
  mappingNote: string;
  spLine: string;
  creator: string | null;
  prmsStatus: PfmPrmsStatusEnum;
  prmsHint: string;
  updatedLabel: string;
  isOutOfScope: boolean;
  isReady: boolean;
  needsAttention: boolean;
}

/** The subset of derived state the filter / chip / rank predicates read. */
export type PfmDerivedState = Pick<
  PfmDerivedRow,
  | 'starLabel'
  | 'mappingState'
  | 'prmsStatus'
  | 'isOutOfScope'
  | 'isReady'
  | 'needsAttention'
>;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** "dd Mon yyyy" (UTC, so output is host-timezone independent). */
export const formatPfmDate = (date: Date): string =>
  `${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

/** "dd Mon, HH:mm" (UTC). */
export const formatPfmDateTime = (date: Date): string =>
  `${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;

/** D-3: status id -> STAR label; unmapped ids keep their own name. */
export const deriveStarLabel = (
  statusId: number,
  statusName: string,
): string => {
  switch (statusId) {
    case 1:
    case 4:
      return PfmStarLabelEnum.DRAFT;
    case 2:
      return PfmStarLabelEnum.SUBMITTED;
    case 3:
      return PfmStarLabelEnum.UNDER_REVIEW;
    case 6:
      return PfmStarLabelEnum.APPROVED;
    case 5:
    case 7:
      return PfmStarLabelEnum.RETURNED;
    default:
      return statusName;
  }
};

export const derivePiLine = (
  starLabel: string,
  approvedAt: Date | null,
): string => {
  switch (starLabel) {
    case PfmStarLabelEnum.APPROVED:
      return approvedAt ? `Approved ${formatPfmDate(approvedAt)}` : 'Approved';
    case PfmStarLabelEnum.SUBMITTED:
      return 'Awaiting PI sign-off';
    case PfmStarLabelEnum.DRAFT:
      return 'Not yet submitted in STAR';
    case PfmStarLabelEnum.UNDER_REVIEW:
      return 'In review';
    case PfmStarLabelEnum.RETURNED:
      return 'Returned for revision';
    default:
      return '';
  }
};

export const deriveApprovedLabel = (
  starLabel: string,
  approvedAt: Date | null,
): string | null =>
  starLabel === PfmStarLabelEnum.APPROVED && approvedAt
    ? `Approved ${formatPfmDate(approvedAt)}`
    : null;

export interface PfmScienceProgramItem {
  code: string;
  name: string;
  primary: boolean;
  color: string | null;
}

/** One entry per active SP, the primary first; same source as `primary_sp` / `contributing`. */
export const buildSciencePrograms = (
  primary: { code: string; name: string; color: string | null } | null,
  contributing: { code: string; name: string; color: string | null }[],
): PfmScienceProgramItem[] => [
  ...(primary ? [{ ...pick(primary), primary: true }] : []),
  ...contributing.map((sp) => ({ ...pick(sp), primary: false })),
];

const pick = (sp: { code: string; name: string; color: string | null }) => ({
  code: sp.code,
  name: sp.name,
  color: sp.color,
});

export const deriveMappingState = (
  row: Pick<
    PfmRawRow,
    'has_alignment' | 'has_contribution' | 'mapping_complete'
  >,
): PfmMappingStateEnum => {
  if (!row.has_alignment) return PfmMappingStateEnum.PENDING;
  if (!row.has_contribution) return PfmMappingStateEnum.NO_SP_CONTRIBUTION;
  if (row.mapping_complete) return PfmMappingStateEnum.COMPLETE;
  // Started but not finished is still Pending (owner 2026-10-21: no separate "Incomplete").
  return PfmMappingStateEnum.PENDING;
};

const MAPPING_NOTES: Record<PfmMappingStateEnum, string> = {
  [PfmMappingStateEnum.COMPLETE]: 'CGIAR Portfolio split recorded',
  [PfmMappingStateEnum.PENDING]: 'Starts after PI approval',
  [PfmMappingStateEnum.NO_SP_CONTRIBUTION]:
    'PI declared no Science Program contribution · out of PRMS scope',
};

/** A started Pending mapping says what is missing; a not-started one keeps the default note. */
export const PFM_STARTED_PENDING_NOTE =
  'Started: projects or budget shares still missing';

export const deriveMappingNote = (
  state: PfmMappingStateEnum,
  started = false,
): string =>
  state === PfmMappingStateEnum.PENDING && started
    ? PFM_STARTED_PENDING_NOTE
    : MAPPING_NOTES[state];

export const deriveSpLine = (
  state: PfmMappingStateEnum,
  primary: PfmRawRow['primary_sp'],
  contributing: string[],
  started = true,
): string => {
  // Not started: no SP line, whatever is attached to the row.
  if (state === PfmMappingStateEnum.PENDING && !started) return '';
  if (state === PfmMappingStateEnum.NO_SP_CONTRIBUTION)
    return 'Not reported to PRMS';
  const parts: string[] = [];
  if (primary) parts.push(`${primary.code} ${primary.name} (primary)`);
  if (contributing.length) parts.push(contributing.join(', '));
  return parts.join(' · ');
};

/** Synced without a history row -> Pending Review (accepted != decided). */
export const derivePrmsStatus = (
  row: Pick<PfmRawRow, 'is_synced_to_prms' | 'prms_history_status'>,
): PfmPrmsStatusEnum => {
  if (!row.is_synced_to_prms) return PfmPrmsStatusEnum.NOT_SENT;
  switch ((row.prms_history_status ?? '').toUpperCase()) {
    case 'APPROVED':
      return PfmPrmsStatusEnum.APPROVED;
    case 'REJECTED':
      return PfmPrmsStatusEnum.REJECTED;
    default:
      return PfmPrmsStatusEnum.PENDING_REVIEW;
  }
};

export const derivePrmsHint = (
  status: PfmPrmsStatusEnum,
  justification: string | null,
): string => {
  if (status === PfmPrmsStatusEnum.REJECTED && justification)
    return justification;
  if (status === PfmPrmsStatusEnum.NOT_SENT) return 'Not synced to PRMS yet';
  return `PRMS: ${status}`;
};

export const derivePfmRow = (row: PfmRawRow): PfmDerivedRow => {
  const starLabel = deriveStarLabel(
    row.result_status_id,
    row.result_status_name,
  );
  const mappingState = deriveMappingState(row);
  const prmsStatus = derivePrmsStatus(row);
  const isOutOfScope = mappingState === PfmMappingStateEnum.NO_SP_CONTRIBUTION;
  const notSent = prmsStatus === PfmPrmsStatusEnum.NOT_SENT;
  return {
    starLabel,
    piLine: derivePiLine(starLabel, row.approved_at),
    approvedLabel: deriveApprovedLabel(starLabel, row.approved_at),
    mappingState,
    mappingNote: deriveMappingNote(mappingState, !!row.has_alignment),
    spLine: deriveSpLine(
      mappingState,
      row.primary_sp,
      row.contributing_sp_names,
      !!row.has_alignment,
    ),
    creator: row.creator ?? null,
    prmsStatus,
    prmsHint: derivePrmsHint(prmsStatus, row.prms_justification),
    updatedLabel: row.updated_at ? formatPfmDateTime(row.updated_at) : '—',
    isOutOfScope,
    // Ready to sync = mapping complete AND nothing in PRMS yet.
    isReady: mappingState === PfmMappingStateEnum.COMPLETE && notSent,
    // Need attention = what is still on us: in PRMS scope with nothing in PRMS, or returned by PRMS.
    // Exactly Mapping incomplete + Ready to sync + Rejected (out of scope needs nothing).
    needsAttention:
      (!isOutOfScope && notSent) || prmsStatus === PfmPrmsStatusEnum.REJECTED,
  };
};

export const matchesChip = (d: PfmDerivedState, chip: PfmChipEnum): boolean => {
  switch (chip) {
    case PfmChipEnum.NEED_ATTENTION:
      return d.needsAttention;
    // Mapping not finished (Pending or Incomplete), in PRMS scope, nothing in PRMS yet.
    case PfmChipEnum.MAPPING_INCOMPLETE:
      return (
        !d.isOutOfScope &&
        d.prmsStatus === PfmPrmsStatusEnum.NOT_SENT &&
        d.mappingState !== PfmMappingStateEnum.COMPLETE
      );
    case PfmChipEnum.READY_TO_SYNC:
      return d.isReady;
    case PfmChipEnum.REJECTED:
      return d.prmsStatus === PfmPrmsStatusEnum.REJECTED;
    case PfmChipEnum.SYNCED:
      return (
        d.prmsStatus === PfmPrmsStatusEnum.PENDING_REVIEW ||
        d.prmsStatus === PfmPrmsStatusEnum.APPROVED
      );
    // Still to be approved by the PI in STAR, in PRMS scope, nothing in PRMS yet.
    case PfmChipEnum.AWAITING_PI:
      return (
        !d.isOutOfScope &&
        d.prmsStatus === PfmPrmsStatusEnum.NOT_SENT &&
        d.starLabel !== PfmStarLabelEnum.APPROVED
      );
    // Declared no Science Program contribution and never sent: settled, nothing to do.
    // With Need attention and Synced it partitions every monitored result.
    case PfmChipEnum.NO_SP_CONTRIBUTION:
      return d.isOutOfScope && d.prmsStatus === PfmPrmsStatusEnum.NOT_SENT;
    default:
      return true;
  }
};

/**
 * Needs attention (in PRMS scope) -> out of scope -> PRMS Pending Review ->
 * PRMS Approved -> others. Out-of-scope rows also have nothing in PRMS, but
 * there is nothing to act on, so they rank after the actionable ones.
 */
export const rowRank = (d: PfmDerivedState): number => {
  if (d.needsAttention && !d.isOutOfScope) return 0;
  if (d.isOutOfScope) return 1;
  if (d.prmsStatus === PfmPrmsStatusEnum.PENDING_REVIEW) return 2;
  if (d.prmsStatus === PfmPrmsStatusEnum.APPROVED) return 3;
  return 4;
};
