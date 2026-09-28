import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PrmsSyncHistoryEvent, PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { formatSyncTimestamp } from '@shared/utils/prms-sync-status.util';
import { PrmsSyncHistoryModalComponent } from './prms-sync-history-modal.component';

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
    changes: null,
    ...partial
  };
}

const mockupEvents: PrmsSyncHistoryEvent[] = [
  event({
    id: 1,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    actor_name: 'Mariana Acosta',
    actor_name_short: 'Mariana Acosta',
    occurred_at: '2026-08-28T09:12:00.000Z'
  }),
  event({
    id: 2,
    event_source: 'PRMS',
    decision: 'REJECT',
    reviewer_name: 'Lucía Fernández',
    reviewer_role: null,
    occurred_at: '2026-09-02T16:48:00.000Z',
    justification: 'Update the result metadata.'
  }),
  event({
    id: 3,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    actor_name: 'Mariana Acosta',
    actor_name_short: 'Mariana Acosta',
    occurred_at: '2026-09-05T14:32:00.000Z'
  }),
  event({
    id: 4,
    event_source: 'PRMS',
    decision: 'APPROVE',
    status: 'APPROVED',
    reviewer_name: 'Daniel Okoth',
    reviewer_role: null,
    occurred_at: '2026-09-11T10:05:00.000Z',
    decided_at: '2026-09-11T10:05:00.000Z',
    justification: 'Indicator reassigned.'
  }),
  event({
    id: 5,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    actor_name: 'Manuel Almanzar',
    actor_name_short: 'Manuel Almanzar',
    occurred_at: '2026-09-12T11:00:00.000Z'
  })
];

function history(events: PrmsSyncHistoryEvent[], code: number | null = 28800): PrmsSyncHistoryResponse {
  return {
    prms_result_code: code,
    prms_phase_id: 6,
    sync_count: events.filter(row => row.event_source === 'STAR').length,
    events
  };
}

