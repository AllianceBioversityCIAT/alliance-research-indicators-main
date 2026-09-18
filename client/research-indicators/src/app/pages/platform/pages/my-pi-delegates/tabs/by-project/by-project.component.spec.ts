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
import { provideRouter } from '@angular/router';
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
  pi_user_id: null,
  pi_name: 'Mayesse Da Silva',
  status: 'Ongoing',
  start_date: '2024-01-15' as unknown as Date,
  end_date: '2026-12-31' as unknown as Date,
  delegates: [DELEGATE_A, DELEGATE_B]
};

const PROJECT_NO_DELEGATES: ProjectDelegates = {
  project_code: 'PRJ-002',
  project_name: 'Beta Project',
  is_pool_funding_contributor: false,
  pi_user_id: null,
  pi_name: null,
  status: 'Completed',
  start_date: null,
  end_date: null,
  delegates: []
};

const PROJECT_INACTIVE_DELEGATE: ProjectDelegates = {
  project_code: 'PRJ-003',
  project_name: 'Gamma Study',
  is_pool_funding_contributor: false,
  pi_user_id: null,
  pi_name: null,
  status: 'Ongoing',
  start_date: null,
  end_date: null,
  delegates: [DELEGATE_INACTIVE]
};

// ─── Service stubs ────────────────────────────────────────────────────────────

