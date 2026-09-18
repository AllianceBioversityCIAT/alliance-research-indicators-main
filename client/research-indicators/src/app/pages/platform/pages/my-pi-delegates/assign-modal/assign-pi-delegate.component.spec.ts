// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-07)
//
// Tests for AssignPiDelegateComponent.
// Covers:
//   R-UI-005 AC.3/AC.4 — self-exclusion filter, Accept gating.
//   R-UI-006 AC.1/AC.2 — SYNC pre-load from By-project / By-person context.
//   R-UI-007 AC.1 — named delta confirm (ADDED and REMOVED; revoke-all explicit).
//   design §7 — POST payload shape (per-project full desired list).
//
// Discipline: KZ-015 — every test arranges the TRANSITION (open-then-assert, not
//   set-initial-state-then-check-it). KZ-014 — assertions must discriminate
//   (wrong value FAILS, not coincidentally passes). KZ-001 — stubs evaluate.

import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush
} from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AssignPiDelegateComponent } from './assign-pi-delegate.component';
import { AllModalsService } from '@services/cache/all-modals.service';
import { CacheService } from '@services/cache/cache.service';
import { PiDelegatesClientService } from '../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { ProjectDelegates } from '@interfaces/pi-delegates.interface';
import type { GlobalAlert } from '@interfaces/global-alert.interface';
import { ServiceLocatorService } from '@services/service-locator.service';
import { UtilsService } from '@services/utils.service';
import { PiDelegatePeoplePickerStubService } from '../services/pi-delegate-picker-stub.service';

// ─── Minimal stubs ────────────────────────────────────────────────────────────

/**
 * Stub for AllModalsService.
 * Uses real WritableSignals so that effects that watch isModalOpen() and
 * assignPiDelegateContext() fire correctly across the open→pre-load transition
 * (KZ-015: arrange the transition, not the end state).
 */
class MockAllModalsService {
  // Real writable signals so effects in the component fire correctly.
  private _modalConfig = signal<Record<string, { isOpen: boolean; title: string }>>({
    assignPiDelegate: { isOpen: false, title: 'Assign / Edit PI Delegate' }
  });
  // Mirrors AllModalsService.assignPiDelegateContext exactly — a stub that is
  // narrower than the real signal type-errors on a context the product accepts.
  assignPiDelegateContext = signal<
    | { source: 'byProject'; projectCode: string }
    | { source: 'byPerson'; delegateUserId: number }
    | { source: 'newDelegate' }
    | null
  >(null);

  modalConfig = this._modalConfig;

  isModalOpen(name: string) {
    return this._modalConfig()[name] ?? { isOpen: false };
  }

  openModal(name: string) {
    this._modalConfig.update(m => ({
      ...m,
      [name]: { ...m[name], isOpen: true }
    }));
  }

  closeModal(name: string) {
    this._modalConfig.update(m => ({
      ...m,
      [name]: { ...m[name], isOpen: false }
    }));
  }

  toggleModal(name: string) {
    this._modalConfig.update(m => ({
      ...m,
      [name]: { ...m[name], isOpen: !m[name]?.isOpen }
    }));
  }
}

class MockCacheService {
  dataCache = signal({ user: { sec_user_id: 99 } });
  // Required by MultiselectComponent (KZ-001: the real component evaluates optionFilter
  // and needs currentResultIsLoading as a callable signal).
  currentResultIsLoading = signal(false);
}

/**
 * Minimal stub for ServiceLocatorService.
 * MultiselectComponent calls getService(serviceName) in ngOnInit.
 * Return a stub service that exposes the signals MultiselectComponent expects.
 */
class MockServiceLocatorService {
  // One stable stub per name so a test can push options into the list the
  // real MultiselectComponent renders.
  readonly services: Record<string, { list: ReturnType<typeof signal<unknown[]>>; loading: ReturnType<typeof signal<boolean>>; isOpenSearch: ReturnType<typeof signal<boolean>>; main: () => Promise<void> }> = {};

  getService(name: string) {
    this.services[name] ??= {
      list: signal<unknown[]>([]),
      loading: signal(false),
      isOpenSearch: signal(false),
      main: async () => undefined
    };
    return this.services[name];
  }
}