function text(selector: string): string {
  return (document.body.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('PrmsSyncHistoryModalComponent', () => {
  let fixture: ComponentFixture<PrmsSyncHistoryModalComponent>;
  let trigger: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrmsSyncHistoryModalComponent, NoopAnimationsModule]
    }).compileComponents();

    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.dataset['testid'] = 'history-trigger';
    document.body.appendChild(trigger);

    fixture = TestBed.createComponent(PrmsSyncHistoryModalComponent);
    fixture.componentRef.setInput('history', history(mockupEvents));
    fixture.componentRef.setInput('visible', false);
    fixture.componentRef.setInput('returnFocusTo', trigger);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.querySelectorAll('.p-dialog, .p-dialog-mask, .p-component-overlay').forEach(node => node.remove());
    trigger.remove();
  });

  function open(): void {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  }

  function sentences(): string[] {
    return Array.from(document.body.querySelectorAll('[data-testid="prms-history-sentence"]')).map(node =>
      (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    );
  }

  it('stays closed until visible flips, then lists every event newest first with the five verbs', () => {
    expect(document.body.querySelector('[data-testid="prms-history-entry"]')).toBeNull();

    open();

    expect(document.body.querySelectorAll('[data-testid="prms-history-entry"]')).toHaveLength(5);
    expect(sentences()).toEqual([
      'Manuel Almanzar re-synchronized the result',
      'Daniel Okoth approved the mapping',
      'Mariana Acosta re-synchronized the result after a rejection',
      'Lucía Fernández returned the mapping',
      'Mariana Acosta synchronized the result for the first time'
    ]);
    expect(text('[data-testid="prms-history-title"]')).toBe('Synchronization history');
    expect(text('[data-testid="prms-history-subheader"]')).toBe('5 events · PRMS code 28800');
    expect(document.body.textContent).toContain(formatSyncTimestamp('2026-09-11T10:05:00.000Z'));
    expect(document.body.textContent).not.toContain('synchronization');
    expect(document.body.textContent).not.toContain('PRMS ID');
    expect(document.body.textContent).not.toContain('First synchronization');
    expect(document.body.textContent).not.toContain('Mapping re-synced');
    expect(document.body.querySelector('.prms-history__dot')).toBeNull();
    expect(document.body.textContent).not.toContain('REVIEWER COMMENT');
    const close = document.body.querySelector('[data-testid="prms-history-close"]') as HTMLButtonElement;
    expect(close).not.toBeNull();
    expect(close.classList.contains('bg-transparent')).toBe(true);
    expect(close.classList.contains('atc-light-blue-400')).toBe(true);
    expect(close.classList.contains('abc-primary-blue-700')).toBe(false);
    expect(close.className).not.toMatch(/bg-\[#/);
  });

  it('paints STAR avatars green and PRMS avatars grey, and takes initials from the two name parts', () => {
    open();
    const avatars = Array.from(document.body.querySelectorAll<HTMLElement>('[data-testid="prms-history-avatar"]'));
    const star = avatars.filter(node => node.dataset['source'] === 'STAR');
    const prms = avatars.filter(node => node.dataset['source'] === 'PRMS');
    expect(star.length).toBeGreaterThan(0);
    expect(prms.length).toBeGreaterThan(0);
    star.forEach(node => {
      expect(node.classList.contains('abc-green-300')).toBe(true);
      expect(node.classList.contains('abc-grey-800')).toBe(false);
    });
    prms.forEach(node => {
      expect(node.classList.contains('abc-grey-800')).toBe(true);
      expect(node.classList.contains('abc-green-300')).toBe(false);
    });
    expect(avatars[0].textContent?.trim()).toBe('MA');
    expect(avatars[1].textContent?.trim()).toBe('DO');
    expect(avatars[3].textContent?.trim()).toBe('LF');
  });

  it('uses actor_name_short for STAR initials when the full name has more than two tokens', () => {
    fixture.componentRef.setInput(
      'history',
      history([
        event({
          id: 1,
          event_source: 'STAR',
          status: 'PENDING_REVIEW',
          actor_name: 'Maria Elena Ruiz',
          actor_name_short: 'Maria Ruiz'
        }),
        event({
          id: 2,
          event_source: 'PRMS',
          decision: 'REJECT',
          reviewer_name: 'Lucía Fernández Rojas'
        })
      ])
    );
    open();
    const avatars = Array.from(document.body.querySelectorAll<HTMLElement>('[data-testid="prms-history-avatar"]'));
    const bySource = (source: string) => avatars.find(node => node.dataset['source'] === source);
    expect(bySource('STAR')?.textContent?.trim()).toBe('MR');
    expect(bySource('PRMS')?.textContent?.trim()).toBe('LF');
  });

  it('renders a comment only when justification is non-empty, without a reviewer-comment header', () => {
    const spaced = 'line one\nline two';
    fixture.componentRef.setInput(
      'history',
      history([
        event({ id: 10, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Ada Lovelace', justification: spaced }),
        event({ id: 11, event_source: 'PRMS', decision: 'APPROVE', reviewer_name: 'Grace', justification: null }),
        event({ id: 12, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Manuel', justification: '' })
      ])
    );
    open();

    const comments = document.body.querySelectorAll('[data-testid="prms-history-comment"]');
    expect(comments).toHaveLength(1);
    expect(comments[0].textContent).toContain('Comment:');
    expect(comments[0].textContent).toContain(spaced);
    expect(comments[0].textContent).not.toContain('REVIEWER COMMENT');
    expect(comments[0].textContent).not.toContain('Ada Lovelace');
    expect(document.body.querySelector('[data-testid="prms-history-comment"] script')).toBeNull();
    expect(document.body.textContent).not.toContain('REVIEWER COMMENT');
  });

  it('leaves no role and no separator when reviewer_role is null', () => {
    open();
    expect(document.body.querySelector('[data-testid="prms-history-role"]')).toBeNull();
    document.body.querySelectorAll('[data-testid="prms-history-status-row"]').forEach(row => {
      expect(row.textContent).not.toContain('·');
      expect(row.textContent?.trim().endsWith('·')).toBe(false);
    });
    expect(document.body.textContent).not.toContain('(PI)');
  });

  it('shows reviewer_role as quiet text only when it is present', () => {
    fixture.componentRef.setInput(
      'history',
      history([
        event({
          id: 1,
          event_source: 'PRMS',
          decision: 'APPROVE',
          reviewer_name: 'Daniel Okoth',
          reviewer_role: 'SP02 Science Program reviewer'
        })
      ])
    );
    open();
    const role = document.body.querySelector('[data-testid="prms-history-role"]');
    expect(role?.textContent?.trim()).toBe('SP02 Science Program reviewer');
    expect(role?.classList.contains('atc-grey-600')).toBe(true);
    expect(text('[data-testid="prms-history-status-row"]')).not.toMatch(/·/);
  });

  it('renders a script-tagged justification as text', () => {
    const payload = '<script>alert(1)</script>';
    fixture.componentRef.setInput(
      'history',
      history([event({ id: 1, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Ada', justification: payload })])
    );
    open();
    const comment = document.body.querySelector('[data-testid="prms-history-comment"]');
    expect(comment?.querySelector('script')).toBeNull();
    expect(comment?.textContent).toContain(payload);
  });

  it('does not render See what changed when changes is null or empty, including on a STAR row', () => {
    fixture.componentRef.setInput(
      'history',
      history([
        event({ id: 1, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Ada', changes: null }),
        event({ id: 2, event_source: 'PRMS', decision: 'APPROVE', reviewer_name: 'Bea', changes: {} }),
        event({
          id: 3,
          event_source: 'STAR',
          status: 'PENDING_REVIEW',
          actor_name: 'Manuel',
          changes: { alpha_field: { before: 'a', after: 'b' } }
        })
      ])
    );
    open();
    expect(document.body.querySelector('[data-testid="prms-history-changes-link"]')).toBeNull();
    expect(document.body.textContent).not.toContain('See what changed');
  });

  it('opens the changes screen from a PRMS row whose changes payload is non-empty', () => {
    const scriptValue = '<script>alert(1)</script>';
    fixture.componentRef.setInput(
      'history',
      history([
        event({ id: 1, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Ada Lovelace', reviewer_role: 'PI', changes: null }),
        event({
          id: 2,
          event_source: 'PRMS',
          decision: 'APPROVE',
          reviewer_name: 'Daniel Okoth',
          reviewer_role: 'SP02 Science Program reviewer',
          occurred_at: '2026-09-11T10:05:00.000Z',
          decided_at: '2026-09-11T10:05:00.000Z',
          changes: {
            alpha_field: { before: 'old', after: 'new' },
            beta_field: { before: scriptValue, after: 'kept' }
          }
        })
      ])
    );
    open();

    const links = document.body.querySelectorAll('[data-testid="prms-history-changes-link"]');
    expect(links).toHaveLength(1);
    (links[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="prms-history-entry"]')).toBeNull();
    expect(text('[data-testid="prms-history-changes-title"]')).toBe('What changed in PRMS');
    expect(text('[data-testid="prms-history-back"]')).toBe('← Synchronization history');
    expect(document.body.querySelectorAll('[data-testid="prms-history-back"]')).toHaveLength(1);
    expect(document.body.querySelector('.prms-history__footer [data-testid="prms-history-back"]')).toBeNull();
    const meta = text('[data-testid="prms-history-changes-meta"]');
    expect(meta).toContain('Daniel Okoth');
    expect(meta).toContain(formatSyncTimestamp('2026-09-11T10:05:00.000Z'));
    expect(meta).toContain('Approved');
    expect(meta).not.toContain('SP02');
    expect(meta).not.toContain('PI');
    expect(document.body.textContent).toContain('Reviewers can only edit mapping fields.');
    const rows = Array.from(document.body.querySelectorAll('[data-testid="prms-history-change-row"]'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('alpha_field');
    expect(rows[0].textContent).toContain('old');
    expect(rows[0].textContent).toContain('new');
    const before = rows[1].querySelector('.prms-history__before');
    const after = rows[1].querySelector('.prms-history__after');
    expect(before?.classList.contains('line-through')).toBe(true);
    expect(before?.textContent).toContain(scriptValue);
    expect(before?.querySelector('script')).toBeNull();
    expect(after?.textContent?.trim()).toBe('kept');
    expect(document.body.querySelector('[data-testid="prms-history-changes-table"]')?.classList.contains('prms-history__table-wrap')).toBe(true);

    (document.body.querySelector('[data-testid="prms-history-back"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="prms-history-changes"]')).toBeNull();
    expect(document.body.querySelectorAll('[data-testid="prms-history-entry"]').length).toBeGreaterThan(0);
    expect(document.body.querySelector('[data-testid="prms-history-back"]')).toBeNull();
  });

  // Owner decision 2026-09-28: approvals only. A rejection sends the mapping
  // back instead of editing it, so there is nothing adopted to show.
  it('does not offer the changes link on a REJECT even when changes are present', () => {
    fixture.componentRef.setInput(
      'history',
      history([
        event({
          id: 9,
          event_source: 'PRMS',
          decision: 'REJECT',
          reviewer_name: 'Lucia Fernandez',
          occurred_at: '2026-09-02T16:48:00.000Z',
          decided_at: '2026-09-02T16:48:00.000Z',
          changes: { alpha_field: { before: 'old', after: 'new' } }
        })
      ])
    );
    open();

    expect(document.body.querySelector('[data-testid="prms-history-changes-link"]')).toBeNull();
  });

  it('renders the empty state when the changes screen is open for a null payload', () => {
    open();
    expect(document.body.querySelector('[data-testid="prms-history-changes-link"]')).toBeNull();

    fixture.componentInstance.openChanges(
      event({
        id: 40,
        event_source: 'PRMS',
        decision: 'APPROVE',
        reviewer_name: 'Ada Lovelace',
        reviewer_role: 'PI',
        decided_at: '2026-09-11T10:05:00.000Z',
        changes: null
      })
    );
    fixture.detectChanges();

    const empty = document.body.querySelector('[data-testid="prms-history-changes-empty"]');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain('No field-level detail');
    expect(empty?.textContent).toContain("PRMS recorded the decision but sent no list of changes. The reviewer's comment is on the history entry.");
    expect(empty?.getAttribute('role')).not.toBe('alert');
    expect(document.body.querySelector('[role="alert"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="prms-history-change-row"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="prms-history-entry"]')).toBeNull();
    const meta = document.body.querySelector('[data-testid="prms-history-changes-meta"]');
    expect(meta?.textContent).toContain('Ada Lovelace');
    expect(meta?.textContent).not.toContain('PI');
  });

  it('counts one event without a dangling separator when the PRMS code is null', () => {
    fixture.componentRef.setInput('history', history([event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Ada' })], null));
    open();
    expect(text('[data-testid="prms-history-subheader"]')).toBe('1 event');
  });

  it('closes on the Close button and returns focus to the trigger', async () => {
    trigger.focus();
    open();
    expect(document.body.querySelector('[data-testid="prms-history-entry"]')).not.toBeNull();

    const closed: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe(value => closed.push(value));
    (document.body.querySelector('[data-testid="prms-history-close"]') as HTMLButtonElement).click();
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();

    expect(closed).toContain(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    open();
    const closed: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe(value => closed.push(value));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();

    expect(closed).toContain(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });
});
