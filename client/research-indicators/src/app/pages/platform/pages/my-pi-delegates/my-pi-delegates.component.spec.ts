// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-04)
//
// Test suite for the My PI Delegates page shell.
//
// Proofs required:
//   1. R-UI-002 AC.1  — opens with By-project tab active by DEFAULT.
//   2. R-UI-004       — counters render the service's computed values AND update
//                       reactively after the cache is mutated (K-015: arrange the
//                       TRANSITION, not the end state).
//   3. NFR-UI-003     — loading / error / empty states render + hide correctly;
//                       K-015 transitions are arranged for each.
//   4. Tab signal     — activeTabIndex changes on tab switch.
//   5. Stub quality   — the PiDelegatesClientService stub evaluates real signal
//                       logic so wrong wiring (e.g. reading a stale copy) FAILS.
//
// KZ-001 compliance: the mock service exposes computed() signals that mirror the
// real service so a wrong read path (e.g. a second divergent copy) produces wrong
// values and causes test failure.
// KZ-015 compliance: every state is arranged from the default (neutral) state and
// the component is rendered BEFORE the change — asserting "not-yet" then "now".

import { signal, computed } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TabViewModule } from 'primeng/tabview';
import MyPiDelegatesComponent from './my-pi-delegates.component';
import { PiDelegatesClientService } from './services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '@services/cache/cache.service';
import type { ProjectDelegates } from '@interfaces/pi-delegates.interface';

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<ProjectDelegates> = {}): ProjectDelegates {
  return {
    project_code: 'P001',
    project_name: 'Alpha Project',
    is_pool_funding_contributor: false,
    status: 'Active',
    start_date: null,
    end_date: null,
    delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'alice@example.com' }],
    ...overrides
  };
}

// ─── Mock service (KZ-001: real computed signals, not static stubs) ───────────
//
// The mock uses the same signal/computed derivation as the REAL service so that
// wrong wiring in the component (e.g. reading a second copy or a different signal)
// will produce incorrect counter values and fail the assertion.
// We expose byProjectCache as a WritableSignal so tests can mutate it to arrange
// the reactivity proof (R-UI-004 / K-015).

function createMockService() {
  const byProjectCache = signal<ProjectDelegates[]>([]);
  const loading = signal<boolean>(false);
  const error = signal<string | null>(null);

  // Mirror the real service computed logic exactly (KZ-001).
  const totalProjects = computed(() => byProjectCache().length);
  const totalDistinctDelegates = computed(() => {
    const ids = new Set<number>();
    for (const project of byProjectCache()) {
      for (const delegate of project.delegates) {
        ids.add(delegate.delegate_user_id);
      }
    }
    return ids.size;
  });
  const projectsWithoutDelegate = computed(() => byProjectCache().filter(p => p.delegates.length === 0));

  const loadByProject = jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined);
  const loadByUser = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined);

  return {
    byProjectCache,
    byPersonCache: signal([]),
    loading,
    error,
    totalProjects,
    totalDistinctDelegates,
    projectsWithoutDelegate,
    loadByProject,
    loadByUser
  };
}

// ─── CacheService stub factory ────────────────────────────────────────────────

