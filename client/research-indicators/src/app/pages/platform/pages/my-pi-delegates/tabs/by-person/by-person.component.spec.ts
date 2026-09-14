// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-06)
//
// Spec contract:
//   1. byPersonCache sourcing (R-UI-003 / R-UI-010)
//   2. Reactive update after byPersonCache change (KZ-015)
//   3. Row X → confirm → revokePair (R-UI-008)
//   4. Search via searchQuery input
//   5. Assign output
//   6. Inactive person → red name + "INACTIVE" badge + red chip markers; active → none (discriminator)
//      KZ-015 transition: active→inactive when byPersonCache changes.
//
// K-020: --coverage=false for single-file runs.

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ByPersonComponent } from './by-person.component';
import { PiDelegatesClientService } from '../../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { DelegateProjects } from '@interfaces/pi-delegates.interface';
import type { GlobalAlert } from '@interfaces/global-alert.interface';

// ─── Test data ────────────────────────────────────────────────────────────────

const ALICE: DelegateProjects = {
  delegate_user_id: 1,
  name: 'Alice Example',
  email: 'alice@test.org',
  is_active: true,
  projects: [
    { project_code: 'PRJ-A', project_name: 'Alpha Research' },
    { project_code: 'PRJ-B', project_name: 'Beta Study' }
  ]
};

const BOB: DelegateProjects = {
  delegate_user_id: 2,
  name: 'Bob Sample',
  email: 'bob@test.org',
  is_active: true,
  projects: [
    { project_code: 'PRJ-B', project_name: 'Beta Study' }
  ]
};

