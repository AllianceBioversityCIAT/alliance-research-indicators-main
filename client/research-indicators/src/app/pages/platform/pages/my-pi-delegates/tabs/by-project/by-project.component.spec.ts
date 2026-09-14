// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-05)
//
// Spec contract (K-015: arrange the TRANSITION — not the end state):
//   - Table renders enriched fields for a mocked cache (code/name/status/dates/pool-funding + chips).
//   - Row X → revoke: clicking X on a delegate calls service.revokePair with the RIGHT
//     (project_code, delegate_user_id) pair.  The confirm transition must be accepted for
//     revoke to fire; revoke does NOT fire if confirm is dismissed (K-001/KZ-014).
//   - Search filters by person OR project; a wrong filter (only-by-project) fails the
//     person-match case.
//   - No-delegate non-colour cue: icon+text markup present for projects with delegates:[].
//
// K-020: --coverage=false for single-file runs; coverage gate is on the full suite.

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

const DELEGATE_A = { delegate_user_id: 1, name: 'Alice Example', email: 'alice@test.org' };
const DELEGATE_B = { delegate_user_id: 2, name: 'Bob Sample', email: 'bob@test.org' };

const PROJECT_WITH_DELEGATES: ProjectDelegates = {
  project_code: 'PRJ-001',
  project_name: 'Alpha Research',
  is_pool_funding_contributor: true,
  status: 'Active',
  start_date: '2024-01-15' as unknown as Date,
  end_date: '2026-12-31' as unknown as Date,
  delegates: [DELEGATE_A, DELEGATE_B]
};

