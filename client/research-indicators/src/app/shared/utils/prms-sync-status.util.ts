import { PrmsSyncHistoryEvent } from '@shared/interfaces/prms-sync-history.interface';

export type SyncStatusTone = 'success' | 'warning' | 'danger';

export interface SyncStatusLabel {
  label: string;
  tone: SyncStatusTone;
}

export interface SyncCardTitle {
  title: string;
  tone: 'success' | 'warning';
}

const PENDING: SyncStatusLabel = { label: 'Pending Review', tone: 'warning' };
const APPROVED: SyncStatusLabel = { label: 'Approved', tone: 'success' };
const REJECTED: SyncStatusLabel = { label: 'Rejected', tone: 'danger' };

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

export function deriveCardTitle(event: Pick<PrmsSyncHistoryEvent, 'event_source' | 'decision'>): SyncCardTitle {
  if (event.event_source === 'PRMS' && isApprove(event.decision)) {
    return { title: 'Approved by PRMS', tone: 'success' };
  }
  if (event.event_source === 'PRMS' && isReject(event.decision)) {
    return { title: 'Returned by PRMS', tone: 'warning' };
  }
  return { title: 'Synchronized with PRMS', tone: 'success' };
}

/**
 * `chronologicalEvents` is oldest-first (the reverse of the server's display order).
 */
export function deriveHeadline(
  event: Pick<PrmsSyncHistoryEvent, 'id' | 'event_source' | 'decision'>,
  chronologicalEvents: PrmsSyncHistoryEvent[]
): string {
  if (event.event_source === 'PRMS') {
    if (isApprove(event.decision)) return 'PRMS approved the mapping';
    if (isReject(event.decision)) return 'PRMS returned the mapping';
    return 'Synchronized with PRMS';
  }

  const index = chronologicalEvents.findIndex(row => row.id === event.id);
  const earlier = index > 0 ? chronologicalEvents.slice(0, index) : [];
  const hasEarlierStar = earlier.some(row => row.event_source === 'STAR');
  if (!hasEarlierStar) return 'First synchronization';

  const previous = chronologicalEvents[index - 1];
  if (previous?.event_source === 'PRMS' && isReject(previous.decision)) {
    return 'Mapping re-synced after rejection';
  }
  return 'Mapping re-synced';
}

/** STAR → actor_name; PRMS → reviewer_name. Empty and null are unresolved. */
export function resolveActorName(event: Pick<PrmsSyncHistoryEvent, 'event_source' | 'actor_name' | 'reviewer_name'>): string | null {
  const raw = event.event_source === 'STAR' ? event.actor_name : event.reviewer_name;
  const name = raw?.trim() ?? '';
  return name.length > 0 ? name : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `DD MMM YYYY, HH:mm` in the viewer's local zone. */
export function formatSyncTimestamp(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()] ?? '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${dd} ${month} ${date.getFullYear()}, ${hh}:${mm}`;
}