function createMockCacheService(secUserId: number | null = 99) {
  return {
    dataCache: signal({
      user: secUserId != null ? { sec_user_id: secUserId } : undefined
    })
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('MyPiDelegatesComponent', () => {
  let fixture: ComponentFixture<MyPiDelegatesComponent>;
  let component: MyPiDelegatesComponent;
  let mockService: ReturnType<typeof createMockService>;
  let mockCacheService: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    mockService = createMockService();
    mockCacheService = createMockCacheService(99);

    await TestBed.configureTestingModule({
      imports: [MyPiDelegatesComponent, TabViewModule, NoopAnimationsModule],
      providers: [
        { provide: PiDelegatesClientService, useValue: mockService },
        { provide: ActionsService, useValue: { showGlobalAlert: jest.fn() } },
        { provide: CacheService, useValue: mockCacheService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyPiDelegatesComponent);
    component = fixture.componentInstance;
    // NOTE: do NOT call detectChanges() here (KZ-015).
    // Each test arranges its state, then calls detectChanges() to trigger OnInit.
  });

  // ── 1. R-UI-002 AC.1 — By-project default ──────────────────────────────────

  it('renders with By-project as the active tab by default (R-UI-002 AC.1)', () => {
    // Arrange: service is idle; no state yet
    // Act: first render (OnInit runs)
    fixture.detectChanges();

    // Assert: activeTabIndex signal starts at 0 (By-project)
    expect(component.activeTabIndex()).toBe(0);

    // PrimeNG v19 renders its host as a custom element (p-tabview) with data-pc-name="tabview"
    // and class p-tabs on the host element.
    const tabViewEl =
      fixture.nativeElement.querySelector('[data-pc-name="tabview"]') ||
      fixture.nativeElement.querySelector('p-tabview') ||
      fixture.nativeElement.querySelector('.p-tabs');
    expect(tabViewEl).not.toBeNull();

    // The p-tabPanel elements must declare headers "By project" and "By person"
    const tabPanels = fixture.debugElement.queryAll(By.css('p-tabPanel, p-tabpanel'));
    expect(tabPanels.length).toBeGreaterThanOrEqual(2);
    // Attributes on the Angular element (not the host DOM node)
    const firstHeader = (tabPanels[0].attributes as Record<string, string>)['header'];
    const secondHeader = (tabPanels[1].attributes as Record<string, string>)['header'];
    expect(firstHeader).toBe('By project');
    expect(secondHeader).toBe('By person');
  });

  it('calls loadByUser with the current user id on init', () => {
    fixture.detectChanges();
    // CacheService stub returns sec_user_id = 99; the component must pass it as Number(99).
    expect(mockService.loadByUser).toHaveBeenCalledTimes(1);
    expect(mockService.loadByUser).toHaveBeenCalledWith(99);
  });

  // ── 2. R-UI-004 — Summary counters (reactivity, K-015 transition) ──────────

  it('renders 0 for all counters when the cache is empty', () => {
    // Arrange: empty cache (default)
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    // Should be 3 counter cards
    expect(counterValues.length).toBe(3);
    // All show 0 (counter derives from computed signal, cache is empty)
    expect(counterValues[0].textContent?.trim()).toBe('0');
    expect(counterValues[1].textContent?.trim()).toBe('0');
    expect(counterValues[2].textContent?.trim()).toBe('0');
  });

  it('counters reflect service signals after cache is populated (R-UI-004)', () => {
    // Arrange: start with empty cache; render first
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    let counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    // Pre-condition: all zeros (the "before" of the transition)
    expect(counterValues[0].textContent?.trim()).toBe('0');
    expect(counterValues[1].textContent?.trim()).toBe('0');
    expect(counterValues[2].textContent?.trim()).toBe('0');

    // Act: mutate the shared cache (K-015 — arrange the transition)
    mockService.byProjectCache.set([
      makeProject({ project_code: 'P001', delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'alice@c.com' }] }),
      makeProject({ project_code: 'P002', delegates: [] }) // no delegate → counted in projectsWithoutDelegate
    ]);
    fixture.detectChanges();

    // Assert AFTER transition:
    counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    // totalProjects: 2 projects in cache
    expect(counterValues[0].textContent?.trim()).toBe('2');
    // totalDistinctDelegates: 1 unique person across all projects
    expect(counterValues[1].textContent?.trim()).toBe('1');
    // projectsWithoutDelegateCount: 1 project has empty delegates
    expect(counterValues[2].textContent?.trim()).toBe('1');
  });

  it('counters update again when cache is mutated a second time (reactive — R-UI-004)', () => {
    // Arrange: start populated
    mockService.byProjectCache.set([
      makeProject({ project_code: 'P001', delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'a@a.com' }] })
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    let counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    // Pre-condition (first state)
    expect(counterValues[0].textContent?.trim()).toBe('1');
    expect(counterValues[1].textContent?.trim()).toBe('1');
    expect(counterValues[2].textContent?.trim()).toBe('0');

    // Act: add a second project with a NEW distinct person and NO delegates (K-015 transition)
    mockService.byProjectCache.set([
      makeProject({ project_code: 'P001', delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'a@a.com' }] }),
      makeProject({ project_code: 'P002', delegates: [{ delegate_user_id: 2, name: 'Bob', email: 'b@b.com' }] }),
      makeProject({ project_code: 'P003', delegates: [] })
    ]);
    fixture.detectChanges();

    // Assert AFTER second transition:
    counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    expect(counterValues[0].textContent?.trim()).toBe('3'); // 3 projects
    expect(counterValues[1].textContent?.trim()).toBe('2'); // 2 distinct people
    expect(counterValues[2].textContent?.trim()).toBe('1'); // 1 without a delegate
  });

  // ── 3. NFR-UI-003 — Loading state (K-015 transition) ───────────────────────

  it('shows loading indicator while service.loading() is true (NFR-UI-003)', () => {
    // Pre-condition: loading = false (default), ensure no loading state initially
    fixture.detectChanges();
    let el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.pi-delegates-state--loading')).toBeNull();

    // Act: set loading to true (K-015 — arrange the transition)
    mockService.loading.set(true);
    fixture.detectChanges();

    // Assert: loading state block rendered
    el = fixture.nativeElement;
    const loadingEl = el.querySelector('.pi-delegates-state--loading');
    expect(loadingEl).not.toBeNull();
    expect(loadingEl?.textContent).toMatch(/Loading/i);

    // Counters show '—' while loading
    const counterValues = el.querySelectorAll('.pi-delegates-summary__value');
    for (const cv of Array.from(counterValues)) {
      expect(cv.textContent?.trim()).toBe('—');
    }
  });

  it('hides loading indicator when service.loading() becomes false (NFR-UI-003)', () => {
    // Arrange: start loading
    mockService.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--loading')).not.toBeNull();

    // Act: loading completes
    mockService.loading.set(false);
    fixture.detectChanges();

    // Assert: loading gone
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--loading')).toBeNull();
  });

  // ── 4. NFR-UI-003 — Error state (K-015 transition) ─────────────────────────

  it('shows error block when service.error() is non-null (NFR-UI-003)', () => {
    // Pre-condition: no error
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).toBeNull();

    // Act: service signals an error (K-015 transition)
    mockService.error.set('Failed to load by-project data');
    fixture.detectChanges();

    // Assert: error state block rendered
    const errorEl = fixture.nativeElement.querySelector('.pi-delegates-state--error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toMatch(/Could not load/i);
  });

  it('hides error block when error() clears (NFR-UI-003)', () => {
    // Arrange: start with error
    mockService.error.set('some error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).not.toBeNull();

    // Act: error clears
    mockService.error.set(null);
    fixture.detectChanges();

    // Assert: gone
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).toBeNull();
  });

  // ── 5. NFR-UI-003 — By-project tab content (T-UI-05 owns empty state) ─────────
  //
  // The shell no longer owns the empty state inside the By-project tab — that was
  // transferred to <app-by-project> (T-UI-05). The shell's responsibility is to
  // render <app-by-project> in the tab panel when loading=false and error=null.

  it('renders app-by-project in the By-project tab panel when not loading and no error (NFR-UI-003)', () => {
    // Default state: loading=false, error=null → tabs are shown → app-by-project rendered
    fixture.detectChanges();

    // The shell includes ByProjectComponent which renders as app-by-project
    const byProjectEl = fixture.nativeElement.querySelector('app-by-project');
    expect(byProjectEl).not.toBeNull();
  });

  it('does not render the tab content when loading=true (NFR-UI-003, K-015 transition)', () => {
    // Pre-condition: not loading → app-by-project present
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-by-project')).not.toBeNull();

    // Act: set loading to true
    mockService.loading.set(true);
    fixture.detectChanges();

    // Assert: tabs block hidden (loading state renders instead)
    expect(fixture.nativeElement.querySelector('app-by-project')).toBeNull();
  });

  // ── 6. Tab index signal ──────────────────────────────────────────────────────

  it('updates activeTabIndex signal when onTabChange is called', () => {
    fixture.detectChanges();
    expect(component.activeTabIndex()).toBe(0);

    component.onTabChange({ index: 1 });
    expect(component.activeTabIndex()).toBe(1);

    component.onTabChange({ index: 0 });
    expect(component.activeTabIndex()).toBe(0);
  });

  // ── 7. Summary area: aria-live regions are present ──────────────────────────

  it('renders summary section with aria-label and aria-live on each card (a11y)', () => {
    fixture.detectChanges();

    const summary = fixture.nativeElement.querySelector('[aria-label="PI Delegates summary"]');
    expect(summary).not.toBeNull();

    const cards = fixture.nativeElement.querySelectorAll('[aria-live="polite"]');
    // 3 counter cards + possible others; at minimum 3
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  // ── 8. Counters derive from ONE cache (no divergent copy — R-UI-010 / KZ-002) ─

  it('counter totalDistinctDelegates de-duplicates across projects (single-cache derivation)', () => {
    // Same delegate_user_id in two projects → should count as 1 distinct person
    mockService.byProjectCache.set([
      makeProject({ project_code: 'PA', delegates: [{ delegate_user_id: 99, name: 'X', email: 'x@x.com' }] }),
      makeProject({ project_code: 'PB', delegates: [{ delegate_user_id: 99, name: 'X', email: 'x@x.com' }] })
    ]);
    fixture.detectChanges();

    const counterValues = fixture.nativeElement.querySelectorAll('.pi-delegates-summary__value');
    expect(counterValues[0].textContent?.trim()).toBe('2'); // 2 projects
    expect(counterValues[1].textContent?.trim()).toBe('1'); // only 1 DISTINCT person
    expect(counterValues[2].textContent?.trim()).toBe('0'); // both have delegates
  });
});

// ─── Null-user edge case — separate TestBed so overrideProvider works ─────────

describe('MyPiDelegatesComponent — unauthenticated edge', () => {
  it('does NOT call loadByUser when sec_user_id is null', async () => {
    const byProjectCache = signal<ProjectDelegates[]>([]);
    const mockSvc = {
      byProjectCache,
      byPersonCache: signal<ProjectDelegates[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      totalProjects: computed(() => byProjectCache().length),
      totalDistinctDelegates: computed(() => 0),
      projectsWithoutDelegate: computed(() => byProjectCache().filter(p => p.delegates.length === 0)),
      loadByProject: jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined),
      loadByUser: jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined)
    };
    // CacheService with no user (sec_user_id absent)
    const noUserCache = { dataCache: signal({ user: undefined }) };

    await TestBed.configureTestingModule({
      imports: [MyPiDelegatesComponent, TabViewModule, NoopAnimationsModule],
      providers: [
        { provide: PiDelegatesClientService, useValue: mockSvc },
        { provide: ActionsService, useValue: { showGlobalAlert: jest.fn() } },
        { provide: CacheService, useValue: noUserCache }
      ]
    }).compileComponents();

    const f = TestBed.createComponent(MyPiDelegatesComponent);
    f.detectChanges();

    expect(mockSvc.loadByUser).not.toHaveBeenCalled();
  });
});
