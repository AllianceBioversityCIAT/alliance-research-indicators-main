import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { environment } from '@envs/environment';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { PrmsSyncHistoryEvent, PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { formatSyncDayMonth } from '@shared/utils/prms-sync-status.util';
import { PrmsSyncCardComponent } from './prms-sync-card.component';

function event(partial: Partial<PrmsSyncHistoryEvent> & Pick<PrmsSyncHistoryEvent, 'id' | 'event_source'>): PrmsSyncHistoryEvent {
  return {
    status: null,
    decision: null,
    occurred_at: '2026-09-11T10:05:00.000Z',
    decided_at: null,
    justification: null,
    actor_name: null,
    actor_name_short: null,
    reviewer_name: null,
    reviewer_role: null,
    ...partial
  };
}

function history(partial: Partial<PrmsSyncHistoryResponse> = {}): PrmsSyncHistoryResponse {
  return {
    prms_result_code: 452,
    prms_phase_id: 6,
    sync_count: 1,
    events: [
      event({
        id: 1,
        event_source: 'STAR',
        status: 'PENDING_REVIEW',
        actor_name: 'David Felipe Casañas Hernandez',
        actor_name_short: 'David Casañas'
      })
    ],
    ...partial
  };
}

const RAW_ENUMS = ['PENDING_REVIEW', 'APPROVE', 'REJECT', 'APPROVED', 'REJECTED'];
const DELETED_TITLES = ['Synchronized with PRMS', 'Approved by PRMS', 'Returned by PRMS'];

function text(host: HTMLElement): string {
  return host.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function expectDeletedChrome(host: HTMLElement): void {
  expect(host.querySelector('[data-testid="prms-sync-title"]')).toBeNull();
  expect(host.querySelector('[data-testid="prms-sync-badge"]')).toBeNull();
  expect(host.querySelector('[data-testid="prms-sync-advisory"]')).toBeNull();
  expect(host.querySelector('[data-testid="prms-sync-pill"]')).toBeNull();
  expect(host.querySelector('button')).toBeNull();
  expect(host.textContent).not.toContain('Science Program updated this mapping');
  expect(host.textContent).not.toContain('Sync #');
  expect(host.textContent).not.toContain('PRMS ID');
  for (const title of DELETED_TITLES) {
    expect(host.textContent).not.toContain(title);
  }
  const section = host.querySelector('[data-testid="prms-sync-card"]') as HTMLElement;
  expect(section.className).not.toMatch(/rounded|shadow|bg-|border/);
}

function expectBox(host: HTMLElement, modifier: 'neutral' | 'approved' | 'rejected'): void {
  const section = host.querySelector('[data-testid="prms-sync-card"]') as HTMLElement;
  expect(section.classList.contains(`prms-sync-section--${modifier}`)).toBe(true);
  for (const other of ['neutral', 'approved', 'rejected'] as const) {
    if (other !== modifier) {
      expect(section.classList.contains(`prms-sync-section--${other}`)).toBe(false);
    }
  }
}

function expectTag(host: HTMLElement, label: string, color: string, card: ComponentFixture<PrmsSyncCardComponent>): void {
  const tag = host.querySelector('[data-testid="prms-sync-status"]');
  expect(tag?.tagName).toBe('APP-CUSTOM-TAG');
  const chip = tag?.querySelector('div') as HTMLElement;
  expect(chip.getAttribute('style')).toContain('width: min-content');
  expect(chip.textContent?.replace(/\s+/g, ' ').trim()).toBe(label);
  const debug = card.debugElement.query(By.directive(CustomTagComponent));
  expect(debug.componentInstance.statusName).toBe(label);
  expect(debug.componentInstance.statusColor).toBe(color);
  expect(debug.componentInstance.statusBorder).toBe(color);
}

describe('PrmsSyncCardComponent', () => {
  let fixture: ComponentFixture<PrmsSyncCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrmsSyncCardComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(PrmsSyncCardComponent);
  });

  function render(value: PrmsSyncHistoryResponse): HTMLElement {
    fixture.componentRef.setInput('history', value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a flat pending section: eyebrow, tag, short title-cased actor, code and text links', () => {
    const configuredHost = environment.prmsUrl;
    (environment as { prmsUrl: string }).prmsUrl = 'https://prtest.example.test';
    try {
      const host = render(history());
      const when = formatSyncDayMonth('2026-09-11T10:05:00.000Z');

      expectDeletedChrome(host);
      expectBox(host, 'neutral');
      expect(text(host.querySelector('[data-testid="prms-sync-eyebrow"]') as HTMLElement)).toBe('PRMS sync #1');
      expectTag(host, 'Pending Review', 'var(--ac-warning-1)', fixture);

      const actor = host.querySelector('[data-testid="prms-sync-actor"]') as HTMLElement;
      expect(text(actor)).toBe(`by David Casañas · ${when}`);
      expect(actor.getAttribute('title')).toBe('David Felipe Casañas Hernandez');
      expect(actor.textContent).not.toContain('Felipe');

      const code = host.querySelector('[data-testid="prms-sync-code"]') as HTMLElement;
      expect(text(code)).toContain('PRMS code:');
      expect(text(code)).toContain('452');
      const value = code.querySelector('.prms-sync-section__code-value') as HTMLElement;
      expect(value.style.fontVariantNumeric).toBe('tabular-nums');

      const open = host.querySelector('[data-testid="prms-sync-open"]') as HTMLAnchorElement;
      expect(open.tagName).toBe('A');
      expect(open.querySelector('svg')).not.toBeNull();
      expect(open.textContent).toContain('Open result in PRMS');
      expect(open.getAttribute('href')).toBe('https://prtest.example.test/reports/result-details/452?phase=6');
      expect(open.getAttribute('target')).toBe('_blank');
      expect(open.getAttribute('rel')).toBe('noopener noreferrer');

      const historyLink = host.querySelector('[data-testid="prms-sync-history-link"]') as HTMLAnchorElement;
      expect(historyLink.tagName).toBe('A');
      expect(historyLink.querySelector('svg')).not.toBeNull();
      expect(historyLink.textContent).toContain('View full sync history');
    } finally {
      (environment as { prmsUrl: string }).prmsUrl = configuredHost;
    }
  });

  it('renders Approved on the green tag and keeps the reviewer short name', () => {
    const host = render(
      history({
        sync_count: 2,
        events: [event({ id: 2, event_source: 'PRMS', decision: 'APPROVE', status: 'APPROVED', reviewer_name: 'Daniel Okoth' })]
      })
    );

    expectDeletedChrome(host);
    expectBox(host, 'approved');
    expect(text(host.querySelector('[data-testid="prms-sync-eyebrow"]') as HTMLElement)).toBe('PRMS sync #2');
    expectTag(host, 'Approved', 'var(--ac-green-300)', fixture);
    const actor = host.querySelector('[data-testid="prms-sync-actor"]') as HTMLElement;
    expect(text(actor)).toContain('by Daniel Okoth ·');
    expect(actor.getAttribute('title')).toBe('Daniel Okoth');
  });

  it('renders Rejected on the red tag', () => {
    const host = render(
      history({
        events: [event({ id: 3, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Lucía Fernández' })]
      })
    );

    expectDeletedChrome(host);
    expectBox(host, 'rejected');
    expectTag(host, 'Rejected', 'var(--ac-red-1)', fixture);
    expect(text(host.querySelector('[data-testid="prms-sync-actor"]') as HTMLElement)).toContain('by Lucía Fernández ·');
  });

  it('falls back to Pending Review when a PRMS decision is outside APPROVE/REJECT', () => {
    const host = render(history({ events: [event({ id: 4, event_source: 'PRMS', decision: 'WEIRD', reviewer_name: 'Ada Lovelace' })] }));

    expectDeletedChrome(host);
    expectBox(host, 'neutral');
    expectTag(host, 'Pending Review', 'var(--ac-warning-1)', fixture);
    expect(host.textContent).not.toContain('WEIRD');
  });

  it('renders the server short name instead of splitting the full name', () => {
    const host = render(
      history({
        events: [
          event({
            id: 9,
            event_source: 'STAR',
            status: 'PENDING_REVIEW',
            actor_name: 'Ana Lopez Garcia Martinez',
            actor_name_short: 'Ana Lopez'
          })
        ]
      })
    );

    const actor = host.querySelector('[data-testid="prms-sync-actor"]') as HTMLElement;
    expect(text(actor)).toContain('by Ana Lopez ·');
    expect(text(actor)).not.toContain('Ana Garcia');
    expect(actor.getAttribute('title')).toBe('Ana Lopez Garcia Martinez');
  });

  it('renders a PRMS reviewer name unchanged for both the line and the title', () => {
    const host = render(
      history({
        events: [event({ id: 10, event_source: 'PRMS', decision: 'APPROVE', status: 'APPROVED', reviewer_name: 'Cristian Gamboa' })]
      })
    );

    const actor = host.querySelector('[data-testid="prms-sync-actor"]') as HTMLElement;
    expect(text(actor)).toContain('by Cristian Gamboa ·');
    expect(actor.getAttribute('title')).toBe('Cristian Gamboa');
  });

  it('omits the actor line when the STAR name is unresolved', () => {
    const host = render(history({ events: [event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: null })] }));

    expect(host.querySelector('[data-testid="prms-sync-actor"]')).toBeNull();
    expect(host.textContent).not.toContain('by null');
    expect(host.textContent).not.toContain('by undefined');
  });

  it('keeps the PRMS code line and hides the link when phase is null', () => {
    const host = render(history({ prms_result_code: 452, prms_phase_id: null }));

    expect(host.querySelector('[data-testid="prms-sync-open"]')).toBeNull();
    expect(host.querySelector('button')).toBeNull();
    const code = host.querySelector('[data-testid="prms-sync-code"]') as HTMLElement;
    expect(text(code)).toContain('PRMS code:');
    expect(text(code)).toContain('452');
    expect(code.textContent).not.toContain('PRMS ID');
  });

  it('hides the link and the code line when the result code is null', () => {
    const host = render(history({ prms_result_code: null, prms_phase_id: 6 }));

    expect(host.querySelector('[data-testid="prms-sync-open"]')).toBeNull();
    expect(host.querySelector('[data-testid="prms-sync-code"]')).toBeNull();
  });

  it('hides the #N suffix when sync_count is 0 and keeps the eyebrow', () => {
    const host = render(history({ sync_count: 0 }));
    const eyebrow = host.querySelector('[data-testid="prms-sync-eyebrow"]') as HTMLElement;
    expect(text(eyebrow)).toBe('PRMS sync');
    expect(eyebrow.textContent).not.toContain('#');
    expect(host.querySelector('[data-testid="prms-sync-badge"]')).toBeNull();
  });

  it('does not render raw status enums', () => {
    const host = render(
      history({
        events: [
          event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Ada Lovelace' }),
          event({ id: 2, event_source: 'PRMS', decision: 'APPROVE', status: 'APPROVED' }),
          event({ id: 3, event_source: 'PRMS', decision: 'REJECT', status: 'REJECTED' })
        ]
      })
    );
    for (const raw of RAW_ENUMS) {
      expect(host.textContent).not.toContain(raw);
    }
  });

  it('emits when the history link is clicked', () => {
    const host = render(history());
    const emitted: void[] = [];
    fixture.componentInstance.viewHistory.subscribe(() => emitted.push(undefined));
    (host.querySelector('[data-testid="prms-sync-history-link"]') as HTMLAnchorElement).click();
    expect(emitted).toHaveLength(1);
  });
});