const PROJECT_NO_DELEGATES: ProjectDelegates = {
  project_code: 'PRJ-002',
  project_name: 'Beta Project',
  is_pool_funding_contributor: false,
  status: 'Pending',
  start_date: null,
  end_date: null,
  delegates: []
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
  return {
    showGlobalAlert: jest.fn()
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fire the confirmCallback that ActionsService.showGlobalAlert received.
 * This arranges the TRANSITION (K-015): the guard must be accepted for the action to fire.
 */
function acceptConfirm(actionsStub: { showGlobalAlert: jest.Mock }): void {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  alert?.confirmCallback?.event?.();
}

/**
 * Returns true if the cancel path is present (does NOT call revokePair).
 * Verifies revoke does NOT fire when the dialog is dismissed (K-001/KZ-014).
 */
function dismissConfirm(actionsStub: { showGlobalAlert: jest.Mock }): boolean {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  // cancelCallback.event is optional; invoking it should not call revokePair.
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
    // K-015: construct in initial state THEN trigger initial change detection
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ── 1. Enriched field rendering ─────────────────────────────────────

  describe('table renders enriched fields', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);
    });

    it('renders the project code', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('PRJ-001');
      expect(text).toContain('PRJ-002');
    });

    it('renders the project name', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Alpha Research');
      expect(text).toContain('Beta Project');
    });

    it('renders the status for PRJ-001', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Active');
    });

    it('renders formatted start date for PRJ-001', () => {
      const text = fixture.nativeElement.textContent as string;
      // formatDate('2024-01-15') → "15 Jan 2024" (en-GB locale)
      expect(text).toContain('2024');
    });

    it('renders pool-funding Yes badge with icon for PRJ-001', () => {
      // Icon class `pi-check-circle` must be present (non-colour cue — NFR-UI-002)
      const icons = fixture.debugElement.queryAll(By.css('.pi-check-circle'));
      expect(icons.length).toBeGreaterThanOrEqual(1);
      // The text "Yes" must also be present
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Yes');
    });

    it('renders pool-funding No badge with icon for PRJ-002', () => {
      const icons = fixture.debugElement.queryAll(By.css('.pi-minus-circle'));
      expect(icons.length).toBeGreaterThanOrEqual(1);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('No');
    });

    it('renders delegate chips for PRJ-001', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Alice Example');
      expect(text).toContain('alice@test.org');
      expect(text).toContain('Bob Sample');
      expect(text).toContain('bob@test.org');
    });
  });

  // ── 2. No-delegate non-colour cue (R-UI-002 AC.2/AC.3 / NFR-UI-002) ─

  describe('no-delegate row', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_NO_DELEGATES]);
    });

    it('shows the exclamation-triangle icon (non-colour cue)', () => {
      // The cue must not be colour alone — icon MUST be in the DOM
      const icon = fixture.debugElement.query(By.css('.pi-exclamation-triangle'));
      expect(icon).toBeTruthy();
    });

    it('shows the "No PI Delegate assigned" text', () => {
      const cue = fixture.debugElement.query(By.css('[data-testid="no-delegate-cue"]'));
      expect(cue).toBeTruthy();
      expect((cue.nativeElement as HTMLElement).textContent).toContain('No PI Delegate assigned');
    });
  });

  // ── 3. Row X → revoke (R-UI-008) ─────────────────────────────────────

  describe('revoke delegate', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('calls showGlobalAlert when the X button is clicked', () => {
      // K-015: arrange the initial render, then click X
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      expect(xBtns.length).toBe(2); // two delegates
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
      expect(alert.detail).toContain('alice@test.org');
      expect(alert.detail).toContain('PRJ-001');
    });

    it('calls revokePair with the EXACT (project_code, delegate_user_id) pair on confirm', fakeAsync(() => {
      // K-015: click X on delegate A → arrange confirm transition → accept
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      expect(serviceStub.revokePair).toHaveBeenCalledWith('PRJ-001', 1); // Alice's pair
    }));

    it('does NOT call revokePair for the second delegate when first is revoked (pair isolation)', fakeAsync(() => {
      // Clicking X on delegate A must only pass delegate_user_id=1, not 2 (R-UI-008)
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledWith('PRJ-001', 1);
      expect(serviceStub.revokePair).not.toHaveBeenCalledWith('PRJ-001', 2);
    }));

    it('does NOT call revokePair when the confirmation dialog is dismissed', fakeAsync(() => {
      // K-001/KZ-014: a guard that can be removed and the test still passes is not evidence.
      // Dismissing the confirm must leave revokePair uncalled.
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const hasCancelCallback = dismissConfirm(actionsStub);
      tick();

      // Verify the cancel path exists (the guard is real) and revoke was NOT fired
      expect(hasCancelCallback).toBe(true);
      expect(serviceStub.revokePair).not.toHaveBeenCalled();
    }));

    it('clicking X on delegate B calls revokePair with delegate_user_id=2', fakeAsync(() => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-project__chip__remove'));
      // xBtns[1] is Bob (second chip under first project)
      (xBtns[1].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledWith('PRJ-001', 2);
    }));
  });

  // ── 4. Search filtering ───────────────────────────────────────────────

  describe('search', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES, PROJECT_NO_DELEGATES]);
    });

    it('shows all rows when search is empty', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(2);
    });

    it('filters by project code', () => {
      component.searchQuery.set('PRJ-001');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('PRJ-001');
    });

    it('filters by project name', () => {
      component.searchQuery.set('alpha');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Alpha Research');
    });

    it('filters by delegate name (person search)', () => {
      // A query for 'alice' must match PRJ-001 (has Alice) but NOT PRJ-002 (no delegates).
      // Verifies search works by PERSON, not only by project — the spec requires both.
      component.searchQuery.set('alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('PRJ-001');
    });

    it('filters by delegate email', () => {
      component.searchQuery.set('bob@test.org');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(1);
    });

    it('returns no rows for a non-matching query', () => {
      component.searchQuery.set('zzznomatch');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      expect(rows.length).toBe(0);
    });

    it('a project-only search (by code) does NOT match a person-only name', () => {
      // Negative discriminator: if filtering were only by project, 'Alice' would return 0.
      // The component must also filter by person.
      component.searchQuery.set('Alice Example');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-project__row'));
      // Should still match PRJ-001 because Alice is a delegate there
      expect(rows.length).toBe(1);
    });
  });

  // ── 5. Assign output ─────────────────────────────────────────────────

  describe('assign button', () => {
    beforeEach(async () => {
      await createComponent([PROJECT_WITH_DELEGATES]);
    });

    it('emits assignRequested with the project code when Assign is clicked', () => {
      const emitted: { projectCode: string }[] = [];
      component.assignRequested.subscribe((v: { projectCode: string }) => emitted.push(v));

      const btn = fixture.debugElement.query(By.css('.by-project__assign-btn'));
      (btn.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      expect(emitted[0].projectCode).toBe('PRJ-001');
    });
  });

  // ── 6. Date formatting helper ─────────────────────────────────────────

  describe('formatDate', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('formats an ISO string defensively (does not throw)', () => {
      expect(() => component.formatDate('2024-01-15')).not.toThrow();
      expect(component.formatDate('2024-01-15')).toContain('2024');
    });

    it('returns "—" for null', () => {
      expect(component.formatDate(null)).toBe('—');
    });

    it('returns "—" for undefined', () => {
      expect(component.formatDate(undefined)).toBe('—');
    });

    it('handles a real Date object', () => {
      const d = new Date(2025, 5, 20); // June 20 2025
      expect(component.formatDate(d)).toContain('2025');
    });
  });
});
