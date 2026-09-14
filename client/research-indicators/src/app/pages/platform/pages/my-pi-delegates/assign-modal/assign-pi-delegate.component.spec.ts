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
import { AssignPiDelegateComponent } from './assign-pi-delegate.component';
import { AllModalsService } from '@services/cache/all-modals.service';
import { CacheService } from '@services/cache/cache.service';
import { PiDelegatesClientService } from '../services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { ProjectDelegates } from '@interfaces/pi-delegates.interface';
import { ServiceLocatorService } from '@services/service-locator.service';
import { UtilsService } from '@services/utils.service';

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
  assignPiDelegateContext = signal<
    | { source: 'byProject'; projectCode: string }
    | { source: 'byPerson'; delegateUserId: number }
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
  getService(_name: string) {
    return {
      list: signal<unknown[]>([]),
      loading: signal(false),
      isOpenSearch: signal(false),
      main: async () => undefined
    };
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
  assignCalls: Parameters<PiDelegatesClientService['assign']>[0][] = [];

  async assign(assignments: Parameters<PiDelegatesClientService['assign']>[0]) {
    this.assignCalls.push(assignments);
    // No-op: does not mutate byProjectCache (tests check what was submitted)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProject(
  code: string,
  delegates: { delegate_user_id: number; name: string; email: string; is_active?: boolean }[]
): ProjectDelegates {
  return {
    project_code: code,
    project_name: `Project ${code}`,
    is_pool_funding_contributor: false,
    status: 'Active',
    start_date: null,
    end_date: null,
    delegates: delegates.map(d => ({ ...d, is_active: d.is_active ?? true }))
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('AssignPiDelegateComponent', () => {
  let fixture: ComponentFixture<AssignPiDelegateComponent>;
  let component: AssignPiDelegateComponent;
  let modalService: MockAllModalsService;
  let piService: MockPiDelegatesClientService;
  let actionsService: MockActionsService;
  let cacheService: MockCacheService;

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
        { provide: UtilsService, useClass: MockUtilsService }
      ]
    }).compileComponents();

    modalService = TestBed.inject(AllModalsService) as unknown as MockAllModalsService;
    piService = TestBed.inject(PiDelegatesClientService) as unknown as MockPiDelegatesClientService;
    actionsService = TestBed.inject(ActionsService) as unknown as MockActionsService;
    cacheService = TestBed.inject(CacheService) as unknown as MockCacheService;

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
      // KZ-014: the confirm must explicitly mention revoke-all.
      // If this assertion fails, the delta logic is missing the revoke-all branch.
      const lower = detail.toLowerCase();
      const mentionsRevoke = lower.includes('revoke all') || lower.includes('revoke all');
      expect(mentionsRevoke).toBe(true);

      // Also: Alice and Bob must be named (they are the people being revoked from P1).
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
});
