import { PrmsSyncHistoryEvent } from '@shared/interfaces/prms-sync-history.interface';
import {
  deriveSyncVerb,
  formatSyncDayMonth,
  formatSyncStatus,
  formatSyncTimestamp,
  presentActorName,
  resolveActorName
} from './prms-sync-status.util';

function event(partial: Partial<PrmsSyncHistoryEvent> & Pick<PrmsSyncHistoryEvent, 'id' | 'event_source'>): PrmsSyncHistoryEvent {
  return {
    status: null,
    decision: null,
    occurred_at: '2026-08-28T09:12:00.000Z',
    decided_at: null,
    justification: null,
    actor_name: null,
    actor_name_short: null,
    reviewer_name: null,
    reviewer_role: null,
    ...partial
  };
}

describe('formatSyncStatus', () => {
  it('renders the three labels and never the raw vocabulary', () => {
    expect(formatSyncStatus(event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW' }))).toEqual({
      label: 'Pending Review',
      tone: 'warning'
    });
    expect(formatSyncStatus(event({ id: 2, event_source: 'PRMS', decision: 'APPROVE', status: 'APPROVED' }))).toEqual({
      label: 'Approved',
      tone: 'success'
    });
    expect(formatSyncStatus(event({ id: 3, event_source: 'PRMS', decision: 'REJECT' }))).toEqual({
      label: 'Rejected',
      tone: 'danger'
    });
    expect(formatSyncStatus(event({ id: 4, event_source: 'PRMS', status: 'APPROVED', decision: 'APPROVE' })).label).toBe('Approved');
    expect(formatSyncStatus(event({ id: 5, event_source: 'STAR', status: 'REJECTED' }))).toEqual({
      label: 'Rejected',
      tone: 'danger'
    });
  });

  it('reads decision for a pre-13ad5e8d PRMS row whose status is null', () => {
    expect(formatSyncStatus(event({ id: 1, event_source: 'PRMS', status: null, decision: 'APPROVE' }))).toEqual({
      label: 'Approved',
      tone: 'success'
    });
  });

  it('ignores a stray decision on a STAR row and reads status', () => {
    expect(formatSyncStatus(event({ id: 1, event_source: 'STAR', status: null, decision: 'APPROVE' }))).toEqual({
      label: 'Pending Review',
      tone: 'warning'
    });
    expect(formatSyncStatus(event({ id: 2, event_source: 'STAR', status: 'PENDING_REVIEW', decision: 'REJECT' })).label).toBe('Pending Review');
  });
});

describe('deriveSyncVerb', () => {
  const chronological = [
    event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Mariana Acosta', occurred_at: '2026-08-28T09:12:00.000Z' }),
    event({
      id: 2,
      event_source: 'PRMS',
      decision: 'REJECT',
      reviewer_name: 'Lucía Fernández',
      occurred_at: '2026-09-02T16:48:00.000Z'
    }),
    event({ id: 3, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Mariana Acosta', occurred_at: '2026-09-05T14:32:00.000Z' }),
    event({
      id: 4,
      event_source: 'PRMS',
      decision: 'APPROVE',
      status: 'APPROVED',
      reviewer_name: 'Daniel Okoth',
      occurred_at: '2026-09-06T10:00:00.000Z'
    }),
    event({ id: 5, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Manuel Almanzar', occurred_at: '2026-09-07T11:00:00.000Z' })
  ];

  it('covers all five verb branches', () => {
    expect(deriveSyncVerb(chronological[0], chronological)).toBe('synchronized the result for the first time');
    expect(deriveSyncVerb(chronological[1], chronological)).toBe('returned the mapping');
    expect(deriveSyncVerb(chronological[2], chronological)).toBe('re-synchronized the result after a rejection');
    expect(deriveSyncVerb(chronological[3], chronological)).toBe('approved the mapping');
    expect(deriveSyncVerb(chronological[4], chronological)).toBe('re-synchronized the result');
  });
});

describe('presentActorName', () => {
  it('uses actor_name_short for STAR and does not split actor_name', () => {
    expect(
      presentActorName(
        event({
          id: 1,
          event_source: 'STAR',
          actor_name: 'Ana Lopez Garcia Martinez',
          actor_name_short: 'Ana Lopez'
        })
      )
    ).toEqual({ short: 'Ana Lopez', full: 'Ana Lopez Garcia Martinez' });
  });

  it('uses a PRMS reviewer name unchanged for both short and full', () => {
    expect(
      presentActorName(
        event({
          id: 2,
          event_source: 'PRMS',
          reviewer_name: 'Cristian Gamboa',
          actor_name: null,
          actor_name_short: null
        })
      )
    ).toEqual({ short: 'Cristian Gamboa', full: 'Cristian Gamboa' });
  });
});

describe('formatSyncDayMonth', () => {
  it('formats as DD MMM using the local calendar parts', () => {
    const iso = '2026-09-11T10:05:00.000Z';
    const date = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(formatSyncDayMonth(iso)).toBe(`${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`);
  });
});

describe('resolveActorName', () => {
  it('uses actor_name for STAR and reviewer_name for PRMS', () => {
    expect(resolveActorName(event({ id: 1, event_source: 'STAR', actor_name: 'Manuel Almanzar', reviewer_name: 'Ignored' }))).toBe('Manuel Almanzar');
    expect(resolveActorName(event({ id: 2, event_source: 'PRMS', reviewer_name: 'Daniel Okoth', actor_name: 'Ignored' }))).toBe('Daniel Okoth');
  });

  it('returns null when the name is missing or blank', () => {
    expect(resolveActorName(event({ id: 1, event_source: 'STAR', actor_name: null }))).toBeNull();
    expect(resolveActorName(event({ id: 2, event_source: 'PRMS', reviewer_name: '   ' }))).toBeNull();
  });
});

describe('formatSyncTimestamp', () => {
  it('formats as DD MMM YYYY, HH:mm using the local calendar parts', () => {
    const iso = '2026-09-11T10:05:00.000Z';
    const date = new Date(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expected = `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    expect(formatSyncTimestamp(iso)).toBe(expected);
    expect(formatSyncTimestamp(iso)).toMatch(/^\d{2} \w{3} \d{4}, \d{2}:\d{2}$/);
  });
});
