// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-05)
//
// Spec contract (K-015: arrange the TRANSITION — not the end state):
//   - searchQuery and statusFilter are inputs; test by setting them via setInput.
//   - Status filter excludes non-matching rows (negative discriminator).
//   - INACTIVE delegate chip has --inactive class and inactive-icon.
//   - ACTIVE delegate chip does NOT have --inactive class.
//   - "Assign people" text button renders; history button is disabled.
//   - Revoke, search, pool-funding, formatDate as before.
//
// K-020: --coverage=false for single-file runs.

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ByProjectComponent } from './by-project.component';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { ProjectDelegates } from '@interfaces/pi-delegates.interface';
import type { GlobalAlert } from '@interfaces/global-alert.interface';

// ─── Test data ────────────────────────────────────────────────────────────────

const DELEGATE_A = { delegate_user_id: 1, name: 'Alice Example', email: 'alice@test.org', is_active: true };
const DELEGATE_B = { delegate_user_id: 2, name: 'Bob Sample', email: 'bob@test.org', is_active: true };
const DELEGATE_INACTIVE = { delegate_user_id: 3, name: 'Carol Gone', email: 'carol@test.org', is_active: false };

const PROJECT_WITH_DELEGATES: ProjectDelegates = {
  project_code: 'PRJ-001',
  project_name: 'Alpha Research',
  is_pool_funding_contributor: true,
  status: 'Ongoing',
  start_date: '2024-01-15' as unknown as Date,
  end_date: '2026-12-31' as unknown as Date,
  delegates: [DELEGATE_A, DELEGATE_B]
};

const PROJECT_NO_DELEGATES: ProjectDelegates = {
  project_code: 'PRJ-002',
  project_name: 'Beta Project',
  is_pool_funding_contributor: false,
  status: 'Completed',
  start_date: null,
  end_date: null,
  delegates: []
};

const PROJECT_INACTIVE_DELEGATE: ProjectDelegates = {
  project_code: 'PRJ-003',
  project_name: 'Gamma Study',
  is_pool_funding_contributor: false,
  status: 'Ongoing',
  start_date: null,
  end_date: null,
  delegates: [DELEGATE_INACTIVE]
};

// ─── Service stubs ────────────────────────────────────────────────────────────

function buildServiceStub(rows: ProjectDelegates[] = []) {
  return {
    byProjectCache: signal(rows),
    loading: signal(false),
    error: signal<string | null>(null),
    revokePair: jest.fn().mockResolvedValue(undefined)
  };
}