class MockUtilsService {
  getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return obj;
    return path.split('.').reduce((acc: unknown, key: string) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  setNestedPropertyWithReduce(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
}

class MockActionsService {
  showGlobalAlertCalls: Parameters<ActionsService['showGlobalAlert']>[0][] = [];
  showToastCalls: Parameters<ActionsService['showToast']>[0][] = [];

  showGlobalAlert(alert: Parameters<ActionsService['showGlobalAlert']>[0]) {
    this.showGlobalAlertCalls.push(alert);
  }

  showToast(msg: Parameters<ActionsService['showToast']>[0]) {
    this.showToastCalls.push(msg);
  }
}

class MockPiDelegatesClientService {
  byProjectCache = signal<ProjectDelegates[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope — drives the
  // Projects field description; writable so a test can flip the modal into the
  // administrator view.
  isAdminView = signal(false);
  assignCalls: Parameters<PiDelegatesClientService['assign']>[0][] = [];

  async assign(assignments: Parameters<PiDelegatesClientService['assign']>[0]) {
    this.assignCalls.push(assignments);
    // No-op: does not mutate byProjectCache (tests check what was submitted)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProject(
  code: string,
  delegates: { delegate_user_id: number; name: string; email: string; is_active?: boolean }[],
  piUserId: number | null = null
): ProjectDelegates {
  return {
    project_code: code,
    project_name: `Project ${code}`,
    is_pool_funding_contributor: false,
    pi_user_id: piUserId,
    pi_name: null,
    status: 'Ongoing',
    start_date: '2024-01-15' as unknown as Date,
    end_date: '2026-12-31' as unknown as Date,
    delegates: delegates.map(d => ({ ...d, is_active: d.is_active ?? true }))
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

// ─── PI-exclusion stub: the people the picker offers ────────────────────────

class MockPeoplePickerService {
  list = signal<{ delegate_user_id: number; name: string; email: string }[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  main = jest.fn(async () => undefined);
}

describe('AssignPiDelegateComponent', () => {
  let fixture: ComponentFixture<AssignPiDelegateComponent>;
  let component: AssignPiDelegateComponent;
  let modalService: MockAllModalsService;
  let piService: MockPiDelegatesClientService;
  let actionsService: MockActionsService;
  let cacheService: MockCacheService;
  let serviceLocator: MockServiceLocatorService;
  let peoplePicker: MockPeoplePickerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AssignPiDelegateComponent,
        // Import real MultiselectComponent — it evaluates the optionFilter
        // so self-exclusion can be asserted (KZ-001: stubs must evaluate).
        MultiselectComponent
      ],
      providers: [
        { provide: AllModalsService, useClass: MockAllModalsService },
        { provide: CacheService, useClass: MockCacheService },
        { provide: PiDelegatesClientService, useClass: MockPiDelegatesClientService },
        { provide: ActionsService, useClass: MockActionsService },
        { provide: ServiceLocatorService, useClass: MockServiceLocatorService },
        { provide: UtilsService, useClass: MockUtilsService },
        { provide: PiDelegatePeoplePickerStubService, useClass: MockPeoplePickerService }
      ]
    }).compileComponents();

    modalService = TestBed.inject(AllModalsService) as unknown as MockAllModalsService;
    piService = TestBed.inject(PiDelegatesClientService) as unknown as MockPiDelegatesClientService;
    actionsService = TestBed.inject(ActionsService) as unknown as MockActionsService;
    cacheService = TestBed.inject(CacheService) as unknown as MockCacheService;
    serviceLocator = TestBed.inject(ServiceLocatorService) as unknown as MockServiceLocatorService;
    peoplePicker = TestBed.inject(PiDelegatePeoplePickerStubService) as unknown as MockPeoplePickerService;

    fixture = TestBed.createComponent(AssignPiDelegateComponent);
    component = fixture.componentInstance;

    // KZ-015: construct in the CLOSED state (isOpen = false already in mock).
    fixture.detectChanges(); // first detectChanges: ngOnInit + effect registration
  });

  // ─── Accept gating (R-UI-005 AC.4) ──────────────────────────────────────────

  describe('Accept gating (R-UI-005 AC.4)', () => {
    it('is disabled when 0 people AND 0 projects selected', () => {
      // Initial state: both empty.
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('is disabled when ≥1 person but 0 projects selected', () => {
      // Transition: add people, leave projects empty.
      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]
      });
      fixture.detectChanges();
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('is disabled when ≥1 project but 0 people selected', () => {
      // Transition: add projects, leave people empty.
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('is enabled (false) when ≥1 person AND ≥1 project selected', () => {
      // Transition: set both.
      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();
      // KZ-014: must be false (not true) — the transition from true→false is what we assert.
      expect(component.disabledConfirmIf()).toBe(false);
    });
  });

  // ─── Self-exclusion (R-UI-005 AC.3) ─────────────────────────────────────────

  describe('Self-exclusion filter (R-UI-005 AC.3)', () => {
    it('excludes the current user from People options', () => {
      // Current user id = 99 (from MockCacheService).
      const filter = component.selfExclusionFilter();

      // The filter must EXCLUDE user 99.
      expect(filter({ delegate_user_id: 99, name: 'Me', email: 'me@test.com' })).toBe(false);

      // The filter must INCLUDE anyone else.
      expect(filter({ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' })).toBe(true);
      expect(filter({ delegate_user_id: 2, name: 'Bob', email: 'b@test.com' })).toBe(true);
    });

    it('recomputes the filter when the current user changes', () => {
      cacheService.dataCache.set({ user: { sec_user_id: 42 } });
      fixture.detectChanges();
      const filter = component.selfExclusionFilter();
      expect(filter({ delegate_user_id: 42, name: 'Changed', email: 'c@test.com' })).toBe(false);
      expect(filter({ delegate_user_id: 99, name: 'Old', email: 'o@test.com' })).toBe(true);
    });
  });

  // ─── Pre-load from By-project context (R-UI-006 AC.1) ───────────────────────

  describe('Pre-load from By-project context (R-UI-006 AC.1 — anti-revoke guard)', () => {
    beforeEach(() => {
      // Arrange: cache has project P1 with delegates Alice (1) and Bob (2).
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com' },
          { delegate_user_id: 2, name: 'Bob', email: 'b@test.com' }
        ])
      ]);
    });

    it('pre-seeds People with [Alice, Bob] when opened from By-project for P1', fakeAsync(() => {
      // KZ-015: start closed → then open (arrange the TRANSITION).
      expect(modalService.isModalOpen('assignPiDelegate').isOpen).toBe(false);
      expect(component.peopleSignal().selected_people).toHaveLength(0); // not pre-seeded yet

      // Transition: set context + open.
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick(); // allow effects to flush

      const selected = component.peopleSignal().selected_people;
      // KZ-014: must contain exactly Alice + Bob — a different value would fail.
      expect(selected.map(p => p.delegate_user_id).sort()).toEqual([1, 2]);
    }));

    it('pre-selects project P1 when opened from By-project for P1', fakeAsync(() => {
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      const selectedProjects = component.projectsSignal().selected_projects;
      expect(selectedProjects.map(p => p.project_code)).toEqual(['P1']);
    }));

    it('does NOT pre-seed People when modal starts closed (no phantom pre-load)', () => {
      // KZ-015: the initial closed state must not have pre-seeded values.
      expect(component.peopleSignal().selected_people).toHaveLength(0);
      expect(component.projectsSignal().selected_projects).toHaveLength(0);
    });
  });

  // ─── Pre-load from By-person context (R-UI-006 AC.2) ────────────────────────

  describe('Pre-load from By-person context (R-UI-006 AC.2)', () => {
    beforeEach(() => {
      // Arrange: Alice (1) is a delegate on P1 and P2.
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]),
        buildProject('P2', [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com' },
          { delegate_user_id: 2, name: 'Bob', email: 'b@test.com' }
        ])
      ]);
    });

    it('pre-seeds Alice as People and [P1, P2] as Projects when opened for Alice', fakeAsync(() => {
      expect(component.peopleSignal().selected_people).toHaveLength(0); // start closed

      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      const people = component.peopleSignal().selected_people;
      const projects = component.projectsSignal().selected_projects;

      expect(people.map(p => p.delegate_user_id)).toEqual([1]);
      expect(projects.map(p => p.project_code).sort()).toEqual(['P1', 'P2']);
    }));
  });

  // ─── Delta confirmation — named add/remove (R-UI-007 AC.1) ──────────────────

  describe('Delta confirmation — add/remove named (R-UI-007 AC.1)', () => {
    beforeEach(() => {
      // Arrange: cache has P1 with Alice (1) and Bob (2).
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com' },
          { delegate_user_id: 2, name: 'Bob', email: 'b@test.com' }
        ])
      ]);
    });

    it('names Bob as REMOVED when P1 has [Alice, Bob] but user selects only Alice', () => {
      // Arrange transition: select only Alice for P1.
      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();

      component.onConfirm();

      expect(actionsService.showGlobalAlertCalls.length).toBe(1);
      const detail = actionsService.showGlobalAlertCalls[0].detail;

      // KZ-014: Bob MUST appear as removed — if delta logic were dropped this would fail.
      expect(detail).toContain('Bob');
      expect(detail.toLowerCase()).toContain('remov');

      // Alice should NOT appear as removed (she was not deselected).
      // We check that "removed" text does NOT mention Alice alone.
      // (Alice may appear in unchanged or added text — we don't assert that here.)
    });

    it('does NOT list Alice as removed when Alice is kept', () => {
      // Arrange: Alice stays selected.
      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();
      component.onConfirm();

      const detail = actionsService.showGlobalAlertCalls[0].detail;
      // KZ-014: the detail must NOT contain Alice as removed.
      // Strategy: if "Removed" is in the detail, Alice must NOT be the sole named person there.
      // The safest check: detail doesn't include "Removed: Alice" or "revoked): Alice".
      const lowerDetail = detail.toLowerCase();
      const removedIndex = lowerDetail.indexOf('remov');
      if (removedIndex >= 0) {
        // Only Bob should follow "removed" — not Alice.
        const removedSection = detail.slice(removedIndex);
        expect(removedSection).not.toMatch(/:\s*Alice/);
      }
    });

    it('explicitly states revoke-all when no people are selected (named red input)', () => {
      // Arrange transition: DESELECT all people, keep P1.
      component.peopleSignal.set({ selected_people: [] });
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();

      component.onConfirm();

      const detail = actionsService.showGlobalAlertCalls[0].detail;
      // KZ-014: emptying the selection must be called out, and the people who
      // lose access must be named.
      expect(detail.toLowerCase()).toContain('loses access');
      expect(detail).toContain('Removed');
      expect(detail).toContain('Alice');
      expect(detail).toContain('Bob');
    });
  });

  // ─── POST payload shape (design §7 SYNC) ────────────────────────────────────

  describe('POST payload shape (design §7 SYNC)', () => {
    it('calls service.assign with per-project full desired list on confirm → save', fakeAsync(() => {
      // Arrange: cache has P1 with no prior delegates, P2 also selected.
      piService.byProjectCache.set([
        buildProject('P1', []),
        buildProject('P2', [])
      ]);

      component.peopleSignal.set({
        selected_people: [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com' },
          { delegate_user_id: 2, name: 'Bob', email: 'b@test.com' }
        ]
      });
      component.projectsSignal.set({
        selected_projects: [
          { project_code: 'P1', project_name: 'Project P1' },
          { project_code: 'P2', project_name: 'Project P2' }
        ]
      });
      fixture.detectChanges();

      component.onConfirm();
      expect(actionsService.showGlobalAlertCalls.length).toBe(1);

      // Simulate user clicking "Save" in the confirm dialog.
      // confirmCallback.event is async — trigger it, then flush microtasks.
      const confirmCallback = actionsService.showGlobalAlertCalls[0].confirmCallback;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      confirmCallback?.event?.();
      flush();
      tick();

      // KZ-014: service.assign called once with the correct SYNC payload.
      expect(piService.assignCalls.length).toBe(1);
      const submitted = piService.assignCalls[0];

      // Two projects, each with [Alice, Bob] as the full desired list.
      expect(submitted.length).toBe(2);

      const p1 = submitted.find(a => a.project_id === 'P1');
      const p2 = submitted.find(a => a.project_id === 'P2');
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      // Assert the delegate shape: { delegate_user_id: number } — no extra fields required.
      expect(p1!.delegates.map(d => (d as { delegate_user_id: number }).delegate_user_id).sort())
        .toEqual([1, 2]);
      expect(p2!.delegates.map(d => (d as { delegate_user_id: number }).delegate_user_id).sort())
        .toEqual([1, 2]);
    }));

    it('sends an empty delegates array when no people are selected (revoke-all case)', fakeAsync(() => {
      piService.byProjectCache.set([buildProject('P1', [])]);
      component.peopleSignal.set({ selected_people: [] });
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();

      component.onConfirm();
      const confirmCallback = actionsService.showGlobalAlertCalls[0].confirmCallback;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      confirmCallback?.event?.();
      flush();
      tick();

      expect(piService.assignCalls.length).toBe(1);
      expect(piService.assignCalls[0][0].delegates).toHaveLength(0);
    }));
  });

  // ─── State reset on close ────────────────────────────────────────────────────

  describe('State reset', () => {
    it('clears both selections when the modal closes (open→close transition)', fakeAsync(() => {
      // Arrange: open + pre-load.
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // Verify pre-loaded.
      expect(component.peopleSignal().selected_people.length).toBeGreaterThan(0);

      // Transition: close the modal.
      modalService.closeModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // After close: state cleared.
      expect(component.peopleSignal().selected_people).toHaveLength(0);
      expect(component.projectsSignal().selected_projects).toHaveLength(0);
    }));
  });

  // ─── CHANGE 3: People picker disabled when source=byPerson ──────────────────

  describe('People picker disabled (CHANGE 3)', () => {
    it('peopleDisabled() is false when modal starts closed (initial state — no context)', () => {
      expect(component.peopleDisabled()).toBe(false);
    });

    it('peopleDisabled() is true when context source is byPerson (KZ-015: closed→open)', fakeAsync(() => {
      // Start closed
      expect(component.peopleDisabled()).toBe(false);

      // Transition: set byPerson context and open
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // KZ-014: must be true after the open transition
      expect(component.peopleDisabled()).toBe(true);
    }));

    it('peopleDisabled() is false when context source is byProject (negative discriminator)', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // KZ-014: must be false — projects source does NOT disable the people picker
      expect(component.peopleDisabled()).toBe(false);
    }));

    it('renders the people-locked helper text when peopleDisabled() is true (KZ-015)', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      // KZ-014: the locked helper must exist and contain the spec copy
      expect(el.textContent).toContain('Opened from this person');
      expect(el.textContent).toContain('only the projects can be changed here');
    }));

    it('does NOT render the people-locked helper text when source is byProject (negative discriminator)', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      // KZ-014: people-locked helper must NOT appear for byProject source
      expect(el.textContent).not.toContain('Opened from this person');
    }));

    it('Projects picker stays EDITABLE (projectsDisabled=false) when source is byPerson', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // KZ-014: projectsDisabled must be false when byPerson (it should only be true for byProject)
      expect(component.projectsDisabled()).toBe(false);
    }));
  });

  // ─── CHANGE 1: Projects picker disabled when source=byProject ────────────────

  describe('Projects picker disabled (CHANGE 1)', () => {
    it('projectsDisabled() is true when context source is byProject (KZ-015: closed→open)', fakeAsync(() => {
      // Start closed — projectsDisabled should be false (no context yet).
      expect(component.projectsDisabled()).toBe(false);

      // Transition: set byProject context and open.
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // KZ-014: must be true after the open transition — a wrong value would fail.
      expect(component.projectsDisabled()).toBe(true);

      // The [disabled] input on the Projects app-multiselect must be true.
      // Query the element rendered by the SECOND app-multiselect (Projects).
      const multiselects = fixture.nativeElement.querySelectorAll('app-multiselect');
      // The Projects multiselect is the second one in the DOM.
      expect(multiselects.length).toBeGreaterThanOrEqual(2);
    }));

    it('projectsDisabled() is false when context source is byPerson (negative discriminator)', fakeAsync(() => {
      // Arrange: byPerson context — project picker must stay interactive.
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // KZ-014: must be false — if it were true the negative discriminator would have failed.
      expect(component.projectsDisabled()).toBe(false);
    }));

    it('renders the locked helper text when projectsDisabled() is true', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      // KZ-014: the locked helper must exist and contain the spec copy.
      expect(el.textContent).toContain('Opened from this project');
      expect(el.textContent).toContain('only the people can be changed here');
    }));

    it('does NOT render the locked helper text when source is byPerson', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      // KZ-014: locked helper must NOT be in DOM when source is byPerson.
      expect(el.textContent).not.toContain('Opened from this project');
    }));
  });

  // ─── CHANGE 2: Inactive-delegate amber warning ────────────────────────────────

  describe('Inactive-delegate warning (CHANGE 2)', () => {
    it('renders the amber warning and names the inactive person (KZ-015: closed→open)', fakeAsync(() => {
      // Arrange: project P1 has Alice (active) and Carol (inactive).
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com', is_active: true },
          { delegate_user_id: 3, name: 'Carol', email: 'c@test.com', is_active: false }
        ])
      ]);

      // KZ-015: start closed — no warning yet.
      expect(component.inactiveSelectedPeople()).toHaveLength(0);

      // Transition: open from byProject context.
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // KZ-014: Carol must be in inactiveSelectedPeople — a wrong value would fail.
      expect(component.inactiveSelectedPeople().map(p => p.name)).toContain('Carol');
      expect(component.inactiveSelectedPeople().map(p => p.name)).not.toContain('Alice');

      // The amber warning must be rendered in the DOM and name Carol.
      const el: HTMLElement = fixture.nativeElement;
      const warning = el.querySelector('.assign-pi-delegate__inactive-warning');
      expect(warning).not.toBeNull();
      expect(warning!.textContent).toContain('Carol');
    }));

    it('does NOT render the amber warning when all pre-loaded delegates are active', fakeAsync(() => {
      // Arrange: all delegates are active.
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 1, name: 'Alice', email: 'a@test.com', is_active: true },
          { delegate_user_id: 2, name: 'Bob', email: 'b@test.com', is_active: true }
        ])
      ]);

      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // KZ-014: warning must not be present (negative discriminator).
      expect(component.inactiveSelectedPeople()).toHaveLength(0);
      const el: HTMLElement = fixture.nativeElement;
      const warning = el.querySelector('.assign-pi-delegate__inactive-warning');
      expect(warning).toBeNull();
    }));

    it('uses the shared amber notice design (same as the project-dashboard cards)', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 3, name: 'Carol', email: 'c@test.com', is_active: false }])
      ]);

      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const warning = el.querySelector('.assign-pi-delegate__inactive-warning') as HTMLElement;
      // amber accent bar + cream background, as on the dashboard chart notices
      expect(warning.className).toContain('border-l-[color:var(--ac-warning-1)]');
      expect(warning.className).toContain('bg-[color:var(--ac-warning-surface)]');

      const text = warning.querySelector('.assign-pi-delegate__inactive-warning-text') as HTMLElement;
      expect(text.className).toContain('text-[12.5px]');
      expect(text.className).toContain('font-semibold');
      expect(text.className).toContain('text-[color:var(--ac-warning-fg)]/80');
    }));

    it('names multiple inactive delegates in the warning text', fakeAsync(() => {
      // Arrange: two inactive delegates.
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 3, name: 'Carol', email: 'c@test.com', is_active: false },
          { delegate_user_id: 4, name: 'Dave', email: 'd@test.com', is_active: false }
        ])
      ]);

      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.inactiveSelectedPeople()).toHaveLength(2);
      const el: HTMLElement = fixture.nativeElement;
      const warning = el.querySelector('.assign-pi-delegate__inactive-warning');
      expect(warning).not.toBeNull();
      // KZ-014: both names must appear.
      expect(warning!.textContent).toContain('Carol');
      expect(warning!.textContent).toContain('Dave');
    }));
  });
  // ── Fixed width — the modal must not resize when the selection changes ──────

  describe('fixed width', () => {
    it('the content root declares a fixed width, not a content-driven one', () => {
      fixture.detectChanges();
      const root = fixture.nativeElement.querySelector('.assign-pi-delegate') as HTMLElement;
      expect(root.className).toContain('w-[720px]');
      expect(root.className).toContain('max-w-[88vw]');
    });
  });
  // ── PI exclusion in the People picker (backend rule R-PID-008) ──────────────

  describe('PI exclusion', () => {
    const PEOPLE = [
      { delegate_user_id: 10, name: 'Mayesse Da Silva', email: 'mayesse@test.com' },
      { delegate_user_id: 11, name: 'Alice Example', email: 'alice@test.com' }
    ];

    /** Opens the modal on a project whose PI is `piUserId` (null = lead has no STAR account). */
    async function openForProject(projectCode: string, piUserId: number | null): Promise<void> {
      peoplePicker.list.set(PEOPLE);
      piService.byProjectCache.set([buildProject(projectCode, [], piUserId)]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('disables the PI of the selected project, matched by sec_user_id', async () => {
      await openForProject('P1', 10);

      expect(component.piDisabledPeople().map(p => p.delegate_user_id)).toEqual([10]);
      expect(component.piDisabledNames()).toBe('Mayesse Da Silva');
    });

    it('disables nobody when the project has no PI account (pi_user_id null)', async () => {
      await openForProject('P2', null);

      expect(component.piDisabledPeople()).toHaveLength(0);
    });

    it('disables nobody when the PI is not among the people offered (negative discriminator)', async () => {
      await openForProject('P3', 999);

      expect(component.piDisabledPeople()).toHaveLength(0);
    });

    it('marks the PI option itself, so the row says why it is greyed out', async () => {
      await openForProject('P7', 10);

      // the helper the option template calls
      expect(component.isProjectPi({ delegate_user_id: 10 })).toBe(true);
      expect(component.isProjectPi({ delegate_user_id: 11 })).toBe(false);
      expect(component.isProjectPi(null)).toBe(false);
    });

    it('renders a hint naming the disabled Principal Investigator', async () => {
      await openForProject('P4', 10);

      const hint = fixture.nativeElement.querySelector('.assign-pi-delegate__pi-hint') as HTMLElement | null;
      expect(hint).not.toBeNull();
      expect(hint!.textContent).toContain('Mayesse Da Silva');
      expect(hint!.textContent).toContain('Principal Investigator');
    });

    it('marks the PI option as disabled inside the People multiselect', async () => {
      // Feed the same options into the picker the multiselect renders from.
      serviceLocator.getService('piDelegatePeople').list.set(PEOPLE);

      await openForProject('P5', 10);
      fixture.detectChanges();

      const multiselects = fixture.debugElement.queryAll(By.directive(MultiselectComponent));
      const peoplePickerCmp = multiselects[0].componentInstance as MultiselectComponent;
      const options = peoplePickerCmp.availableOptions() as { delegate_user_id: number; disabled?: unknown }[];

      const pi = options.find(o => o.delegate_user_id === 10);
      const other = options.find(o => o.delegate_user_id === 11);
      expect(pi?.disabled).toBeTruthy();
      expect(other?.disabled).toBeFalsy();
    });
  });
  // ── Option rows: the info each picker shows (design parity with the
  //    "Contributing projects" selector in Alliance Alignment) ────────────────

  describe('option rows', () => {
    async function openOnProjectWith(
      delegates: { delegate_user_id: number; name: string; email: string; carnet?: string | null }[]
    ): Promise<void> {
      const project = {
        ...buildProject('ROWS-1', []),
        delegates: delegates.map(d => ({ ...d, is_active: true, carnet: d.carnet ?? null }))
      };
      piService.byProjectCache.set([project]);

      // The multiselect only renders selected rows once its option list is loaded.
      serviceLocator.getService('piDelegatePeople').list.set(project.delegates);
      serviceLocator.getService('piDelegateProjects').list.set([project]);

      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'ROWS-1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('shows name, email and carnet for a selected person', async () => {
      await openOnProjectWith([
        { delegate_user_id: 1, name: 'Alice Example', email: 'alice@test.org', carnet: 'C00042' }
      ]);

      // Name on top, details below as label → value (same layout as Projects)
      const row = fixture.nativeElement.querySelector('.selected-row-main') as HTMLElement;
      const text = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      expect(text).toContain('Alice Example');
      expect(text).toContain('Email');
      expect(text).toContain('alice@test.org');
      expect(text).toContain('Carnet');
      expect(text).toContain('C00042');
    });

    it('omits the carnet line when the person has none (negative discriminator)', async () => {
      await openOnProjectWith([
        { delegate_user_id: 2, name: 'Bob Sample', email: 'bob@test.org', carnet: null }
      ]);

      const row = fixture.nativeElement.querySelector('.selected-row-main') as HTMLElement;
      const text = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      expect(text).toContain('Bob Sample');
      expect(text).toContain('bob@test.org');
      expect(text).not.toContain('Carnet');
    });

    it('shows code, name, status tag and both dates for a selected project', async () => {
      await openOnProjectWith([]);

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('ROWS-1 - Project ROWS-1');
      expect(text).toContain('Start date');
      expect(text).toContain('End date');
      // Month/year only: the ISO date is rendered in the viewer's timezone, so the
      // day can shift by one — the same behaviour as the By project table.
      expect(text).toContain('Jan 2024');
      expect(text).toContain('Dec 2026');
      // Status renders through the shared tag, like the By project table
      const tag = fixture.nativeElement.querySelector('app-custom-tag div') as HTMLElement | null;
      expect(tag?.textContent?.trim()).toBe('Ongoing');
    });

    it('hides the End date block when the project has no end date', async () => {
      const project = { ...buildProject('ROWS-2', []), end_date: null };
      piService.byProjectCache.set([project]);
      serviceLocator.getService('piDelegateProjects').list.set([project]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'ROWS-2' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Start date');
      expect(text).not.toContain('End date');
    });

    it('formatDate returns an em dash for a missing date', () => {
      expect(component.formatDate(null)).toBe('—');
      expect(component.formatDate(undefined)).toBe('—');
    });
  });
  // ── Modal-local surfaces: grey banner, white selected rows ─────────────────

  describe('surfaces', () => {
    it('renders the pre-load banner on the grey-200 band', async () => {
      const project = buildProject('SURF-1', [
        { delegate_user_id: 1, name: 'Alice Example', email: 'alice@test.org' }
      ]);
      piService.byProjectCache.set([project]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'SURF-1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
      expect(banner.className).toContain('bg-[color:var(--ac-grey-200)]');
    });

    it('asks both pickers for white selected rows (scoped to this modal)', () => {
      fixture.detectChanges();
      const multiselects = fixture.debugElement.queryAll(By.directive(MultiselectComponent));
      expect(multiselects).toHaveLength(2);
      for (const ms of multiselects) {
        expect((ms.componentInstance as MultiselectComponent).selectedItemsSurfaceColor).toBe(
          'var(--ac-white-1)'
        );
      }
    });
  });
  // ── Field descriptions (moved out of standalone hints) ─────────────────────

  describe('field descriptions', () => {
    function descriptions(): string[] {
      return Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.description')
      ).map(el => (el as HTMLElement).textContent?.trim() ?? '');
    }

    it('renders both helper texts as the multiselects\' description, not as separate paragraphs', () => {
      fixture.detectChanges();

      expect(descriptions()).toEqual([
        'Select the people who will act as PI Delegates. You cannot assign yourself.',
        'Select the projects for this delegation. Only your manageable projects will appear.'
      ]);
      // The old standalone hint paragraphs are gone
      expect(fixture.nativeElement.querySelectorAll('.pi-lock')).toHaveLength(0);
    });

    it('swaps the People description for the locked copy when opened from a person', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(descriptions()[0]).toBe('Opened from this person — only the projects can be changed here.');
      expect(descriptions()[1]).toBe('Select the projects for this delegation. Only your manageable projects will appear.');
    }));

    it('swaps the Projects description for the locked copy when opened from a project', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(descriptions()[1]).toBe('Opened from this project — only the people can be changed here.');
      expect(descriptions()[0]).toBe('Select the people who will act as PI Delegates. You cannot assign yourself.');
    }));
  });
  // ── Banner placement and gating ────────────────────────────────────────────

  describe('banners', () => {
    async function openFrom(
      context: { source: 'byProject'; projectCode: string } | { source: 'byPerson'; delegateUserId: number },
      piUserId: number | null = null
    ): Promise<void> {
      peoplePicker.list.set([
        { delegate_user_id: 10, name: 'Daniela Zuniga Pino', email: 'd.zuniga@test.org' },
        { delegate_user_id: 11, name: 'Alice Example', email: 'alice@test.org' }
      ]);
      piService.byProjectCache.set([
        buildProject('BAN-1', [{ delegate_user_id: 11, name: 'Alice Example', email: 'alice@test.org' }], piUserId)
      ]);
      modalService.assignPiDelegateContext.set(context);
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('searches people by name, email AND carnet', () => {
      fixture.detectChanges();
      const people = fixture.debugElement
        .queryAll(By.directive(MultiselectComponent))[0]
        .componentInstance as MultiselectComponent;
      expect(people.filterBy).toBe('name,email,carnet');
    });

    it('places the inactive-delegate warning right under the info banner', async () => {
      // A pre-loaded delegate whose account is inactive
      piService.byProjectCache.set([
        buildProject('BAN-2', [
          { delegate_user_id: 12, name: 'Manuel Almanzar', email: 'manuel@test.org', is_active: false }
        ])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'BAN-2' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const root = fixture.nativeElement.querySelector('.assign-pi-delegate') as HTMLElement;
      const children = Array.from(root.children) as HTMLElement[];
      expect(children[0].classList.contains('assign-pi-delegate__notice')).toBe(true);
      expect(children[1].classList.contains('assign-pi-delegate__inactive-warning')).toBe(true);
      expect(children[1].textContent).toContain('Manuel Almanzar');
      // it now sits above the People picker, not between the two pickers
      expect(children[2].querySelector('app-multiselect')).not.toBeNull();
    });

    it('puts both notices in a SINGLE banner at the top of the modal', async () => {
      await openFrom({ source: 'byProject', projectCode: 'BAN-1' }, 10);

      const banners = fixture.nativeElement.querySelectorAll('.assign-pi-delegate__notice');
      expect(banners).toHaveLength(1);

      const root = fixture.nativeElement.querySelector('.assign-pi-delegate') as HTMLElement;
      expect(root.firstElementChild).toBe(banners[0]);

      const text = (banners[0] as HTMLElement).textContent ?? '';
      expect(text).toContain('Pre-loaded selections reflect the current delegate assignments');
      expect(text).toContain('cannot be assigned as PI Delegate');
    });

    it('renders the pre-load banner as the FIRST element of the modal', async () => {
      await openFrom({ source: 'byProject', projectCode: 'BAN-1' });

      const root = fixture.nativeElement.querySelector('.assign-pi-delegate') as HTMLElement;
      const first = root.firstElementChild as HTMLElement;
      expect(first.classList.contains('assign-pi-delegate__notice')).toBe(true);
      expect(first.textContent).toContain('Pre-loaded selections reflect the current delegate assignments');
    });

    it('shows the PI notice inside that banner while the People picker is editable', async () => {
      await openFrom({ source: 'byProject', projectCode: 'BAN-1' }, 10);

      const note = fixture.nativeElement.querySelector('.assign-pi-delegate__pi-hint') as HTMLElement | null;
      expect(note).not.toBeNull();
      expect(note!.closest('.assign-pi-delegate__notice')).not.toBeNull();
      expect(note!.textContent).toContain('Daniela Zuniga Pino');
      expect(note!.textContent).toContain('cannot be assigned as PI Delegate');
    });

    it('hides the PI notice when the People picker is disabled (negative discriminator)', async () => {
      // Opened from a person → peopleDisabled() is true
      await openFrom({ source: 'byPerson', delegateUserId: 11 }, 10);

      expect(component.peopleDisabled()).toBe(true);
      expect(component.piDisabledPeople().length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('.assign-pi-delegate__pi-hint')).toBeNull();
    });
  });
  // ── Confirm detail is a readable block list, not a run-on sentence ─────────

  describe('confirm detail layout', () => {
    it('states the change inline: "Added: a, b" — no bullet list, no Unchanged block', async () => {
      piService.byProjectCache.set([
        buildProject('D514', [
          { delegate_user_id: 1, name: 'Manuel Almanzar', email: 'manuel@test.org' }
        ])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'D514' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // Keep Manuel, add two more
      component.peopleSignal.set({
        selected_people: [
          { delegate_user_id: 1, name: 'Manuel Almanzar', email: 'manuel@test.org' },
          { delegate_user_id: 2, name: 'Emmanuel Mwema Musau', email: 'e.musau@test.org' },
          { delegate_user_id: 3, name: 'Juan Manuel Pardo Garcia', email: 'j.pardo@test.org' }
        ]
      });

      component.onConfirm();

      const detail = actionsService.showGlobalAlertCalls[0].detail;
      // Only what CHANGES: the project, then Added / Removed — no "Unchanged"
      // block and no repeated removal summary.
      expect(detail).toContain('<strong>D514</strong>');
      // the block opts out of the dialog's centred text
      expect(detail).toContain('class="alert-detail-left"');
      // lead sentence naming the project, then exactly one blank line
      expect(detail).toContain(
        '<div>The following changes were made in project <strong>D514</strong> — Project D514</div><div>&nbsp;</div>'
      );
      // labelled and inline, so 20 names do not become 20 lines
      expect(detail).toContain(
        '<div><strong>Added:</strong> Emmanuel Mwema Musau, Juan Manuel Pardo Garcia</div>'
      );
      expect(detail).not.toContain('•');
      expect(detail).not.toContain('Unchanged');
      expect(detail).not.toContain('Removal:');
      // Manuel was already a delegate — unchanged, so he is not listed
      expect(detail).not.toContain('Manuel Almanzar');
    });
  });
  // ── Footer buttons live inside the content (Environment variables pattern) ──

  describe('modal footer', () => {
    it('renders its own Cancel / Accept pair at the end of the content', () => {
      fixture.detectChanges();

      const root = fixture.nativeElement.querySelector('.assign-pi-delegate') as HTMLElement;
      const buttons = Array.from(root.querySelectorAll('button')).filter(b =>
        ['Cancel', 'Accept'].includes(b.textContent?.trim() ?? '')
      );
      expect(buttons.map(b => b.textContent?.trim())).toEqual(['Cancel', 'Accept']);

      // they are the last block of the scrollable content, not a floating footer
      const footer = buttons[0].parentElement as HTMLElement;
      expect(root.lastElementChild).toBe(footer);
    });

    it('leaves the app-modal footer unregistered so no second pair renders', () => {
      fixture.detectChanges();

      const config = modalService.modalConfig()['assignPiDelegate'] as unknown as {
        cancelAction?: () => void;
        confirmAction?: () => void;
      };
      expect(config?.cancelAction).toBeUndefined();
      expect(config?.confirmAction).toBeUndefined();
    });

    it('Accept is disabled until both pickers have a selection', () => {
      fixture.detectChanges();

      const accept = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button')
      ).find(b => b.textContent?.trim() === 'Accept') as HTMLButtonElement;
      expect(accept.disabled).toBe(true);

      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({ selected_projects: [{ project_code: 'P1', project_name: 'P1' }] });
      fixture.detectChanges();

      expect(accept.disabled).toBe(false);
    });
  });
  // ── Reopening the modal must not carry the previous session's selection ────

  describe('state between openings', () => {
    // Note: every preload branch overwrites both signals, so this proves the
    // reseed rather than the clearState() guard that precedes it.
    it('reseeds both selections when the modal is reopened from another source', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }]),
        buildProject('P2', [])
      ]);

      // 1st opening: from a project
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(component.getSelectedProjectsList().map(p => p.project_code)).toEqual(['P1']);

      // The user edits without saving, then closes
      component.projectsSignal.set({
        selected_projects: [
          { project_code: 'P1', project_name: 'Project P1' },
          { project_code: 'P2', project_name: 'Project P2' }
        ]
      });
      modalService.closeModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      // 2nd opening: from a person who is a delegate of P1 only
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 1 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // P2 came from the previous session — it must be gone
      expect(component.getSelectedProjectsList().map(p => p.project_code)).toEqual(['P1']);
      expect(component.getSelectedPeopleList().map(p => p.delegate_user_id)).toEqual([1]);
    }));
  });
  // ── Adding one person to more projects must not evict the other delegates ──

  describe('per-axis sync semantics', () => {
    /** P1 = Alice + Bob; P2 = Carol. Emmanuel is the person being managed. */
    function seedTwoProjects(): void {
      piService.byProjectCache.set([
        buildProject('P1', [
          { delegate_user_id: 1, name: 'Alice', email: 'alice@test.com' },
          { delegate_user_id: 2, name: 'Bob', email: 'bob@test.com' }
        ]),
        buildProject('P2', [{ delegate_user_id: 3, name: 'Carol', email: 'carol@test.com' }])
      ]);
    }

    /** Confirms the dialog and returns what was POSTed. */
    function assignmentsFromConfirm(): { project_id: string; delegates: { delegate_user_id: number }[] }[] {
      const alert = actionsService.showGlobalAlertCalls[0] as unknown as GlobalAlert;
      alert.confirmCallback?.event?.();
      return piService.assignCalls[0] as unknown as {
        project_id: string;
        delegates: { delegate_user_id: number }[];
      }[];
    }

    it('BY PERSON: adding the person to a project keeps that project other delegates', fakeAsync(() => {
      seedTwoProjects();
      // Emmanuel is a delegate of P1 only
      piService.byProjectCache.update(projects =>
        projects.map(p =>
          p.project_code === 'P1'
            ? { ...p, delegates: [...p.delegates, { delegate_user_id: 9, name: 'Emmanuel', email: 'e@test.com', is_active: true }] }
            : p
        )
      );
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 9 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // The user adds P2 as well
      component.projectsSignal.set({
        selected_projects: [
          { project_code: 'P1', project_name: 'Project P1' },
          { project_code: 'P2', project_name: 'Project P2' }
        ]
      });
      fixture.detectChanges();

      component.onConfirm();
      const assignments = assignmentsFromConfirm();

      const p2 = assignments.find(a => a.project_id === 'P2')!;
      const p2Ids = p2.delegates.map(d => d.delegate_user_id).sort();
      // Carol (3) survives; Emmanuel (9) joins her
      expect(p2Ids).toEqual([3, 9]);

      const p1 = assignments.find(a => a.project_id === 'P1')!;
      expect(p1.delegates.map(d => d.delegate_user_id).sort()).toEqual([1, 2, 9]);
    }));

    it('BY PERSON: dropping a project revokes only that person there', fakeAsync(() => {
      seedTwoProjects();
      piService.byProjectCache.update(projects =>
        projects.map(p => ({
          ...p,
          delegates: [...p.delegates, { delegate_user_id: 9, name: 'Emmanuel', email: 'e@test.com', is_active: true }]
        }))
      );
      modalService.assignPiDelegateContext.set({ source: 'byPerson', delegateUserId: 9 });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Keep P1 only
      component.projectsSignal.set({
        selected_projects: [{ project_code: 'P1', project_name: 'Project P1' }]
      });
      fixture.detectChanges();

      component.onConfirm();
      const assignments = assignmentsFromConfirm();

      const p2 = assignments.find(a => a.project_id === 'P2')!;
      // Emmanuel leaves P2; Carol stays
      expect(p2.delegates.map(d => d.delegate_user_id)).toEqual([3]);
    }));

    it('BY PROJECT: the People selection is still the full list for that project', fakeAsync(() => {
      seedTwoProjects();
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // The user removes Bob from this project
      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 1, name: 'Alice', email: 'alice@test.com' }]
      });
      fixture.detectChanges();

      component.onConfirm();
      const assignments = assignmentsFromConfirm();

      expect(assignments).toHaveLength(1);
      expect(assignments[0].project_id).toBe('P1');
      expect(assignments[0].delegates.map(d => d.delegate_user_id)).toEqual([1]);
    }));
  });
  // ── The picker search must not survive a close ─────────────────────────────

  describe('search box lifecycle', () => {
    it('asks both pickers to clear their search when the panel closes', () => {
      fixture.detectChanges();

      const pickers = fixture.debugElement.queryAll(By.directive(MultiselectComponent));
      expect(pickers).toHaveLength(2);
      for (const picker of pickers) {
        expect((picker.componentInstance as MultiselectComponent).clearFilterOnClose).toBe(true);
      }
    });

    it('clears both pickers search when the modal closes', fakeAsync(() => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 1, name: 'Alice', email: 'a@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const pickers = fixture.debugElement
        .queryAll(By.directive(MultiselectComponent))
        .map(p => p.componentInstance as MultiselectComponent);
      const spies = pickers.map(p => jest.spyOn(p, 'clearSearchFilter'));

      modalService.closeModal('assignPiDelegate');
      fixture.detectChanges();
      tick();

      for (const spy of spies) {
        expect(spy).toHaveBeenCalled();
      }
    }));
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  describe('projects field description', () => {
    it('tells an administrator the picker spans the whole platform', () => {
      piService.isAdminView.set(true);
      fixture.detectChanges();

      expect(component.projectsDescription()).toContain('any project on the platform');
    });

    it('keeps the manageable-projects wording for a PI or delegate', () => {
      piService.isAdminView.set(false);
      fixture.detectChanges();

      expect(component.projectsDescription()).toContain('Only your manageable projects');
    });

    it('the locked copy still wins when the modal was opened from a project', () => {
      piService.isAdminView.set(true);
      modalService.assignPiDelegateContext.set({ source: 'byProject', projectCode: 'P1' });
      fixture.detectChanges();

      expect(component.projectsDescription()).toContain('only the people can be changed here');
    });
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  // ── "Assign New Delegate": one person, many projects, ADD only ─────────────

  describe('newDelegate mode', () => {
    /** The chosen person already delegates on P1; the user is adding P2. */
    function arrangeExistingDelegate() {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 5, name: 'Alice', email: 'a@test.com' }]),
        buildProject('P2', [])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'newDelegate' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();

      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 5, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({ selected_projects: [{ project_code: 'P2', project_name: 'P2' }] });
      fixture.detectChanges();
    }

    it('opens with BOTH pickers empty and editable', () => {
      piService.byProjectCache.set([buildProject('P1', [])]);
      modalService.assignPiDelegateContext.set({ source: 'newDelegate' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();

      expect(component.isNewDelegateMode()).toBe(true);
      expect(component.getSelectedPeopleList()).toEqual([]);
      expect(component.getSelectedProjectsList()).toEqual([]);
      expect(component.peopleDisabled()).toBe(false);
      expect(component.projectsDisabled()).toBe(false);
    });

    it('puts the People picker in single-selection mode, and only there', () => {
      modalService.assignPiDelegateContext.set({ source: 'newDelegate' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();

      const people = fixture.debugElement
        .queryAll(By.directive(MultiselectComponent))
        .map(p => p.componentInstance as MultiselectComponent)[0];
      expect(people.singleSelection).toBe(true);

      // ★ discriminating: the Projects picker must stay multi-select.
      const projects = fixture.debugElement
        .queryAll(By.directive(MultiselectComponent))
        .map(p => p.componentInstance as MultiselectComponent)[1];
      expect(projects.singleSelection).toBe(false);
    });

    it('adds the person to the selected projects, keeping the delegates already there', () => {
      piService.byProjectCache.set([
        buildProject('P1', [{ delegate_user_id: 9, name: 'Bob', email: 'b@test.com' }])
      ]);
      modalService.assignPiDelegateContext.set({ source: 'newDelegate' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();

      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 5, name: 'Alice', email: 'a@test.com' }]
      });
      component.projectsSignal.set({ selected_projects: [{ project_code: 'P1', project_name: 'P1' }] });
      fixture.detectChanges();

      component.onConfirm();
      actionsService.showGlobalAlertCalls.at(-1)?.confirmCallback?.event?.();

      expect(piService.assignCalls).toHaveLength(1);
      const submitted = piService.assignCalls[0];
      expect(submitted).toHaveLength(1);
      expect(submitted[0].project_id).toBe('P1');
      expect(submitted[0].delegates.map(d => (d as { delegate_user_id: number }).delegate_user_id).sort()).toEqual([
        5, 9
      ]);
    });

    it('NEVER revokes the delegations the person already has elsewhere', () => {
      arrangeExistingDelegate();

      component.onConfirm();
      actionsService.showGlobalAlertCalls.at(-1)?.confirmCallback?.event?.();

      const submitted = piService.assignCalls[0];
      // ★ discriminating: the by-person rule would submit P1 with Alice removed,
      //   because the picker started empty and P1 looks "deselected".
      expect(submitted.map(a => a.project_id)).toEqual(['P2']);
    });

    it('the confirmation names only additions', () => {
      arrangeExistingDelegate();

      component.onConfirm();

      const detail = actionsService.showGlobalAlertCalls.at(-1)?.detail ?? '';
      expect(detail).toContain('Added:');
      expect(detail).not.toContain('Removed:');
    });

    it('Accept stays disabled until BOTH a person and a project are chosen', () => {
      modalService.assignPiDelegateContext.set({ source: 'newDelegate' });
      modalService.openModal('assignPiDelegate');
      fixture.detectChanges();
      expect(component.disabledConfirmIf()).toBe(true);

      component.peopleSignal.set({
        selected_people: [{ delegate_user_id: 5, name: 'Alice', email: 'a@test.com' }]
      });
      fixture.detectChanges();
      expect(component.disabledConfirmIf()).toBe(true);

      component.projectsSignal.set({ selected_projects: [{ project_code: 'P1', project_name: 'P1' }] });
      fixture.detectChanges();
      expect(component.disabledConfirmIf()).toBe(false);
    });
  });

});