function buildServiceStub(rows: ProjectDelegates[] = [], currentUserId: number | null = 99) {
  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope — writable so a
  // test can put the table into the administrator view.
  const isAdminView = signal(false);
  const isPiOf = (project: ProjectDelegates) => currentUserId != null && project.pi_user_id === currentUserId;

  return {
    byProjectCache: signal(rows),
    loading: signal(false),
    error: signal<string | null>(null),
    revokePair: jest.fn().mockResolvedValue(undefined),
    currentUserId: signal(currentUserId),
    // Mirrors the real service: PI when the project's pi_user_id is the caller.
    isPiOf,
    // Mirrors the real service: in the managed view every listed project the
    // caller is not the PI of is one they delegate on; in the administrator view
    // only actual membership of the delegate list counts.
    isDelegateOf: (project: ProjectDelegates) => {
      if (isPiOf(project)) return false;
      if (!isAdminView()) return true;
      return currentUserId != null && project.delegates.some(d => d.delegate_user_id === currentUserId);
    },
    isAdminView
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

  async function createComponent(rows: ProjectDelegates[] = [], currentUserId: number | null = 99) {
    serviceStub = buildServiceStub(rows, currentUserId);
    actionsStub = buildActionsStub();

    await TestBed.configureTestingModule({
      imports: [ByProjectComponent, NoopAnimationsModule],
      providers: [
        // the project cell is a routerLink now
        provideRouter([]),
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

    it('renders "CODE - Title" on one line, in the row colour, not blue', () => {
      const name = fixture.debugElement.query(By.css('.by-project__project__name'))
        .nativeElement as HTMLElement;
      expect(name.classList.contains('atc-primary-blue-600')).toBe(false);
      expect(name.textContent?.replace(/\s+/g, ' ').trim()).toBe('PRJ-001 - Alpha Research');
    });

    it('labels both dates when the project has them', () => {
      const cell = (fixture.debugElement.queryAll(By.css('.by-project__td--project'))[0]
        .nativeElement as HTMLElement).textContent ?? '';
      expect(cell).toContain('Start date');
      expect(cell).toContain('End date');
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

    it('renders each delegate chip as name over email, with no tooltip icon', () => {
      const chips = fixture.debugElement.queryAll(By.css('.by-project__chip'));
      expect(chips.length).toBeGreaterThanOrEqual(2);

      const first = chips[0].nativeElement as HTMLElement;
      expect(first.querySelector('.by-project__chip__name')?.textContent?.trim()).toBe('Alice Example');
      expect(first.querySelector('.by-project__chip__email')?.textContent?.trim()).toBe('alice@test.org');
      // the hover icon is gone — both values are printed in the chip
      expect(first.querySelector('.by-project__chip__icon')).toBeNull();
    });
  });

  describe('project dates', () => {
    it('shows only Start date — and no dash — when the project has no end date', async () => {
      await createComponent([
        { ...PROJECT_WITH_DELEGATES, project_code: 'D514', end_date: null }
      ]);

      const cell = (fixture.debugElement.query(By.css('.by-project__td--project'))
        .nativeElement as HTMLElement).textContent ?? '';
      expect(cell).toContain('Start date');
      expect(cell).not.toContain('End date');
      // the old rendering printed "31 Dec 2023 – —" for this row
      expect(cell).not.toContain('—');
      expect(cell).not.toContain('–');
    });

    it('omits both labels when the project has neither date', async () => {
      await createComponent([PROJECT_NO_DELEGATES]); // start and end are null

      const cell = (fixture.debugElement.query(By.css('.by-project__td--project'))
        .nativeElement as HTMLElement).textContent ?? '';
      expect(cell).not.toContain('Start date');
      expect(cell).not.toContain('End date');
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

    it('INACTIVE chip carries the rotated marker explaining why', () => {
      const chip = fixture.debugElement.query(By.css('.by-project__chip--inactive'))
        .nativeElement as HTMLElement;

      const icon = chip.querySelector('.by-project__chip__inactive-icon') as HTMLElement;
      expect(icon).not.toBeNull();
      expect(icon.classList.contains('pi-exclamation-circle')).toBe(true);
      expect(icon.style.transform).toBe('rotate(180deg)');
      // the copy is about the user account, not the delegation
      expect(icon.getAttribute('aria-label')).toBe('This user is no longer active');
    });

    it('INACTIVE chip keeps the red treatment and still prints name + email', () => {
      const chip = fixture.debugElement.query(By.css('.by-project__chip--inactive'))
        .nativeElement as HTMLElement;
      expect(chip.querySelector('.by-project__chip__name')?.textContent?.trim()).toBe('Carol Gone');
      expect(chip.querySelector('.by-project__chip__email')?.textContent?.trim()).toBe('carol@test.org');
    });
  });

  describe('active delegate chip (is_active === true)', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('ACTIVE chip carries no inactive marker (negative discriminator)', () => {
      expect(fixture.debugElement.query(By.css('.by-project__chip__inactive-icon'))).toBeNull();
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

  describe('revoke confirmation layout', () => {
    it('uses the same block layout as the assign dialog', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);

      const xBtn = fixture.debugElement.query(By.css('.by-project__chip__remove'));
      (xBtn.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const alert = actionsStub.showGlobalAlert.mock.calls[0][0] as GlobalAlert;
      expect(alert.detail).toContain('class="alert-detail-left"');
      expect(alert.detail).toContain(
        '<div>The following changes will be made in project <strong>PRJ-001</strong> — Alpha Research</div><div>&nbsp;</div>'
      );
      expect(alert.detail).toContain('<div><strong>Removed:</strong> Alice Example</div>');
    });
  });

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

    it('renders Assign people as an icon button with a tooltip, like By person', () => {
      const btn = fixture.debugElement.query(By.css('.by-project__assign-btn'));
      expect(btn).toBeTruthy();
      const el = btn.nativeElement as HTMLElement;
      // icon-only now — the label lives in the tooltip
      expect(el.textContent?.trim()).toBe('');
      expect(el.querySelector('.pi-user-plus')).not.toBeNull();
      expect(el.getAttribute('ng-reflect-text') ?? el.getAttribute('aria-label')).toContain('Assign');
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
    it('shows only the PI note — no counts, no inactive warning', async () => {
      await createComponent([PROJECT_INACTIVE_DELEGATE]);

      const summary = fixture.nativeElement.querySelector('.by-project__summary') as HTMLElement;
      const text = summary.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      expect(text).toBe('Only projects where you are the Principal Investigator or a PI Delegate are listed');
      expect(text).not.toContain('inactive');
      expect(fixture.nativeElement.querySelector('.by-project__summary-right')).toBeNull();
    });
  });
  // ── 10. Sortable columns (platform table convention) ──────────────────

  describe('column sorting', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES, PROJECT_INACTIVE_DELEGATE]);
    });

    it('renders a sort icon on Project, Role, Status and Pool funding', () => {
      const sortable = fixture.nativeElement.querySelectorAll('th[pSortableColumn] p-sorticon');
      expect(sortable.length).toBe(4);
    });


    it('sorts the rendered rows when the Project header is clicked', () => {
      const firstName = () =>
        (fixture.nativeElement.querySelector('.by-project__project__name') as HTMLElement)
          .textContent?.replace(/\s+/g, ' ')
          .trim();
      expect(firstName()).toBe('PRJ-001 - Alpha Research');

      const projectHeader = fixture.debugElement.queryAll(By.css('th[pSortableColumn]'))[0];
      projectHeader.nativeElement.click();
      fixture.detectChanges();
      expect(firstName()).toBe('PRJ-001 - Alpha Research'); // ascending

      projectHeader.nativeElement.click();
      fixture.detectChanges();
      expect(firstName()).toBe('PRJ-003 - Gamma Study'); // descending
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

  describe('no-delegate row', () => {
    it('marks a project with no delegate, the way By person marks an inactive person', async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);

      const rows = fixture.debugElement.queryAll(By.css('tr.by-project__row'));
      // PRJ-001 has delegates → no marker; PRJ-002 has none → amber marker
      expect((rows[0].nativeElement as HTMLElement).classList.contains('by-project__row--no-delegate')).toBe(false);
      expect((rows[1].nativeElement as HTMLElement).classList.contains('by-project__row--no-delegate')).toBe(true);
    });
  });

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
  // ── Toolbar layout ─────────────────────────────────────────────────────────

  describe('toolbar layout', () => {
    it('draws no rule under the summary line and keeps Clear Filters beside the search', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);

      const summary = fixture.nativeElement.querySelector('.by-project__summary') as HTMLElement;
      expect(summary.className).not.toContain('border-b');

      // the shared control is not stretched, so its two groups sit together
      const control = fixture.nativeElement.querySelector('app-search-export-controls') as HTMLElement;
      expect(control.className).not.toContain('flex-1');
      expect(control.className).toContain('w-fit');
    });
  });
  // ── My role column: PI vs delegated project ────────────────────────────────

  describe('role column', () => {
    it('says Principal Investigator when the caller is the PI, PI Delegate otherwise', async () => {
      await createComponent(
        [
          { ...PROJECT_WITH_DELEGATES, pi_user_id: 99 }, // caller is the PI
          { ...PROJECT_NO_DELEGATES, pi_user_id: 7 } // caller only delegates here
        ],
        99
      );

      const roles = fixture.debugElement
        .queryAll(By.css('.by-project__role'))
        .map(el => (el.nativeElement as HTMLElement).textContent?.trim());
      expect(roles).toEqual(['Principal Investigator', 'PI Delegate']);

      // plain text, like Pool funding — no emphasis variant
      expect(fixture.debugElement.queryAll(By.css('.by-project__role--delegate'))).toHaveLength(0);
    });

    it('treats a project with no PI account as delegated (negative discriminator)', async () => {
      await createComponent([{ ...PROJECT_WITH_DELEGATES, pi_user_id: null }], 99);

      const role = fixture.debugElement.query(By.css('.by-project__role'))
        .nativeElement as HTMLElement;
      expect(role.textContent?.trim()).toBe('PI Delegate');
    });

    // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
    it('names the admin-only case in words instead of "PI Delegate"', async () => {
      await createComponent(
        [
          { ...PROJECT_WITH_DELEGATES, pi_user_id: 99 }, // the admin IS the PI here
          // Someone else's project with no delegates at all: the admin sees it only
          // because they are an admin, so claiming they delegate on it is false.
          { ...PROJECT_NO_DELEGATES, pi_user_id: 7 }
        ],
        99
      );
      serviceStub.isAdminView.set(true);
      fixture.detectChanges();

      const roles = fixture.debugElement
        .queryAll(By.css('.by-project__role'))
        .map(el => (el.nativeElement as HTMLElement).textContent?.trim());
      // Not a bare dash: the cell has to say WHY the project is listed.
      expect(roles).toEqual(['Principal Investigator', 'No role (admin)']);
    });

    it('still says PI Delegate for an admin who IS on the delegate list', async () => {
      await createComponent(
        [
          {
            ...PROJECT_NO_DELEGATES,
            pi_user_id: 7,
            delegates: [{ delegate_user_id: 99, name: 'Me', email: 'me@x.com', is_active: true }]
          }
        ],
        99
      );
      serviceStub.isAdminView.set(true);
      fixture.detectChanges();

      const role = fixture.debugElement.query(By.css('.by-project__role'))
        .nativeElement as HTMLElement;
      expect(role.textContent?.trim()).toBe('PI Delegate');
    });

    // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
    it('sorts on Role — p-table sorts the row field the cell renders', async () => {
      // Three DIFFERENT roles, or a reversal proves nothing. Admin view, because
      // that is the only one where all three can occur.
      await createComponent(
        [
          {
            ...PROJECT_NO_DELEGATES,
            project_code: 'P-DEL',
            pi_user_id: 7,
            delegates: [{ delegate_user_id: 99, name: 'Me', email: 'me@x.com', is_active: true }]
          },
          { ...PROJECT_NO_DELEGATES, project_code: 'P-NONE', pi_user_id: 7, delegates: [] },
          { ...PROJECT_WITH_DELEGATES, project_code: 'P-PI', pi_user_id: 99, delegates: [] }
        ],
        99
      );
      serviceStub.isAdminView.set(true);
      fixture.detectChanges();

      const rolesOnScreen = () =>
        fixture.debugElement
          .queryAll(By.css('.by-project__role'))
          .map(el => (el.nativeElement as HTMLElement).textContent?.trim());

      // Addressed by its own binding, not by column index: clicking "whichever
      // header is second" would still reorder the table via Status and pass.
      const roleHeader = fixture.debugElement.query(By.css('th[pSortableColumn="role"]'));
      expect(roleHeader).not.toBeNull();

      roleHeader.nativeElement.click();
      fixture.detectChanges();
      expect(rolesOnScreen()).toEqual(['No role (admin)', 'PI Delegate', 'Principal Investigator']);

      roleHeader.nativeElement.click();
      fixture.detectChanges();
      // ★ discriminating: a Role column sorted on a template expression cannot
      //   move at all — p-table only ever sees row fields.
      expect(rolesOnScreen()).toEqual(['Principal Investigator', 'PI Delegate', 'No role (admin)']);
    });

    it('the short label carries the full sentence as tooltip and spoken text', async () => {
      await createComponent([{ ...PROJECT_NO_DELEGATES, pi_user_id: 7 }], 99);
      serviceStub.isAdminView.set(true);
      fixture.detectChanges();

      const role = fixture.debugElement.query(By.css('.by-project__role'))
        .nativeElement as HTMLElement;
      expect(role.getAttribute('aria-label')).toContain('no role on this project');
      expect(role.getAttribute('aria-label')).toContain('administrator');
      expect(role.getAttribute('title')).toBe(role.getAttribute('aria-label'));
    });
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  describe('summary line', () => {
    it('stops claiming the list is filtered to the caller once it is not', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
      const summaryText = () =>
        (fixture.nativeElement.querySelector('.by-project__summary-left') as HTMLElement).textContent ?? '';

      expect(summaryText()).toContain('Only projects where you are');

      serviceStub.isAdminView.set(true);
      fixture.detectChanges();

      expect(summaryText()).not.toContain('Only projects where you are');
      expect(summaryText()).toContain('Every project on the platform');
    });
  });
  // ── Delegates cell overflow: inline chips + "+N more" popover ──────────────

  describe('delegates overflow', () => {
    function projectWith(count: number): ProjectDelegates {
      return {
        ...PROJECT_WITH_DELEGATES,
        project_code: 'MANY',
        delegates: Array.from({ length: count }, (_, i) => ({
          delegate_user_id: i + 1,
          name: `Person ${i + 1}`,
          email: `p${i + 1}@test.org`,
          is_active: true
        }))
      };
    }

    it('shows every delegate inline while there are four or fewer', async () => {
      await createComponent([projectWith(4)]);

      expect(fixture.debugElement.queryAll(By.css('.by-project__chip'))).toHaveLength(4);
      expect(fixture.debugElement.query(By.css('.by-project__more'))).toBeNull();
    });

    it('caps the cell at four chips and moves the rest behind "+N more"', async () => {
      await createComponent([projectWith(7)]);

      const cell = fixture.nativeElement.querySelector('.by-project__td--delegates') as HTMLElement;
      expect(cell.querySelectorAll('.by-project__chip')).toHaveLength(4);

      const more = fixture.debugElement.query(By.css('.by-project__more'))
        .nativeElement as HTMLElement;
      expect(more.textContent?.trim()).toBe('+3 more');
    });

    it('renders the popover chips as full-width rows so the X sits flush right', async () => {
      await createComponent([projectWith(7)]);

      const more = fixture.debugElement.query(By.css('.by-project__more'))
        .nativeElement as HTMLButtonElement;
      more.click();
      fixture.detectChanges();

      const panelChips = Array.from(
        document.querySelectorAll('.by-project__more-list .by-project__chip')
      );
      expect(panelChips.length).toBe(7);
      for (const chip of panelChips) {
        expect(chip.classList.contains('by-project__chip--block')).toBe(true);
      }
    });

    it('counts hidden delegates from the project row', async () => {
      await createComponent([projectWith(7)]);

      expect(component.visibleDelegates(projectWith(7))).toHaveLength(4);
      expect(component.hiddenDelegateCount(projectWith(7))).toBe(3);
      expect(component.hiddenDelegateCount(projectWith(2))).toBe(0);
    });
  });
  // ── Project cell: link + Principal investigator line ───────────────────────

  describe('project cell', () => {
    it('links only the project title to the project detail route', async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);

      const link = fixture.debugElement.query(By.css('.by-project__project__link'))
        .nativeElement as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/project-detail/PRJ-001');

      // the row itself must not navigate — the chips live there too
      const row = fixture.nativeElement.querySelector('tr.by-project__row') as HTMLElement;
      expect(row.getAttribute('href')).toBeNull();
      expect(row.getAttribute('ng-reflect-router-link')).toBeNull();
    });

    it('shows the Principal investigator before the dates, and omits it when unknown', async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);

      const cells = fixture.debugElement.queryAll(By.css('.by-project__td--project'));
      const withPi = (cells[0].nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
      expect(withPi).toContain('Principal investigator');
      expect(withPi).toContain('Mayesse Da Silva');
      expect(withPi.indexOf('Principal investigator')).toBeLessThan(withPi.indexOf('Start date'));

      // PRJ-002 has no lead recorded
      const withoutPi = (cells[1].nativeElement as HTMLElement).textContent ?? '';
      expect(withoutPi).not.toContain('Principal investigator');
    });
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  // ── Role quick filters: chips mirroring the three header counters ───────────

  describe('role quick filters', () => {
    /** The caller (99) leads P-PI, delegates on P-DEL, and has no role on P-NONE. */
    const ADMIN_ROWS = [
      { ...PROJECT_WITH_DELEGATES, project_code: 'P-PI', pi_user_id: 99, delegates: [] },
      {
        ...PROJECT_WITH_DELEGATES,
        project_code: 'P-DEL',
        pi_user_id: 7,
        delegates: [{ delegate_user_id: 99, name: 'Me', email: 'me@x.com', is_active: true }]
      },
      { ...PROJECT_NO_DELEGATES, project_code: 'P-NONE', pi_user_id: 7, delegates: [] }
    ];

    const codesOnScreen = () =>
      fixture.debugElement
        .queryAll(By.css('.by-project__project__code'))
        .map(el => (el.nativeElement as HTMLElement).textContent?.trim());

    const chip = (index: number) =>
      fixture.debugElement.queryAll(By.css('.by-project__role-filter'))[index]
        .nativeElement as HTMLButtonElement;

    async function createAdminTable() {
      await createComponent(ADMIN_ROWS, 99);
      serviceStub.isAdminView.set(true);
      fixture.detectChanges();
    }

    it('marks the selected chip with a blue surface and weight — never an underline', async () => {
      await createAdminTable();

      // No underline: it read as a tab strip, and these filter the table below
      // rather than switching views.
      expect(fixture.nativeElement.querySelectorAll('.by-project__role-filters .absolute')).toHaveLength(0);

      const classesOf = (i: number) => chip(i).className;
      expect(classesOf(0)).toContain('var(--ac-light-blue-50)');
      expect(classesOf(0)).toContain('font-semibold');
      // ★ discriminating: an unselected chip keeps the neutral surface.
      expect(classesOf(1)).toContain('var(--ac-grey-100)');
      expect(classesOf(1)).not.toContain('var(--ac-light-blue-50)');

      chip(1).click();
      fixture.detectChanges();

      expect(classesOf(1)).toContain('var(--ac-light-blue-50)');
      expect(classesOf(0)).not.toContain('var(--ac-light-blue-50)');
    });

    it('renders one chip per header counter, in the same order, with All active', async () => {
      await createAdminTable();

      const labels = fixture.debugElement
        .queryAll(By.css('.by-project__role-filter'))
        .map(el => (el.nativeElement as HTMLElement).textContent?.trim());
      expect(labels).toEqual(['All projects', 'As PI', 'As PI delegate']);
      expect(chip(0).getAttribute('aria-pressed')).toBe('true');
    });

    it('As PI narrows the table to the projects the caller leads', async () => {
      await createAdminTable();

      chip(1).click();
      fixture.detectChanges();

      expect(codesOnScreen()).toEqual(['P-PI']);
      expect(chip(1).getAttribute('aria-pressed')).toBe('true');
      expect(chip(0).getAttribute('aria-pressed')).toBe('false');
    });

    it('As PI delegate narrows it to actual delegations, not "everything else"', async () => {
      await createAdminTable();

      chip(2).click();
      fixture.detectChanges();

      // ★ discriminating: P-NONE is the row an admin's list is mostly made of.
      //   A "not the PI" filter would include it here.
      expect(codesOnScreen()).toEqual(['P-DEL']);
    });

    it('All projects restores the full list', async () => {
      await createAdminTable();

      chip(1).click();
      fixture.detectChanges();
      chip(0).click();
      fixture.detectChanges();

      expect(codesOnScreen()).toEqual(['P-PI', 'P-DEL', 'P-NONE']);
    });

    it('combines with the search box instead of replacing it', async () => {
      await createAdminTable();

      chip(2).click();
      component.searchTerm.set('P-PI');
      fixture.detectChanges();

      // Both conditions apply: P-PI matches the search but not the chip.
      expect(codesOnScreen()).toEqual([]);
    });

    it('Clear Filters resets the chip along with the search', async () => {
      await createAdminTable();

      chip(1).click();
      component.searchTerm.set('nothing-matches-this');
      fixture.detectChanges();

      component.clearFilters();
      fixture.detectChanges();

      expect(component.roleTerm()).toBe('all');
      expect(codesOnScreen()).toEqual(['P-PI', 'P-DEL', 'P-NONE']);
    });

    it('works for a PI/delegate too, where every listed project is one or the other', async () => {
      await createComponent(
        [
          { ...PROJECT_WITH_DELEGATES, project_code: 'P-PI', pi_user_id: 99 },
          { ...PROJECT_NO_DELEGATES, project_code: 'P-DEL', pi_user_id: 7 }
        ],
        99
      );

      chip(2).click();
      fixture.detectChanges();

      // Not admin: "not the PI" IS the delegate answer here, so P-DEL qualifies
      // even though the delegate chip does not name the caller.
      expect(codesOnScreen()).toEqual(['P-DEL']);
    });
  });

});
