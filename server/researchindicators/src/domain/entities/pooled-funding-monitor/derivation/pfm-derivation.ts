import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmMappingStateEnum } from '../enum/pfm-mapping-state.enum';
import { PfmPrmsStatusEnum } from '../enum/pfm-prms-status.enum';
import { PfmStarLabelEnum } from '../enum/pfm-star-label.enum';
import { PfmStatusFilterEnum } from '../enum/pfm-status-filter.enum';

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
  /** `results.updated_at` is nullable: a missing stamp renders "—", it never throws. */
  updated_at: Date | null;
}

export interface PfmDerivedRow {
  /** One of PfmStarLabelEnum, or the STAR status name for any other id. */
  starLabel: string;
  piLine: string;
  mappingState: PfmMappingStateEnum;
  mappingNote: string;
  spLine: string;
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

export const deriveMappingState = (
  row: Pick<
    PfmRawRow,
    'has_alignment' | 'has_contribution' | 'mapping_complete'
  >,
): PfmMappingStateEnum => {
  if (!row.has_alignment) return PfmMappingStateEnum.NOT_STARTED;
  if (!row.has_contribution) return PfmMappingStateEnum.NO_SP_CONTRIBUTION;
  if (row.mapping_complete) return PfmMappingStateEnum.COMPLETE;
  return PfmMappingStateEnum.INCOMPLETE;
};

const MAPPING_NOTES: Record<PfmMappingStateEnum, string> = {
  [PfmMappingStateEnum.COMPLETE]: 'Pool funding split recorded',
  [PfmMappingStateEnum.INCOMPLETE]: 'Projects or budget shares still missing',
  [PfmMappingStateEnum.NOT_STARTED]: 'Starts after PI approval',
  [PfmMappingStateEnum.NO_SP_CONTRIBUTION]:
    'PI declared no Science Program contribution · out of PRMS scope',
};

export const deriveMappingNote = (state: PfmMappingStateEnum): string =>
  MAPPING_NOTES[state];

export const deriveSpLine = (
  state: PfmMappingStateEnum,
  primary: PfmRawRow['primary_sp'],
  contributing: string[],
): string => {
  if (state === PfmMappingStateEnum.NOT_STARTED) return '';
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
    mappingState,
    mappingNote: deriveMappingNote(mappingState),
    spLine: deriveSpLine(
      mappingState,
      row.primary_sp,
      row.contributing_sp_names,
    ),
    prmsStatus,
    prmsHint: derivePrmsHint(prmsStatus, row.prms_justification),
    updatedLabel: row.updated_at ? formatPfmDateTime(row.updated_at) : '—',
    isOutOfScope,
    isReady:
      starLabel === PfmStarLabelEnum.APPROVED &&
      mappingState === PfmMappingStateEnum.COMPLETE &&
      notSent,
    needsAttention: !isOutOfScope && notSent,
  };
};

export const matchesStatusFilter = (
  d: PfmDerivedState,
  filter: PfmStatusFilterEnum,
): boolean => {
  switch (filter) {
    case PfmStatusFilterEnum.READY_TO_SYNC:
      return d.isReady;
    case PfmStatusFilterEnum.MAPPING_PENDING:
      return (
        d.starLabel === PfmStarLabelEnum.APPROVED &&
        d.mappingState !== PfmMappingStateEnum.COMPLETE
      );
    case PfmStatusFilterEnum.SYNCED:
      return d.prmsStatus !== PfmPrmsStatusEnum.NOT_SENT;
    case PfmStatusFilterEnum.AWAITING_PI:
      return d.starLabel === PfmStarLabelEnum.SUBMITTED;
    case PfmStatusFilterEnum.UNDER_REVIEW:
      return d.starLabel === PfmStarLabelEnum.UNDER_REVIEW;
    case PfmStatusFilterEnum.DRAFT:
      return d.starLabel === PfmStarLabelEnum.DRAFT;
    default:
      return true;
  }
};

export const matchesChip = (d: PfmDerivedState, chip: PfmChipEnum): boolean => {
  switch (chip) {
    case PfmChipEnum.NEED_ATTENTION:
      return d.needsAttention;
    case PfmChipEnum.MAPPING_INCOMPLETE:
      return (
        d.starLabel === PfmStarLabelEnum.APPROVED &&
        !d.isOutOfScope &&
        d.mappingState !== PfmMappingStateEnum.COMPLETE
      );
    case PfmChipEnum.READY_TO_SYNC:
      return d.isReady;
    case PfmChipEnum.AWAITING_PI:
      return d.starLabel !== PfmStarLabelEnum.APPROVED;
    case PfmChipEnum.REJECTED:
      return d.prmsStatus === PfmPrmsStatusEnum.REJECTED;
    case PfmChipEnum.SYNCED:
      return (
        d.prmsStatus === PfmPrmsStatusEnum.PENDING_REVIEW ||
        d.prmsStatus === PfmPrmsStatusEnum.APPROVED
      );
    default:
      return true;
  }
};

/** Needs attention -> out of scope -> PRMS Pending Review -> PRMS Approved -> others. */
export const rowRank = (d: PfmDerivedState): number => {
  if (d.needsAttention) return 0;
  if (d.isOutOfScope) return 1;
  if (d.prmsStatus === PfmPrmsStatusEnum.PENDING_REVIEW) return 2;
  if (d.prmsStatus === PfmPrmsStatusEnum.APPROVED) return 3;
  return 4;
};
