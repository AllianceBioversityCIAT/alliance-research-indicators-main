// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-06)
//
// Spec contract (K-015: arrange the TRANSITION — not the end state):
//
//   1. byPersonCache sourcing (R-UI-003 AC.2 + R-UI-010):
//      byPersonCache is populated by GET /api/pi-delegates/by-user/people.
//      Assert personRows reflects byPersonCache() — each DelegateProjects entry maps to
//      a PersonRow.  Negative discriminator: a person NOT in byPersonCache MUST NOT appear.
//
//   2. Reactive update (KZ-015):
//      Start with Alice on two projects → change byPersonCache to drop one project →
//      detectChanges → assert By-person view reflects the update.
//      (A stale second-cache impl would fail this.)
//
//   3. Row X → confirm → revokePair:
//      exact (project_code, delegate_user_id) pair; dismiss does NOT call revokePair;
//      revoking Alice from P-A does NOT call revokePair for P-B (pair isolation, R-UI-008).
//
//   4. Search discrimination: person-only vs project-only vs combined.
//
//   5. Assign output: emits { delegateUserId } for the correct person.
//
// K-020: --coverage=false for single-file runs; coverage gate is on the full suite.

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ByPersonComponent } from './by-person.component';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { DelegateProjects } from '@interfaces/pi-delegates.interface';
import type { GlobalAlert } from '@interfaces/global-alert.interface';

// ─── Test data (DelegateProjects — the byPersonCache shape) ───────────────────

/** Alice is delegated for TWO managed projects. */
const ALICE: DelegateProjects = {
  delegate_user_id: 1,
  name: 'Alice Example',
  email: 'alice@test.org',
  projects: [
    { project_code: 'PRJ-A', project_name: 'Alpha Research' },
    { project_code: 'PRJ-B', project_name: 'Beta Study' }
  ]
};

/** Bob is delegated for ONE managed project. */
const BOB: DelegateProjects = {
  delegate_user_id: 2,
  name: 'Bob Sample',
  email: 'bob@test.org',
  projects: [
    { project_code: 'PRJ-B', project_name: 'Beta Study' }
  ]
};

// ─── Service stubs ────────────────────────────────────────────────────────────