function buildActionsStub() {
  return { showGlobalAlert: jest.fn() };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acceptConfirm(actionsStub: { showGlobalAlert: jest.Mock }): void {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  alert?.confirmCallback?.event?.();
}

function dismissConfirm(actionsStub: { showGlobalAlert: jest.Mock }): boolean {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  alert?.cancelCallback?.event?.();
  return !!alert?.cancelCallback;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ByProjectComponent', () => {
  let fixture: ComponentFixture<ByProjectComponent>;
  let component: ByProjectComponent;
  let serviceStub: ReturnType<typeof buildServiceStub>;
  let actionsStub: ReturnType<typeof buildActionsStub>;

  async function createComponent(rows: ProjectDelegates[] = []) {
    serviceStub = buildServiceStub(rows);
    actionsStub = buildActionsStub();

    await TestBed.configureTestingModule({
      imports: [ByProjectComponent, NoopAnimationsModule],
      providers: [
        { provide: PiDelegatesClientService, useValue: serviceStub },
        { provide: ActionsService, useValue: actionsStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ByProjectComponent);
    component = fixture.componentInstance;
    // K-015: initial state then detectChanges
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ── 1. Enriched field rendering ─────────────────────────────────────

  describe('table renders enriched fields', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);
    });

    it('renders project code and name in the combined project cell', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('PRJ-001');
      expect(text).toContain('Alpha Research');
    });

    it('renders the project title in the row colour, not blue, but bold', () => {
      const name = fixture.debugElement.query(By.css('.by-project__project__name'))
        .nativeElement as HTMLElement;
      expect(name.classList.contains('atc-primary-blue-600')).toBe(false);
      expect(name.textContent?.trim()).toBe('Alpha Research');
    });

    it('renders status pill for PRJ-001', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Ongoing');
    });

    it('renders pool funding as plain Yes / No — no icon', () => {
      const values = fixture.debugElement
        .queryAll(By.css('.by-project__pool-value'))
        .map(el => (el.nativeElement as HTMLElement).textContent?.trim());
      expect(values).toContain('Yes'); // PRJ-001 contributes
      expect(values).toContain('No'); // PRJ-002 does not

      // the old icon badges are gone
      expect(fixture.debugElement.queryAll(By.css('.pi-check-circle'))).toHaveLength(0);
      expect(fixture.debugElement.queryAll(By.css('.pi-minus-circle'))).toHaveLength(0);
    });

    it('renders a compact chip per delegate: name visible, details in the tooltip', () => {
      const chips = fixture.debugElement.queryAll(By.css('.by-project__chip'));
      expect(chips.length).toBeGreaterThanOrEqual(2);

      const first = chips[0];
      expect((first.nativeElement as HTMLElement).textContent?.trim()).toContain('Alice Example');
      // email/carnet/status are no longer printed in the chip — they live in the tooltip
      expect((first.nativeElement as HTMLElement).textContent).not.toContain('alice@test.org');
      const icon = first.query(By.css('.by-project__chip__icon'));
      expect((icon.nativeElement as HTMLElement).getAttribute('aria-label')).toBe(
        'alice@test.org · Status: Active'
      );
    });

    it('the chip tooltip carries email, carnet and status', () => {
      expect(
        component.delegateTooltip({
          delegate_user_id: 9,
          name: 'Carol Gone',
          email: 'carol@test.org',
          carnet: 'C00042',
          is_active: false
        })
      ).toBe('carol@test.org · Carnet: C00042 · Status: Inactive');

      // carnet is optional — it is simply left out when absent
      expect(
        component.delegateTooltip({
          delegate_user_id: 10,
          name: 'Alice Example',
          email: 'alice@test.org',
          is_active: true
        })
      ).toBe('alice@test.org · Status: Active');
    });
  });

  // ── 2. Inactive delegate chip ────────────────────────────────────────

  describe('inactive delegate chip (is_active === false)', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_INACTIVE_DELEGATE]);
    });

    it('INACTIVE chip has --inactive class', () => {
      const chips = fixture.debugElement.queryAll(By.css('.by-project__chip'));
      const inactiveChip = chips.find(c => (c.nativeElement as HTMLElement).classList.contains('by-project__chip--inactive'));
      expect(inactiveChip).toBeTruthy();
    });

    it('INACTIVE chip swaps the leading icon for the warning one', () => {
      const icon = fixture.debugElement.query(
        By.css('.by-project__chip--inactive .by-project__chip__icon')
      );
      expect(icon).toBeTruthy();
      expect((icon.nativeElement as HTMLElement).classList.contains('pi-exclamation-circle')).toBe(true);
    });
  });

  describe('active delegate chip (is_active === true)', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('ACTIVE chip does NOT have --inactive class', () => {
      const inactiveChips = fixture.debugElement.queryAll(By.css('.by-project__chip--inactive'));
      expect(inactiveChips.length).toBe(0);
    });
  });

  // ── 3. No-delegate non-colour cue ─────────────────────────────────────

  describe('no-delegate row', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_NO_DELEGATES]);
    });

    it('shows the exclamation-triangle icon (non-colour cue)', () => {
      const icon = fixture.debugElement.query(By.css('.pi-exclamation-triangle'));
      expect(icon).toBeTruthy();
    });

    it('shows the "No PI Delegate assigned" text', () => {
      const cue = fixture.debugElement.query(By.css('[data-testid="no-delegate-cue"]'));
      expect(cue).toBeTruthy();
      expect((cue.nativeElement as HTMLElement).textContent).toContain('No PI Delegate assigned');
    });
  });

  // ── 4. Revoke delegate (R-UI-008) ─────────────────────────────────────

  describe('revoke delegate', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('calls showGlobalAlert when the X button is clicked', () => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      expect(xBtns.length).toBe(2);
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(actionsStub.showGlobalAlert).toHaveBeenCalledTimes(1);
    });

    it('confirmation detail names the delegate and project', () => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const alert = actionsStub.showGlobalAlert.mock.calls[0][0] as GlobalAlert;
      expect(alert.detail).toContain('Alice Example');
      expect(alert.detail).toContain('PRJ-001');
    });

    it('calls revokePair with the EXACT (project_code, delegate_user_id) pair on confirm', fakeAsync(() => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      expect(serviceStub.revokePair).toHaveBeenCalledWith('PRJ-001', 1);
    }));

    it('does NOT call revokePair when the confirmation dialog is dismissed', fakeAsync(() => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const hasCancelCallback = dismissConfirm(actionsStub);
      tick();

      expect(hasCancelCallback).toBe(true);
      expect(serviceStub.revokePair).not.toHaveBeenCalled();
    }));
  });

  // ── 5. Search filtering (via searchQuery input) ───────────────────────

  describe('search filtering', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);
    });

    it('shows all rows when searchQuery input is empty', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(2);
    });

    it('filters by project code when searchQuery input is set', () => {
      fixture.componentRef.setInput('searchQuery', 'PRJ-001');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
    });

    it('filters by delegate name (person search)', () => {
      fixture.componentRef.setInput('searchQuery', 'alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('PRJ-001');
    });

    it('returns no rows for a non-matching query (negative discriminator)', () => {
      fixture.componentRef.setInput('searchQuery', 'zzznomatch');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(0);
    });
  });

  // ── 6. Status filter (via statusFilter input) ─────────────────────────

  describe('status filtering', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);
      // PRJ-001 status = 'Ongoing', PRJ-002 status = 'Completed'
    });

    it('shows all rows when statusFilter is "All"', () => {
      fixture.componentRef.setInput('statusFilter', 'All');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(2);
    });

    it('filters to only Ongoing rows when statusFilter is "Ongoing"', () => {
      fixture.componentRef.setInput('statusFilter', 'Ongoing');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('PRJ-001');
    });

    it('filters to only Completed rows — negative: excludes Ongoing (discriminator)', () => {
      fixture.componentRef.setInput('statusFilter', 'Completed');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('PRJ-002');
      // Confirm PRJ-001 (Ongoing) is excluded
      expect((rows[0].nativeElement as HTMLElement).textContent).not.toContain('PRJ-001');
    });

    it('returns zero rows for a status that matches nothing (negative discriminator)', () => {
      fixture.componentRef.setInput('statusFilter', 'NonExistentStatus');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(0);
    });
  });

  // ── 7. Actions column ─────────────────────────────────────────────────

  describe('actions column', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('renders the "Assign people" text button', () => {
      const btn = fixture.debugElement.query(By.css('.by-project__assign-btn'));
      expect(btn).toBeTruthy();
      expect((btn.nativeElement as HTMLElement).textContent?.trim()).toContain('Assign people');
    });

    it('renders the history icon button in an ENABLED state (disabled removed)', () => {
      const historyBtn = fixture.debugElement.query(By.css('.by-project__history-btn'));
      expect(historyBtn).toBeTruthy();
      const el = historyBtn.nativeElement as HTMLButtonElement;
      // KZ-014: must NOT be disabled — if still disabled, the feature was not wired
      expect(el.disabled).toBe(false);
      expect(el.getAttribute('aria-disabled')).not.toBe('true');
    });

    it('emits historyRequested with projectCode+projectName when history button is clicked', () => {
      const emitted: { projectCode: string; projectName: string | null }[] = [];
      component.historyRequested.subscribe((v: { projectCode: string; projectName: string | null }) =>
        emitted.push(v)
      );

      const historyBtn = fixture.debugElement.query(By.css('.by-project__history-btn'));
      (historyBtn.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      // KZ-014: must carry the project code from the row data
      expect(emitted[0].projectCode).toBe('PRJ-001');
      expect(emitted[0].projectName).toBe('Alpha Research');
    });

    it('emits assignRequested with the project code when "Assign people" is clicked', () => {
      const emitted: { projectCode: string }[] = [];
      component.assignRequested.subscribe((v: { projectCode: string }) => emitted.push(v));

      const btn = fixture.debugElement.query(By.css('.by-project__assign-btn'));
      (btn.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      expect(emitted[0].projectCode).toBe('PRJ-001');
    });
  });

  // ── 8. Date formatting helper ─────────────────────────────────────────

  describe('formatDate', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('formats an ISO string defensively', () => {
      expect(component.formatDate('2024-01-15')).toContain('2024');
    });

    it('returns "—" for null', () => {
      expect(component.formatDate(null)).toBe('—');
    });

    it('returns "—" for undefined', () => {
      expect(component.formatDate(undefined)).toBe('—');
    });
  });
  // ── 9. In-card toolbar, paginator and summary ─────────────────────────

  describe('in-card toolbar (search only)', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES, PROJECT_INACTIVE_DELEGATE]);
    });

    it('renders the shared search control INSIDE the table card, not in the page shell', () => {
      const card = fixture.nativeElement.querySelector('.by-project__table-wrapper');
      expect(card.querySelector('app-search-export-controls')).not.toBeNull();
      // Table-local filtering: Clear Filters yes, Apply Filters no (no sidebar),
      // and no status dropdown — the toolbar is search + clear only.
      expect(card.textContent).not.toContain('Apply Filters');
      expect(card.textContent).toContain('Clear Filters');
      expect(card.querySelector('p-dropdown')).toBeNull();
    });

    it('Clear Filters resets the search term and the status back to All', () => {
      component.searchTerm.set('PRJ-002');
      component.statusTerm.set('Completed');
      fixture.detectChanges();
      expect(component.filteredRows().length).toBe(1);

      component.clearFilters();
      fixture.detectChanges();

      expect(component.searchTerm()).toBe('');
      expect(component.statusTerm()).toBe('All');
      expect(component.filteredRows().length).toBe(3);
    });

    it('searching through the shared control filters the rows', () => {
      expect(component.filteredRows().length).toBe(3);

      const input = fixture.debugElement.query(By.css('app-search-export-controls input'));
      (input.nativeElement as HTMLInputElement).value = 'PRJ-002';
      // Enter submits immediately; the (input) path is the same emitter, debounced.
      input.triggerEventHandler('keydown.enter', { target: input.nativeElement });
      fixture.detectChanges();

      expect(component.filteredRows().length).toBe(1);
      expect(component.filteredRows()[0].project_code).toBe('PRJ-002');
    });

  });

  describe('paginator', () => {
    function manyProjects(count: number): ProjectDelegates[] {
      return Array.from({ length: count }, (_, i) => ({
        ...PROJECT_NO_DELEGATES,
        project_code: `PRJ-${String(i).padStart(3, '0')}`,
        project_name: `Project ${i}`
      }));
    }

    it('renders a paginator inside the table card and caps the page at 10 rows', async () => {
      await createComponent(manyProjects(12));

      const card = fixture.nativeElement.querySelector('.by-project__table-wrapper');
      expect(card.querySelector('.p-paginator')).not.toBeNull();
      expect(component.filteredRows().length).toBe(12);
      expect(card.querySelectorAll('tr.by-project__row').length).toBe(10);
    });
  });

  describe('summary line', () => {
    it('puts the PI note on the left and the inactive warning on the right', async () => {
      await createComponent([PROJECT_INACTIVE_DELEGATE]);

      const left = fixture.nativeElement.querySelector('.by-project__summary-left') as HTMLElement;
      const right = fixture.nativeElement.querySelector('.by-project__summary-right') as HTMLElement;

      expect(left.textContent).toContain('Only projects where you are the Principal Investigator are listed');
      expect(right.textContent).toContain('1 delegate inactive');
      // the marker uses the warning triangle, not the info circle
      expect(right.querySelector('.pi-exclamation-triangle')).not.toBeNull();
      expect(right.querySelector('.pi-exclamation-circle')).toBeNull();
    });

    it('keeps only the PI note and drops the people / assignments / projects counts', async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_INACTIVE_DELEGATE]);

      const card = fixture.nativeElement.querySelector('.by-project__table-wrapper');
      const summary = card.querySelector('.by-project__summary') as HTMLElement;
      const text = summary.textContent ?? '';

      expect(text).toContain('Only projects where you are the Principal Investigator are listed');
      // the counts line is gone — only the inactive warning remains on the left
      expect(text).toContain('1 delegate inactive');
      expect(text).not.toContain('people');
      expect(text).not.toContain('active assignment');
      expect(text).not.toContain('across');
    });

    it('shows the inactive marker only when a delegate is inactive (discriminator)', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
      let marker = fixture.nativeElement.querySelector('.by-project__summary-right');
      expect(marker).toBeNull();

      serviceStub.byProjectCache.set([PROJECT_WITH_DELEGATES, PROJECT_INACTIVE_DELEGATE]);
      fixture.detectChanges();

      marker = fixture.nativeElement.querySelector('.by-project__summary-right');
      expect(marker).not.toBeNull();
      expect((marker as HTMLElement).textContent).toContain('1 delegate inactive');
    });
  });
  // ── 10. Sortable columns (platform table convention) ──────────────────

  describe('column sorting', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES, PROJECT_INACTIVE_DELEGATE]);
    });

    it('renders a sort icon on Project, Status and Pool funding', () => {
      const sortable = fixture.nativeElement.querySelectorAll('th[pSortableColumn] p-sorticon');
      expect(sortable.length).toBe(3);
    });

    it('sorts the rendered rows when the Project header is clicked', () => {
      const firstName = () =>
        (fixture.nativeElement.querySelector('.by-project__project__name') as HTMLElement).textContent?.trim();
      expect(firstName()).toBe('Alpha Research');

      const projectHeader = fixture.debugElement.queryAll(By.css('th[pSortableColumn]'))[0];
      projectHeader.nativeElement.click();
      fixture.detectChanges();
      expect(firstName()).toBe('Alpha Research'); // ascending

      projectHeader.nativeElement.click();
      fixture.detectChanges();
      expect(firstName()).toBe('Gamma Study'); // descending
    });
  });
  // ── 11. Status column uses the shared project status tag ──────────────

  describe('status tag (same component and colours as the My Projects table)', () => {
    const suspended: ProjectDelegates = {
      ...PROJECT_NO_DELEGATES,
      project_code: 'PRJ-SUS',
      project_name: 'Suspended Project',
      status: 'Suspended'
    };

    it('maps the row status name to the shared status id (Ongoing/Completed/Suspended)', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
      expect(component.statusDisplay({ ...PROJECT_WITH_DELEGATES, status: 'Ongoing' }).statusId).toBe(1);
      expect(component.statusDisplay({ ...PROJECT_WITH_DELEGATES, status: 'Completed' }).statusId).toBe(2);
      expect(component.statusDisplay({ ...PROJECT_WITH_DELEGATES, status: 'Suspended' }).statusId).toBe(3);
    });

    it('renders <app-custom-tag> instead of the old bespoke pill', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
      expect(fixture.nativeElement.querySelector('app-custom-tag')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.by-project__status-pill')).toBeNull();
    });

    it('paints Suspended with the shared amber border (STATUS_COLOR_MAP id 3)', async () => {
      await createComponent([suspended]);

      const tag = fixture.nativeElement.querySelector('app-custom-tag div') as HTMLElement;
      expect(tag.textContent?.trim()).toBe('Suspended');
      // #F58220 — the same value the My Projects table paints for Suspended
      expect(tag.style.borderColor.toLowerCase()).toBe('#f58220');
    });

    it('paints Ongoing with a different border than Suspended (discriminator)', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);

      const tag = fixture.nativeElement.querySelector('app-custom-tag div') as HTMLElement;
      expect(tag.textContent?.trim()).toBe('Ongoing');
      expect(tag.style.borderColor.toLowerCase()).not.toBe('#f58220');
    });
  });
  // ── No-delegate cue: amber chip, same shape as a delegate chip, no X ───────

  describe('no-delegate chip', () => {
    it('renders the amber warning chip with the triangle icon and no remove button', async () => {
      await createComponent([PROJECT_NO_DELEGATES]);

      const cue = fixture.debugElement.query(By.css('[data-testid="no-delegate-cue"]'))
        .nativeElement as HTMLElement;
      expect(cue.classList.contains('by-project__chip')).toBe(true);
      expect(cue.classList.contains('by-project__chip--warning')).toBe(true);
      expect(cue.textContent?.trim()).toBe('No PI Delegate assigned');
      expect(cue.querySelector('.pi-exclamation-triangle')).not.toBeNull();
      // nothing to revoke here
      expect(cue.querySelector('.by-project__chip__remove')).toBeNull();
    });
  });
});
