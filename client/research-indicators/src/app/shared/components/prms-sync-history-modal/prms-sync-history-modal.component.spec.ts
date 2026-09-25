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
    reviewer_name: null,
    reviewer_role: null,
    ...partial
  };
}

const mockupEvents: PrmsSyncHistoryEvent[] = [
  event({
    id: 1,
    event_source: 'STAR',
    status: 'PENDING_REVIEW',
    actor_name: 'Mariana Acosta',
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

  function headlines(): string[] {
    return Array.from(document.body.querySelectorAll('[data-testid="prms-history-headline"]')).map(node => node.textContent?.trim() ?? '');
  }

  it('stays closed until visible flips, then lists the four events newest first', () => {
    expect(document.body.querySelector('[data-testid="prms-history-entry"]')).toBeNull();

    open();

    const entries = document.body.querySelectorAll('[data-testid="prms-history-entry"]');
    expect(entries).toHaveLength(4);
    expect(headlines()).toEqual([
      'PRMS approved the mapping',
      'Mapping re-synced after rejection',
      'PRMS returned the mapping',
      'First synchronization'
    ]);
    expect(document.body.querySelector('[data-testid="prms-history-subheader"]')?.textContent?.trim()).toBe('4 synchronizations · PRMS ID 28800');
    expect(document.body.textContent).toContain(formatSyncTimestamp('2026-09-11T10:05:00.000Z'));
    expect(document.body.textContent).not.toContain('with changes');
    expect(document.body.textContent).not.toContain('(PI)');
  });

  it('renders a comment only when justification is non-empty and preserves whitespace', () => {
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
    expect(comments[0].textContent).toContain('REVIEWER COMMENT');
    expect(comments[0].textContent).toContain('Ada Lovelace');
    const body = comments[0].querySelector('.prms-history__comment-body');
    expect(body?.textContent).toBe(spaced);
    expect(document.body.querySelector('.prms-history__comment img')).toBeNull();
  });

  it('renders an inbound subline as the name only when reviewer_role is null', () => {
    open();
    const sublines = Array.from(document.body.querySelectorAll('[data-testid="prms-history-subline"]')).map(node => node.textContent?.trim());
    expect(sublines[0]).toBe('Daniel Okoth');
    expect(sublines[0]?.endsWith('·')).toBe(false);
    expect(sublines[2]).toBe('Lucía Fernández');
    expect(sublines[3]).toBe('Mariana Acosta · PRMS ID 28800 assigned');
    expect(sublines[1]).toBe('Mariana Acosta · mapping corrected and sent again');
  });

  it('appends the reviewer role only when it is present', () => {
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
    expect(document.body.querySelector('[data-testid="prms-history-subline"]')?.textContent?.trim()).toBe(
      'Daniel Okoth · SP02 Science Program reviewer'
    );
  });

  it('escapes justification as text', () => {
    fixture.componentRef.setInput(
      'history',
      history([event({ id: 1, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Ada', justification: '<img src=x onerror=alert(1)>' })])
    );
    open();
    expect(document.body.querySelector('[data-testid="prms-history-comment"] img')).toBeNull();
    expect(document.body.querySelector('[data-testid="prms-history-comment"]')?.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('does not render See what changed', () => {
    open();
    expect(document.body.textContent).not.toContain('See what changed');
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
    expect(document.body.textContent).not.toContain('See what changed');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
  });
});