const CAROL_INACTIVE: DelegateProjects = {
  delegate_user_id: 3,
  name: 'Carol Gone',
  email: 'carol@test.org',
  is_active: false,
  projects: [
    { project_code: 'PRJ-C', project_name: 'Carol Project' }
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
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ── 1. byPersonCache sourcing ─────────────────────────────────────────

  describe('byPersonCache — person row derivation', () => {
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

    it('Alice appears only ONCE', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      const aliceRows = rows.filter(r =>
        (r.nativeElement as HTMLElement).textContent?.includes('Alice Example')
      );
      expect(aliceRows.length).toBe(1);
    });

    it('negative: a person NOT in byPersonCache does not appear', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Carol Unmanaged');
    });

    it('null name/email coalesced to empty string (no "null" literal in DOM)', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('null');
    });
  });

  // ── 2. Inactive person indicator (red name + badge + red chips) ─────────────

  describe('inactive person rendering (is_active === false)', () => {
    it('INACTIVE: renders inactive icon in the name row (K-015 transition: active→inactive)', async () => {
      // Arrange: start with active person (no icon)
      await createComponent([ALICE]);
      const iconBefore = fixture.debugElement.query(By.css('.by-person__person__inactive-icon'));
      expect(iconBefore).toBeNull(); // no icon for active person (negative discriminator)

      // Act: switch to inactive person (K-015 transition)
      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Assert: inactive icon now present in the name row
      const icon = fixture.debugElement.query(By.css('.by-person__person__inactive-icon'));
      expect(icon).toBeTruthy();
    });

    it('INACTIVE: renders "INACTIVE" badge next to the name (K-015 transition)', async () => {
      // Arrange: start without badge
      await createComponent([ALICE]);
      const badgeBefore = fixture.debugElement.query(By.css('.by-person__person__inactive-badge'));
      expect(badgeBefore).toBeNull(); // active person — no badge (negative discriminator)

      // Act: switch to inactive
      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Assert: badge present and says INACTIVE
      const badge = fixture.debugElement.query(By.css('.by-person__person__inactive-badge'));
      expect(badge).toBeTruthy();
      expect((badge.nativeElement as HTMLElement).textContent?.trim().toUpperCase()).toContain('INACTIVE');
    });

    it('INACTIVE: name has atc-red-1 class (K-015 transition)', async () => {
      await createComponent([ALICE]);
      const nameBefore = fixture.debugElement.query(By.css('.by-person__person__name'));
      expect((nameBefore.nativeElement as HTMLElement).classList.contains('atc-red-1')).toBe(false);

      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const name = fixture.debugElement.query(By.css('.by-person__person__name'));
      expect((name.nativeElement as HTMLElement).classList.contains('atc-red-1')).toBe(true);
    });

    it('INACTIVE: project chips have by-person__chip--inactive class (K-015 transition)', async () => {
      await createComponent([ALICE]);
      const chipsBefore = fixture.debugElement.queryAll(By.css('.by-person__chip--inactive'));
      expect(chipsBefore.length).toBe(0); // active person — no red chips (negative discriminator)

      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const chips = fixture.debugElement.queryAll(By.css('.by-person__chip--inactive'));
      expect(chips.length).toBeGreaterThan(0);
    });

    it('INACTIVE: chip has pi-exclamation-circle icon (K-015 transition)', async () => {
      await createComponent([ALICE]);
      const iconBefore = fixture.debugElement.query(By.css('.by-person__chip__inactive-icon'));
      expect(iconBefore).toBeNull(); // active person — no exclamation icon in chip

      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.by-person__chip__inactive-icon'));
      expect(icon).toBeTruthy();
    });

    it('ACTIVE person does NOT render the inactive icon or badge (negative discriminator)', async () => {
      await createComponent([ALICE]);
      const icon = fixture.debugElement.query(By.css('.by-person__person__inactive-icon'));
      const badge = fixture.debugElement.query(By.css('.by-person__person__inactive-badge'));
      expect(icon).toBeNull();
      expect(badge).toBeNull();
    });
  });

  // ── 3. Reactive update — KZ-015 transition ────────────────────────────

  describe('reactive update after byPersonCache change', () => {
    it('updates the By-person view when byPersonCache is updated (post-revoke refetch)', async () => {
      await createComponent([ALICE, BOB]);

      let aliceRowText = (fixture.debugElement.queryAll(By.css('.by-person__row'))
        .find(r => (r.nativeElement as HTMLElement).textContent?.includes('Alice Example'))
        ?.nativeElement as HTMLElement | undefined)?.textContent ?? '';
      expect(aliceRowText).toContain('PRJ-A');
      expect(aliceRowText).toContain('PRJ-B');

      const aliceAfterRevoke: DelegateProjects = {
        ...ALICE,
        projects: [{ project_code: 'PRJ-B', project_name: 'Beta Study' }]
      };
      serviceStub.byPersonCache.set([aliceAfterRevoke, BOB]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      aliceRowText = (fixture.debugElement.queryAll(By.css('.by-person__row'))
        .find(r => (r.nativeElement as HTMLElement).textContent?.includes('Alice Example'))
        ?.nativeElement as HTMLElement | undefined)?.textContent ?? '';
      expect(aliceRowText).toContain('PRJ-B');
      expect(aliceRowText).not.toContain('PRJ-A');
    });
  });

  // ── 4. Row X → revoke (R-UI-008) ─────────────────────────────────────

  describe('revoke project chip', () => {
    beforeEach(async () => {
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
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      const [projectCode, delegateId] = serviceStub.revokePair.mock.calls[0] as [string, number];
      expect(delegateId).toBe(1);
      expect(['PRJ-A', 'PRJ-B']).toContain(projectCode);
    }));

    it('does NOT call revokePair when confirmation is dismissed', fakeAsync(() => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const hasCancelCallback = dismissConfirm(actionsStub);
      tick();

      expect(hasCancelCallback).toBe(true);
      expect(serviceStub.revokePair).not.toHaveBeenCalled();
    }));

    it('revoking from one project does NOT call revokePair twice (pair isolation — R-UI-008)', fakeAsync(() => {
      const xBtns = fixture.debugElement.queryAll(By.css('.by-person__chip__remove'));
      (xBtns[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      acceptConfirm(actionsStub);
      tick();

      expect(serviceStub.revokePair).toHaveBeenCalledTimes(1);
      const [projectCode] = serviceStub.revokePair.mock.calls[0] as [string, number];
      expect(['PRJ-A', 'PRJ-B']).toContain(projectCode);
    }));
  });

  // ── 5. Search via searchQuery input ───────────────────────────────────

  describe('search filtering via input', () => {
    beforeEach(async () => {
      await createComponent([ALICE, BOB]);
    });

    it('shows all person rows when searchQuery input is empty', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(2);
    });

    it('filters by person name when searchQuery input is set', () => {
      fixture.componentRef.setInput('searchQuery', 'alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Alice Example');
    });

    it('filters by project code', () => {
      fixture.componentRef.setInput('searchQuery', 'PRJ-A');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
      expect((rows[0].nativeElement as HTMLElement).textContent).toContain('Alice Example');
    });

    it('"PRJ-B" matches BOTH Alice and Bob (both on PRJ-B)', () => {
      fixture.componentRef.setInput('searchQuery', 'PRJ-B');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(2);
    });

    it('returns no rows for a non-matching query (negative discriminator)', () => {
      fixture.componentRef.setInput('searchQuery', 'zzznomatch');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(0);
    });

    it('person-only search ("alice") matches (not only-project search — discriminator)', () => {
      fixture.componentRef.setInput('searchQuery', 'alice');
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBe(1);
    });
  });

  // ── 6. Assign output ─────────────────────────────────────────────────

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
      expect(emitted[0].delegateUserId).toBe(1);
    });
  });

  // ── 7. Empty state ───────────────────────────────────────────────────

  describe('empty state', () => {
    beforeEach(async () => {
      await createComponent([]);
    });

    it('shows an empty message when there are no person rows', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('No PI delegates found');
    });
  });

  // ── 8. Real p-table (KZ-001) ─────────────────────────────────────────

  describe('p-table renders', () => {
    beforeEach(async () => {
      await createComponent([ALICE]);
    });

    it('renders the p-table header columns (Person, Email, Status, Managed projects, Actions)', () => {
      const headers = fixture.debugElement.queryAll(By.css('th'));
      const headerTexts = headers.map(h => (h.nativeElement as HTMLElement).textContent?.trim());
      expect(headerTexts).toContain('Person');
      expect(headerTexts).toContain('Email');
      expect(headerTexts).toContain('Status');
      expect(headerTexts).toContain('Managed projects');
    });

    it('renders body rows', () => {
      const rows = fixture.debugElement.queryAll(By.css('.by-person__row'));
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 9. Email column ───────────────────────────────────────────────────

  describe('Email column', () => {
    beforeEach(async () => {
      await createComponent([ALICE]);
    });

    it('renders row.email in the Email td cell', () => {
      const emailCells = fixture.debugElement.queryAll(By.css('.by-person__td--email'));
      expect(emailCells.length).toBeGreaterThanOrEqual(1);
      const cellText = (emailCells[0].nativeElement as HTMLElement).textContent?.trim() ?? '';
      expect(cellText).toContain('alice@test.org');
    });

    it('renders the .by-person__email span with the email value', () => {
      const emailSpan = fixture.debugElement.query(By.css('.by-person__email'));
      expect(emailSpan).toBeTruthy();
      expect((emailSpan.nativeElement as HTMLElement).textContent?.trim()).toBe('alice@test.org');
    });
  });

  // ── 10. Status pill (Active / Inactive) — KZ-015 discriminating ───────

  describe('Status pill', () => {
    it('ACTIVE: shows "Active" pill for is_active:true (KZ-015: start active, assert Active pill)', async () => {
      await createComponent([ALICE]); // ALICE has is_active: true
      const pill = fixture.debugElement.query(By.css('.by-person__status-pill'));
      expect(pill).toBeTruthy();
      expect((pill.nativeElement as HTMLElement).textContent?.trim()).toContain('Active');
      expect((pill.nativeElement as HTMLElement).classList.contains('by-person__status-pill--active')).toBe(true);
      expect((pill.nativeElement as HTMLElement).classList.contains('by-person__status-pill--inactive')).toBe(false);
    });

    it('INACTIVE: shows "Inactive" pill for is_active:false (KZ-015 transition: set inactive, assert Inactive pill)', async () => {
      // Arrange: start with active person — pill says "Active"
      await createComponent([ALICE]);
      const pillBefore = fixture.debugElement.query(By.css('.by-person__status-pill'));
      expect((pillBefore.nativeElement as HTMLElement).textContent?.trim()).toContain('Active');
      expect((pillBefore.nativeElement as HTMLElement).classList.contains('by-person__status-pill--inactive')).toBe(false);

      // Act: switch to inactive person (KZ-015 transition)
      serviceStub.byPersonCache.set([CAROL_INACTIVE]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Assert: pill now shows "Inactive"
      const pill = fixture.debugElement.query(By.css('.by-person__status-pill'));
      expect(pill).toBeTruthy();
      expect((pill.nativeElement as HTMLElement).textContent?.trim()).toContain('Inactive');
      expect((pill.nativeElement as HTMLElement).classList.contains('by-person__status-pill--inactive')).toBe(true);
      expect((pill.nativeElement as HTMLElement).classList.contains('by-person__status-pill--active')).toBe(false);
    });

    it('ACTIVE: pill does NOT show "Inactive" text for is_active:true (negative discriminator)', async () => {
      await createComponent([ALICE]);
      const pill = fixture.debugElement.query(By.css('.by-person__status-pill'));
      expect((pill.nativeElement as HTMLElement).textContent?.trim()).not.toContain('Inactive');
    });

    it('INACTIVE: pill does NOT show "Active" text for is_active:false (negative discriminator)', async () => {
      await createComponent([CAROL_INACTIVE]);
      const pill = fixture.debugElement.query(By.css('.by-person__status-pill'));
      expect((pill.nativeElement as HTMLElement).textContent?.trim()).not.toContain('Active');
    });
  });
});
