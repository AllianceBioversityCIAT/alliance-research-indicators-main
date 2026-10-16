import { PrmsSyncHistoryEvent } from '@shared/interfaces/prms-sync-history.interface';

export type SyncStatusTone = 'success' | 'warning' | 'danger';

export interface SyncStatusLabel {
  label: string;
  tone: SyncStatusTone;
}

const PENDING: SyncStatusLabel = { label: 'Pending Review', tone: 'warning' };
const APPROVED: SyncStatusLabel = { label: 'Approved', tone: 'success' };
const REJECTED: SyncStatusLabel = { label: 'Rejected', tone: 'danger' };

/**
 * Sidebar palette, resolved to tokens that match those hex values:
 * pending #E69F00, approved #7CB580, rejected #CF0808.
 */
export const SYNC_TAG_COLOR: Record<SyncStatusTone, string> = {
  warning: 'var(--ac-warning-1)',
  success: 'var(--ac-green-300)',
  danger: 'var(--ac-red-1)'
};

function isApprove(value: string | null): boolean {
  return value === 'APPROVE' || value === 'APPROVED';
}

function isReject(value: string | null): boolean {
  return value === 'REJECT' || value === 'REJECTED';
}

/**
 * Pill label. STAR rows read `status`; PRMS rows read `decision`.
 * `status ?? decision` is wrong: a pre-13ad5e8d inbound row has status null,
 * and a STAR row can carry a stray decision that must not win.
 */
export function formatSyncStatus(event: Pick<PrmsSyncHistoryEvent, 'event_source' | 'status' | 'decision'>): SyncStatusLabel {
  const raw = event.event_source === 'STAR' ? event.status : event.decision;
  if (raw === 'PENDING_REVIEW') return PENDING;
  if (isApprove(raw)) return APPROVED;
  if (isReject(raw)) return REJECTED;
  return PENDING;
}

/**
 * Verb that follows the actor's name. `chronologicalEvents` is oldest-first
 * (the reverse of the modal's display order). One function, five branches.
 */
export function deriveSyncVerb(
  event: Pick<PrmsSyncHistoryEvent, 'id' | 'event_source' | 'decision'>,
  chronologicalEvents: PrmsSyncHistoryEvent[]
): string {
  if (event.event_source === 'PRMS') {
    if (isApprove(event.decision)) return 'approved the mapping';
    if (isReject(event.decision)) return 'returned the mapping';
    return '';
  }

  const index = chronologicalEvents.findIndex(row => row.id === event.id);
  const earlier = index > 0 ? chronologicalEvents.slice(0, index) : [];
  const hasEarlierStar = earlier.some(row => row.event_source === 'STAR');
  if (!hasEarlierStar) return 'synchronized the result for the first time';

  const previous = index > 0 ? chronologicalEvents[index - 1] : undefined;
  if (previous?.event_source === 'PRMS' && isReject(previous.decision)) {
    return 're-synchronized the result after a rejection';
  }
  return 're-synchronized the result';
}

/**
 * STAR short form is `actor_name_short`, built on the server from the first
 * token of each sec_users column. PRMS `reviewer_name` has no first/last
 * split, so it is used unchanged for both the visible name and the title.
 */
export function presentActorName(
  event: Pick<PrmsSyncHistoryEvent, 'event_source' | 'actor_name' | 'actor_name_short' | 'reviewer_name'>
): { short: string; full: string } | null {
  if (event.event_source === 'PRMS') {
    const name = event.reviewer_name?.trim() ?? '';
    return name.length > 0 ? { short: name, full: name } : null;
  }
  const full = event.actor_name?.trim() ?? '';
  const short = event.actor_name_short?.trim() ?? '';
  if (!full || !short) {
    return null;
  }
  return { short, full };
}

/** STAR → actor_name; PRMS → reviewer_name. Empty and null are unresolved. */
export function resolveActorName(event: Pick<PrmsSyncHistoryEvent, 'event_source' | 'actor_name' | 'reviewer_name'>): string | null {
  const raw = event.event_source === 'STAR' ? event.actor_name : event.reviewer_name;
  const name = raw?.trim() ?? '';
  return name.length > 0 ? name : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `DD MMM` in the viewer's local zone. The sidebar actor line has no year. */
export function formatSyncDayMonth(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()] ?? '';
  return `${dd} ${month}`;
}

/** `DD MMM YYYY, HH:mm` in the viewer's local zone. */
export function formatSyncTimestamp(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()] ?? '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dd} ${month} ${date.getFullYear()}, ${hh}:${mm}`;
}
