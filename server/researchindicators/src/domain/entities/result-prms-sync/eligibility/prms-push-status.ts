// @akili-spec changes/prms-pending-review-lock

/**
 * One year's PRMS push status, derived from history events alone
 * (R-PRL-001). The reader hands events over already in `id` ascending
 * order. This function never compares ids and never reads a timestamp:
 * it keeps that order and stable-sorts only on `imported` (design §5.1).
 */
export type PrmsPushStatusName =
  | 'never_pushed'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface PrmsPushEvent {
  kind: 'push' | 'decision';
  /**
   * `APPROVE` and `REJECT` are the only deciding verbs (P-11). Any other
   * value, including the `APPROVED` / `REJECTED` status badges, is not a
   * decision (S-6).
   */
  decision: string | null;
  year: number;
  imported: boolean;
}

export interface PrmsPushStatus {
  year: number;
  status: PrmsPushStatusName;
  resubmittable: boolean;
}

const decides = (event: PrmsPushEvent): boolean => {
  if (event.kind === 'push') {
    return true;
  }
  return event.decision === 'APPROVE' || event.decision === 'REJECT';
};

const statusOf = (event: PrmsPushEvent | undefined): PrmsPushStatusName => {
  if (!event || event.kind === 'push') {
    return event ? 'pending_review' : 'never_pushed';
  }
  if (event.decision === 'APPROVE') {
    return 'approved';
  }
  return 'rejected';
};

export function derivePrmsPushStatus(
  events: readonly PrmsPushEvent[],
  year: number,
): PrmsPushStatus {
  const ordered = events
    .filter((event) => event.year === year && decides(event))
    .sort((left, right) => Number(right.imported) - Number(left.imported));
  const status = statusOf(ordered[ordered.length - 1]);
  return {
    year,
    status,
    resubmittable: status === 'never_pushed' || status === 'rejected',
  };
}