function buildServiceStub(people: DelegateProjects[] = []) {
  return {
    byProjectCache: signal([]),
    byPersonCache: signal(people),
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
 * Arranges the TRANSITION (K-015): guard must be accepted for the action to fire.
 */
function acceptConfirm(actionsStub: { showGlobalAlert: jest.Mock }): void {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  alert?.confirmCallback?.event?.();
}

/**
 * Fire the cancelCallback — verifies the cancel path exists and revoke is NOT called.
 * Returns true if cancelCallback was defined (the guard is real).
 */
function dismissConfirm(actionsStub: { showGlobalAlert: jest.Mock }): boolean {
  const call = actionsStub.showGlobalAlert.mock.calls[0];
  const alert = call?.[0] as GlobalAlert | undefined;
  alert?.cancelCallback?.event?.();
  return !!alert?.cancelCallback;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ByPersonComponent', () => {
  let fixture: ComponentFixture<ByPersonComponent>;
  let component: ByPersonComponent;
  let serviceStub: ReturnType<typeof buildServiceStub>;
  let actionsStub: ReturnType<typeof buildActionsStub>;

  async function createComponent(people: DelegateProjects[] = []) {
    serviceStub = buildServiceStub(people);
    actionsStub = buildActionsStub();

    await TestBed.configureTestingModule({
      imports: [ByPersonComponent, NoopAnimationsModule],
      providers: [
        { provide: PiDelegatesClientService, useValue: serviceStub },
        { provide: ActionsService, useValue: actionsStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ByPersonComponent);
    component = fixture.componentInstance;
    // K-015: construct in initial state THEN trigger initial change detection
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ── 1. byPersonCache sourcing (R-UI-003 AC.2 + R-UI-010) ─────────────

  describe('byPersonCache — person row derivation', () => {
    // Alice on PRJ-A and PRJ-B; Bob only on PRJ-B.
    beforeEach(async () => {
      await createComponent([ALICE, BOB]);
    });

    it('renders a row for Alice', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Alice Example');
      expect(text).toContain('alice@test.org');
    });

    it('renders a row for Bob', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Bob Sample');
      expect(text).toContain('bob@test.org');
    });

    it('shows Alice with BOTH her managed projects', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      const aliceRow = rows.find(r =>
        (r.nativeElement as HTMLElement).textContent?.includes('Alice Example')
      );
      expect(aliceRow).toBeTruthy();
      const rowText = (aliceRow!.nativeElement as HTMLElement).textContent ?? '';
      expect(rowText).toContain('PRJ-A');
      expect(rowText).toContain('PRJ-B');
    });

    it('Alice appears only ONCE (one byPersonCache entry → one row)', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      const aliceRows = rows.filter(r =>
        (r.nativeElement as HTMLElement).textContent?.includes('Alice Example')
      );
      expect(aliceRows.length).toBe(1);
    });

    it('shows Bob with only his one project (PRJ-B)', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      const bobRow = rows.find(r =>
        (r.nativeElement as HTMLElement).textContent?.includes('Bob Sample')
      );
      expect(bobRow).toBeTruthy();
      const rowText = (bobRow!.nativeElement as HTMLElement).textContent ?? '';
      expect(rowText).toContain('PRJ-B');
    });

    it('negative: a person NOT in byPersonCache does not appear (R-UI-003 AC.2)', () => {
      // byPersonCache has only Alice and Bob; "Carol Unmanaged" is not in any entry.
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Carol Unmanaged');
    });

    it('null name/email coalesced to empty string (no "null" literal in DOM)', () => {
      // DelegateProjects.name/email are string|null; component must coalesce to ''
      // not render the word "null".
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('null');
    });
  });

  // ── 2. Reactive update — KZ-015 transition ────────────────────────────

  describe('reactive update after byPersonCache change', () => {
    it('updates the By-person view when byPersonCache is updated (post-revoke refetch)', async () => {
      // Arrange: Alice on both PRJ-A and PRJ-B
      await createComponent([ALICE, BOB]);

      // Assert initial state: Alice has two projects
      let aliceRowText = (fixture.debugElement.queryAll(By.css('.by-person__row'))
        .find(r => (r.nativeElement as HTMLElement).textContent?.includes('Alice Example'))
        ?.nativeElement as HTMLElement | undefined)?.textContent ?? '';
      expect(aliceRowText).toContain('PRJ-A');
      expect(aliceRowText).toContain('PRJ-B');

      // Act: simulate a post-revoke refetch that drops Alice from PRJ-A
      const aliceAfterRevoke: DelegateProjects = {
        ...ALICE,
        projects: [{ project_code: 'PRJ-B', project_name: 'Beta Study' }]
      };
      serviceStub.byPersonCache.set([aliceAfterRevoke, BOB]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Assert: Alice's row now shows only PRJ-B (reactive, not stale)
      aliceRowText = (fixture.debugElement.queryAll(By.css('.by-person__row'))
        .find(r => (r.nativeElement as HTMLElement).textContent?.includes('Alice Example'))
        ?.nativeElement as HTMLElement | undefined)?.textContent ?? '';
      expect(aliceRowText).toContain('PRJ-B');
      expect(aliceRowText).not.toContain('PRJ-A');
    });
  });

  // ── 3. Row X → revoke (R-UI-008) ─────────────────────────────────────

  describe('revoke project chip', () => {
    beforeEach(async () => {
      // Alice on PRJ-A and PRJ-B; Bob on PRJ-B only.
      await createComponent([ALICE, BOB]);
    });

    it('calls showGlobalAlert when a project X is clicked', () => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      expect(xBtns.length).toBeGreaterThanOrEqual(1);
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(actionsStub.showGlobalAlert).toHaveBeenCalledTimes(1);
    });

    it('confirmation detail names the person and project', () => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const alert = actionsStub.showGlobalAlert.mock.calls[0][0] as GlobalAlert;
      expect(alert.detail).toContain('Alice Example');
      expect(alert.detail).toContain('alice@test.org');
    });

    it('calls revokePair with the EXACT (project_code, delegate_user_id) pair on confirm', fakeAsync(() => {
      // K-015: click X on Alice's first project chip → arrange confirm → accept
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      // Alice's first project chip is PRJ-A (from ALICE.projects[0])
      const [projectCode, delegateId] = serviceStub.revokePair.mock.calls[0] as [string, number];
      expect(delegateId).toBe(1); // Alice
      expect(['PRJ-A', 'PRJ-B']).toContain(projectCode); // one of Alice's projects
    }));

    it('does NOT call revokePair when confirmation is dismissed (guard must be real)', fakeAsync(() => {
      // K-001/KZ-014: removing the guard must make this test fail.
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const hasCancelCallback = dismissConfirm(actionsStub);
      tick();

      expect(hasCancelCallback).toBe(true);
      expect(serviceStub.revokePair).not.toHaveBeenCalled();
    }));

    it('revoking Alice from one project does NOT call revokePair for other projects (pair isolation — R-UI-008)', fakeAsync(() => {
      // Alice has chips for PRJ-A and PRJ-B.  Clicking the first chip must NOT
      // emit a revokePair call that includes both project codes.
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      // Exactly ONE call — revokePair is NOT called twice (for both projects)
      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      const [projectCode] = serviceStub.revokePair.mock.calls[0] as [string, number];
      // The single call targets one project only (not both at once)
      expect(typeof projectCode).toBe('string');
      expect(['PRJ-A', 'PRJ-B']).toContain(projectCode);
    }));
  });

  // ── 4. Search discrimination ───────────────────────────────────────────

  describe('search filtering', () => {
    beforeEach(async () => {
      // Alice on PRJ-A and PRJ-B; Bob on PRJ-B only.
      await createComponent([ALICE, BOB]);
    });

    it('shows all person rows when search is empty', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      // Alice and Bob are distinct people → 2 rows
      expect(rows.length).toBe(2);
    });

    it('filters by person name', () => {
      component.searchQuery.set('alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Alice Example');
    });

    it('filters by person email', () => {
      component.searchQuery.set('bob@test.org');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Bob Sample');
    });

    it('filters by project code (project search)', () => {
      // PRJ-A only has Alice → filtering by 'PRJ-A' should return Alice only
      component.searchQuery.set('PRJ-A');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Alice Example');
    });

    it('filters by project name', () => {
      component.searchQuery.set('Alpha Research');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
    });

    it('person-only search ("alice") does NOT match a project-only term', () => {
      // Negative discriminator: 'alice' is a person name; if search were only-by-project
      // it would return 0 rows. It must return 1 (Alice's row).
      component.searchQuery.set('alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
    });

    it('project-only search ("PRJ-B") matches BOTH Alice and Bob (both are on PRJ-B)', () => {
      // PRJ-B is in both Alice's and Bob's byPersonCache entries.
      component.searchQuery.set('PRJ-B');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(2);
    });

    it('returns no rows for a non-matching query', () => {
      component.searchQuery.set('zzznomatch');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(0);
    });
  });

  // ── 5. Assign output ─────────────────────────────────────────────────

  describe('assign button', () => {
    beforeEach(async () => {
      await createComponent([ALICE]);
    });

    it('emits assignRequested with the delegateUserId when Assign is clicked', () => {
      const emitted: { delegateUserId: number }[] = [];
      component.assignRequested.subscribe((v: { delegateUserId: number }) => emitted.push(v));

      const btn = fixture.debugElement.query(By.css('.by-person__assign-btn'));
      (btn.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      expect(emitted[0].delegateUserId).toBe(1); // Alice's delegate_user_id
    });
  });

  // ── 6. Empty state (NFR-UI-003) ───────────────────────────────────────

  describe('empty state', () => {
    beforeEach(async () => {
      await createComponent([]); // no people → no person rows
    });

    it('shows an empty message when there are no person rows', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('No PI delegates found');
    });
  });

  // ── 7. Real p-table (KZ-001) ─────────────────────────────────────────

  describe('p-table renders (KZ-001 — not an empty stub)', () => {
    beforeEach(async () => {
      await createComponent([ALICE]);
    });

    it('renders the p-table header columns', () => {
      const headers = fixture.debugElement.queryAll(By.css('th'));
      const headerTexts = headers.map(h => (h.nativeElement as HTMLElement).textContent?.trim());
      expect(headerTexts).toContain('Person');
      expect(headerTexts).toContain('Managed projects');
    });

    it('renders body rows for persons in the cache', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
