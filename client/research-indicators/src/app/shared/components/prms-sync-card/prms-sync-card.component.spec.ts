import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '@envs/environment';
import { PrmsSyncHistoryEvent, PrmsSyncHistoryResponse } from '@shared/interfaces/prms-sync-history.interface';
import { PrmsSyncCardComponent } from './prms-sync-card.component';

function event(partial: Partial<PrmsSyncHistoryEvent> & Pick<PrmsSyncHistoryEvent, 'id' | 'event_source'>): PrmsSyncHistoryEvent {
  return {
    status: null,
    decision: null,
    occurred_at: '2026-09-11T10:05:00.000Z',
    decided_at: null,
    justification: null,
    actor_name: null,
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
    events: [event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Manuel Almanzar' })],
    ...partial
  };
}

const RAW_ENUMS = ['PENDING_REVIEW', 'APPROVE', 'REJECT', 'APPROVED', 'REJECTED'];

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

  it('renders the synchronized title, badge, pill, actor, id, link and advisory', () => {
    const configuredHost = environment.prmsUrl;
    (environment as { prmsUrl: string }).prmsUrl = 'https://prtest.example.test';
    try {
      const host = render(history());

      expect(host.querySelector('[data-testid="prms-sync-title"]')?.textContent?.trim()).toBe('Synchronized with PRMS');
      expect(host.querySelector('[data-testid="prms-sync-card"]')?.getAttribute('data-tone')).toBe('success');
      expect(host.querySelector('[data-testid="prms-sync-badge"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Sync #1');
      expect(host.querySelector('[data-testid="prms-sync-pill"]')?.textContent?.trim()).toBe('Pending Review');
      expect(host.querySelector('[data-testid="prms-sync-actor"]')?.textContent?.trim()).toBe('by Manuel Almanzar');
      expect(host.querySelector('[data-testid="prms-sync-id"]')?.textContent).toContain('452');
      expect(host.querySelector('[data-testid="prms-sync-advisory"]')).not.toBeNull();
      expect(host.querySelector('[data-testid="prms-sync-history-link"]')).not.toBeNull();

      const link = host.querySelector('[data-testid="prms-sync-open"]') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('https://prtest.example.test/reports/result-details/452?phase=6');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    } finally {
      (environment as { prmsUrl: string }).prmsUrl = configuredHost;
    }
  });

  it('renders Approved by PRMS for an inbound approval and hides the advisory', () => {
    const host = render(
      history({
        sync_count: 2,
        events: [event({ id: 2, event_source: 'PRMS', decision: 'APPROVE', status: 'APPROVED', reviewer_name: 'Daniel Okoth' })]
      })
    );

    expect(host.querySelector('[data-testid="prms-sync-title"]')?.textContent?.trim()).toBe('Approved by PRMS');
    expect(host.querySelector('[data-testid="prms-sync-card"]')?.getAttribute('data-tone')).toBe('success');
    expect(host.querySelector('[data-testid="prms-sync-pill"]')?.textContent?.trim()).toBe('Approved');
    expect(host.querySelector('[data-testid="prms-sync-actor"]')?.textContent?.trim()).toBe('by Daniel Okoth');
    expect(host.querySelector('[data-testid="prms-sync-advisory"]')).toBeNull();
  });

  it('renders Returned by PRMS in the warning tone', () => {
    const host = render(
      history({
        events: [event({ id: 3, event_source: 'PRMS', decision: 'REJECT', reviewer_name: 'Lucía Fernández' })]
      })
    );

    expect(host.querySelector('[data-testid="prms-sync-title"]')?.textContent?.trim()).toBe('Returned by PRMS');
    expect(host.querySelector('[data-testid="prms-sync-card"]')?.getAttribute('data-tone')).toBe('warning');
    expect(host.querySelector('[data-testid="prms-sync-pill"]')?.textContent?.trim()).toBe('Rejected');
    expect(host.querySelector('[data-testid="prms-sync-advisory"]')).toBeNull();
  });

  it('falls back to the pending presentation when a PRMS decision is outside APPROVE/REJECT', () => {
    const host = render(history({ events: [event({ id: 4, event_source: 'PRMS', decision: 'WEIRD', reviewer_name: 'Ada' })] }));

    expect(host.querySelector('[data-testid="prms-sync-title"]')?.textContent?.trim()).toBe('Synchronized with PRMS');
    expect(host.querySelector('[data-testid="prms-sync-pill"]')?.textContent?.trim()).toBe('Pending Review');
    expect(host.textContent).not.toContain('WEIRD');
  });

  it('omits the actor line when the STAR name is unresolved', () => {
    const host = render(history({ events: [event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: null })] }));

    expect(host.querySelector('[data-testid="prms-sync-actor"]')).toBeNull();
    expect(host.textContent).not.toContain('by null');
    expect(host.textContent).not.toContain('by undefined');
  });

  it('keeps the PRMS ID line and hides the button when phase is null', () => {
    const host = render(history({ prms_result_code: 452, prms_phase_id: null }));

    expect(host.querySelector('[data-testid="prms-sync-open"]')).toBeNull();
    expect(host.querySelector('[data-testid="prms-sync-id"]')?.textContent).toContain('PRMS ID:');
    expect(host.querySelector('[data-testid="prms-sync-id"]')?.textContent).toContain('452');
  });

  it('hides the button when the result code is null', () => {
    const host = render(history({ prms_result_code: null, prms_phase_id: 6 }));

    expect(host.querySelector('[data-testid="prms-sync-open"]')).toBeNull();
    expect(host.querySelector('[data-testid="prms-sync-id"]')).toBeNull();
  });

  it('hides the sync badge when sync_count is 0', () => {
    const host = render(history({ sync_count: 0 }));
    expect(host.querySelector('[data-testid="prms-sync-badge"]')).toBeNull();
  });

  it('does not render raw status enums', () => {
    const host = render(
      history({
        events: [
          event({ id: 1, event_source: 'STAR', status: 'PENDING_REVIEW', actor_name: 'Ada' }),
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
    (host.querySelector('[data-testid="prms-sync-history-link"]') as HTMLButtonElement).click();
    expect(emitted).toHaveLength(1);
  });
});
