// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-04)
//
// Test suite for the My PI Delegates page shell (re-skin).
//
// Proofs required:
//   1. R-UI-002 AC.1  — opens with By-project tab active by DEFAULT.
//   2. Title "My PI Delegates" + description text renders; info banner is ABSENT.
//   3. 3 stat counters render service values (wrong wiring → wrong value → test fails).
//   4. The shell owns NO search box, status dropdown or summary line — those
//      live inside each tab's table card (asserted as absent here).
//   7. NFR-UI-003     — loading / error states (K-015 transitions).
//   8. Tab signal     — activeTabIndex changes on tab switch.
//
// KZ-015: every state transition arranged from the initial state.

import { signal, computed } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import MyPiDelegatesComponent from './my-pi-delegates.component';
import { PiDelegatesClientService } from './services/pi-delegates.client.service';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '@services/cache/cache.service';
import { AllModalsService } from '@services/cache/all-modals.service';
import type { ProjectDelegates } from '@interfaces/pi-delegates.interface';

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<ProjectDelegates> = {}): ProjectDelegates {
  return {
    project_code: 'P001',
    project_name: 'Alpha Project',
    is_pool_funding_contributor: false,
    pi_user_id: null,
    pi_name: null,
    status: 'Active',
    start_date: null,
    end_date: null,
    delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'alice@example.com', is_active: true }],
    ...overrides
  };
}

// ─── Mock service ─────────────────────────────────────────────────────────────

function createMockService() {
  const byProjectCache = signal<ProjectDelegates[]>([]);
  const loading = signal<boolean>(false);
  const error = signal<string | null>(null);

  const loadByProject = jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined);
  const loadByUser = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined);

  const totalProjects = computed(() => byProjectCache().length);
  const totalDistinctDelegates = computed(() => {
    const ids = new Set<number>();
    for (const p of byProjectCache()) {
      for (const d of p.delegates) ids.add(d.delegate_user_id);
    }
    return ids.size;
  });
  const projectsWithoutDelegate = computed(() => byProjectCache().filter(p => p.delegates.length === 0));
  // Role split: the list mixes projects the user is PI of with ones they only delegate on.
  const currentUserId = signal<number | null>(99);
  const isPiOf = (project: ProjectDelegates) =>
    currentUserId() != null && project.pi_user_id === currentUserId();
  const projectsAsPi = computed(() => byProjectCache().filter(isPiOf));
  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope — writable so a
  // test can flip the page into the administrator view.
  const isAdminView = signal(false);
  // Mirrors the real service: in the managed view every listed project the caller
  // is not the PI of is one they delegate on; in the admin view only membership
  // of the delegate list counts.
  const isDelegateOf = (project: ProjectDelegates) => {
    if (isPiOf(project)) return false;
    if (!isAdminView()) return true;
    return project.delegates.some(d => d.delegate_user_id === currentUserId());
  };
  const projectsAsDelegate = computed(() => byProjectCache().filter(isDelegateOf));

  return {
    byProjectCache,
    byPersonCache: signal([]),
    loading,
    error,
    loadByProject,
    loadByUser,
    totalProjects,
    totalDistinctDelegates,
    projectsWithoutDelegate,
    currentUserId,
    isPiOf,
    projectsAsPi,
    projectsAsDelegate,
    isDelegateOf,
    isAdminView
  };
}

// ─── CacheService stub ────────────────────────────────────────────────────────

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
      imports: [MyPiDelegatesComponent, NoopAnimationsModule],
      providers: [
        // the By project cell links to /project-detail
        provideRouter([]),
        { provide: PiDelegatesClientService, useValue: mockService },
        { provide: ActionsService, useValue: { showGlobalAlert: jest.fn() } },
        { provide: CacheService, useValue: mockCacheService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyPiDelegatesComponent);
    component = fixture.componentInstance;
    // NOTE: do NOT call detectChanges() here (KZ-015).
  });

  // ── 1. R-UI-002 AC.1 — By-project default ──────────────────────────────────

  it('renders with By-project as the active tab by default (R-UI-002 AC.1)', () => {
    fixture.detectChanges();
    expect(component.activeTabIndex()).toBe(0);

    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(tabs.length).toBe(2);
    expect((tabs[0].nativeElement as HTMLElement).textContent?.trim()).toBe('By project');
    expect((tabs[1].nativeElement as HTMLElement).textContent?.trim()).toBe('By person');
    expect((tabs[0].nativeElement as HTMLElement).getAttribute('aria-selected')).toBe('true');
    expect((tabs[1].nativeElement as HTMLElement).getAttribute('aria-selected')).toBe('false');

    // By-project panel is the visible one; By-person stays mounted but hidden
    const panels = fixture.debugElement.queryAll(By.css('[role="tabpanel"]'));
    expect((panels[0].nativeElement as HTMLElement).hidden).toBe(false);
    expect((panels[1].nativeElement as HTMLElement).hidden).toBe(true);
  });

  it('clicking the By person tab switches the visible panel', () => {
    fixture.detectChanges();

    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    (tabs[1].nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.activeTabIndex()).toBe(1);
    const panels = fixture.debugElement.queryAll(By.css('[role="tabpanel"]'));
    expect((panels[0].nativeElement as HTMLElement).hidden).toBe(true);
    expect((panels[1].nativeElement as HTMLElement).hidden).toBe(false);
  });

  it('calls loadByUser with the current user id on init', () => {
    fixture.detectChanges();
    expect(mockService.loadByUser).toHaveBeenCalledTimes(1);
    expect(mockService.loadByUser).toHaveBeenCalledWith(99);
  });

  // ── 2. Title + description + stats counters; info banner ABSENT ────────────

  it('renders the page title "My PI Delegates"', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.pi-delegates-title');
    expect(title).not.toBeNull();
    expect((title as HTMLElement).textContent?.trim()).toBe('My PI Delegates');
  });

  it('describes what the PI Delegate role does, in the page description', () => {
    fixture.detectChanges();
    const desc = fixture.nativeElement.querySelector('.pi-delegates-description') as HTMLElement;
    expect(desc).not.toBeNull();
    const text = desc.textContent ?? '';
    expect(text).toContain('approve, reject or request changes');
    expect(text).toContain('revoke it at any time');
    expect(text).toContain('Agresso');
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  describe('administrator view', () => {
    it('says the list spans the whole platform, and adds the ALL PROJECTS counter', () => {
      mockService.byProjectCache.set([
        makeProject({ project_code: 'P001', pi_user_id: 7 }),
        makeProject({ project_code: 'P002', pi_user_id: 8 })
      ]);
      mockService.isAdminView.set(true);
      fixture.detectChanges();

      const notice = fixture.nativeElement.querySelector('.pi-delegates-admin-notice');
      expect(notice).not.toBeNull();
      expect((notice as HTMLElement).textContent).toContain('Administrator view');

      const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
      expect(counters.length).toBe(5);
      const first = counters[0] as HTMLElement;
      expect(first.querySelector('.pi-delegates-stats__counter-label')?.textContent).toContain('ALL PROJECTS');
      expect(first.querySelector('.pi-delegates-stats__counter-value')?.textContent?.trim()).toBe('2');
    });

    it('wears the amber warning treatment, the same one the Assign modal uses', () => {
      mockService.isAdminView.set(true);
      fixture.detectChanges();

      const notice = fixture.nativeElement.querySelector('.pi-delegates-admin-notice') as HTMLElement;
      expect(notice.className).toContain('border-l-[color:var(--ac-warning-1)]');
      expect(notice.className).toContain('bg-[color:var(--ac-warning-surface)]');
      // ★ discriminating: it used to be the neutral grey card.
      expect(notice.className).not.toContain('bg-[color:var(--ac-grey-100)]');

      // The sentence wraps at narrow widths; items-center keeps the icon on the
      // block's mid-line either way, which items-start does not.
      expect(notice.className).toContain('items-center');
      expect(notice.className).not.toContain('items-start');

      const icon = notice.querySelector('.pi-shield') as HTMLElement;
      expect(icon.className).toContain('var(--ac-warning-fg)');
      // ★ discriminating: `atc-warning-1` LOOKS like a token utility but none is
      //   generated — warning-1 is absent from the $colors map — so that class
      //   would leave the icon uncoloured.
      expect(icon.className).not.toContain('atc-warning-1');
    });

    it('keeps the numbers on one baseline without reserving an empty label line', () => {
      mockService.byProjectCache.set([makeProject({ project_code: 'P001', pi_user_id: 7 })]);
      mockService.isAdminView.set(true);
      fixture.detectChanges();

      const cards = Array.from(
        fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter')
      ) as HTMLElement[];
      expect(cards.length).toBe(5);

      for (const card of cards) {
        // The value is pushed to the bottom of a stretched column, so a label
        // that wraps pushes nothing out of line.
        const value = card.querySelector('.pi-delegates-stats__counter-value') as HTMLElement;
        expect(value.className).toContain('mt-auto');

        // ★ discriminating: the earlier fix reserved two label lines, which aligned
        //   them at the cost of an empty line in every card whose label fits on one.
        const labelRow = card.querySelector('span') as HTMLElement;
        expect(labelRow.className).not.toContain('min-h-[2rem]');
      }
    });

    it('aligns every counter to the start, not the centre', () => {
      mockService.isAdminView.set(true);
      fixture.detectChanges();

      const cards = Array.from(
        fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter')
      ) as HTMLElement[];

      for (const card of cards) {
        expect(card.className).toContain('items-start');
        // ★ discriminating: centred contents read as a different component than
        //   the project-detail tiles these follow.
        expect(card.className).not.toContain('items-center');
        expect((card.querySelector('span') as HTMLElement).className).not.toContain('justify-center');
      }
    });

    it('gives the long-labelled counters a wider share of the row than the short ones', () => {
      mockService.isAdminView.set(true);
      fixture.detectChanges();

      const cards = Array.from(
        fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter')
      ) as HTMLElement[];
      const shareOf = (label: string) => {
        const card = cards.find(c => (c.textContent ?? '').replace(/\s+/g, ' ').includes(label));
        return card?.className ?? '';
      };

      // The two that wrap need the room; the three that do not were holding
      // whitespace they had no use for.
      expect(shareOf('PROJECTS AS PI DELEGATE')).toContain('flex-[1.6_1_185px]');
      expect(shareOf('PROJECTS WITHOUT PI DELEGATE')).toContain('flex-[1.6_1_185px]');

      // ★ discriminating: an equal-share layout would give these the same class.
      expect(shareOf('ALL PROJECTS')).toContain('flex-[1_1_120px]');
      expect(shareOf('PI DELEGATES')).toContain('flex-[1_1_120px]');
      expect(shareOf('ALL PROJECTS')).not.toContain('flex-[1.6_1_185px]');
    });

    it('neither the notice nor the counter exist for a PI or delegate (negative discriminator)', () => {
      mockService.byProjectCache.set([makeProject({ project_code: 'P001', pi_user_id: 99 })]);
      mockService.isAdminView.set(false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.pi-delegates-admin-notice')).toBeNull();
      const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
      expect(counters.length).toBe(4);
      expect(
        (counters[0] as HTMLElement).querySelector('.pi-delegates-stats__counter-label')?.textContent
      ).not.toContain('ALL PROJECTS');
    });
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  it('Assign New Delegate opens the modal with an empty newDelegate context', () => {
    fixture.detectChanges();

    component.onAssignNewDelegate();

    const modals = TestBed.inject(AllModalsService);
    expect(modals.assignPiDelegateContext()).toEqual({ source: 'newDelegate' });
    expect(modals.isModalOpen('assignPiDelegate')?.isOpen).toBe(true);
  });

  it('info banner is ABSENT (the description block supersedes it)', () => {
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.pi-delegates-banner');
    expect(banner).toBeNull();
  });

  it('stat counters split PI projects from delegated ones (discriminating)', () => {
    // The list mixes both: P001 has the caller (99) as PI, P002 does not.
    mockService.byProjectCache.set([
      makeProject({ project_code: 'P001', delegates: [], pi_user_id: 99 }),
      makeProject({ project_code: 'P002', delegates: [], pi_user_id: 7 })
    ]);
    fixture.detectChanges();

    const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
    expect(counters.length).toBe(4);

    const valueOf = (i: number) =>
      (counters[i] as HTMLElement).querySelector('.pi-delegates-stats__counter-value')?.textContent?.trim();
    const labelOf = (i: number) =>
      (counters[i] as HTMLElement).querySelector('.pi-delegates-stats__counter-label')?.textContent;

    expect(labelOf(0)).toContain('PROJECTS AS PI');
    expect(valueOf(0)).toBe('1'); // NOT 2 — one of them is only delegated
    expect(labelOf(1)).toContain('PROJECTS AS PI DELEGATE');
    expect(valueOf(1)).toBe('1');
  });

  it('stat counter — PI DELEGATES shows service.totalDistinctDelegates() value (discriminating)', () => {
    // Arrange: 2 distinct delegates across 2 projects → totalDistinctDelegates = 2.
    mockService.byProjectCache.set([
      makeProject({
        project_code: 'P001',
        delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'a@c.com', is_active: true }]
      }),
      makeProject({
        project_code: 'P002',
        delegates: [{ delegate_user_id: 2, name: 'Bob', email: 'b@c.com', is_active: true }]
      })
    ]);
    fixture.detectChanges();

    const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
    const secondValue = (counters[2] as HTMLElement).querySelector('.pi-delegates-stats__counter-value');
    expect((secondValue as HTMLElement | null)?.textContent?.trim()).toBe('2');
    const secondLabel = (counters[2] as HTMLElement).querySelector('.pi-delegates-stats__counter-label');
    expect((secondLabel as HTMLElement | null)?.textContent).toContain('PI DELEGATES');
  });

  it('stat counter — PROJECTS WITHOUT PI DELEGATE shows service.projectsWithoutDelegate().length (discriminating)', () => {
    // Arrange: 1 project with no delegates → count = 1 (if wrong wiring → 0 or different value).
    mockService.byProjectCache.set([
      makeProject({ project_code: 'P001', delegates: [] }),
      makeProject({ project_code: 'P002', delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'a@c.com', is_active: true }] })
    ]);
    fixture.detectChanges();

    const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
    const thirdValue = (counters[3] as HTMLElement).querySelector('.pi-delegates-stats__counter-value');
    expect((thirdValue as HTMLElement | null)?.textContent?.trim()).toBe('1');
    const thirdLabel = (counters[3] as HTMLElement).querySelector('.pi-delegates-stats__counter-label');
    expect((thirdLabel as HTMLElement | null)?.textContent).toContain('PROJECTS WITHOUT PI DELEGATE');
  });

  it('stat counter — PROJECTS WITHOUT PI DELEGATE value uses the amber (orange-1) token class', () => {
    fixture.detectChanges();
    const counters = fixture.nativeElement.querySelectorAll('.pi-delegates-stats__counter');
    const thirdValue = (counters[3] as HTMLElement).querySelector('.pi-delegates-stats__counter-value');
    // The amber class must be present; the other counters must NOT have it.
    expect((thirdValue as HTMLElement | null)?.classList.contains('atc-orange-1')).toBe(true);
    const firstValue = (counters[0] as HTMLElement).querySelector('.pi-delegates-stats__counter-value');
    expect((firstValue as HTMLElement | null)?.classList.contains('atc-orange-1')).toBe(false);
  });

  // ── 3. Search / summary live in the tables, not the shell ───────────────────

  it('does NOT render a shell-level filter bar (search + status moved into each table)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-filterbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('#pi-delegates-search')).toBeNull();
  });

  it('does NOT render a shell-level footer summary (moved into each table card)', () => {
    mockService.byProjectCache.set([
      makeProject({
        project_code: 'P001',
        delegates: [{ delegate_user_id: 1, name: 'Alice', email: 'a@c.com', is_active: true }]
      })
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-footer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pi-delegates-footer__left')).toBeNull();
  });

  // ── 5. NFR-UI-003 — Loading state (K-015 transition) ───────────────────────

  it('shows loading indicator while service.loading() is true (NFR-UI-003)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--loading')).toBeNull();

    mockService.loading.set(true);
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('.pi-delegates-state--loading');
    expect(loadingEl).not.toBeNull();
    expect(loadingEl?.textContent).toMatch(/Loading/i);
  });

  it('hides loading indicator when service.loading() becomes false (NFR-UI-003)', () => {
    mockService.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--loading')).not.toBeNull();

    mockService.loading.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-delegates-state--loading')).toBeNull();
  });

  // ── 6. NFR-UI-003 — Error state (K-015 transition) ─────────────────────────

  it('shows error block when service.error() is non-null (NFR-UI-003)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).toBeNull();

    mockService.error.set('Failed to load by-project data');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.pi-delegates-state--error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toMatch(/Could not load/i);
  });

  it('hides error block when error() clears (NFR-UI-003)', () => {
    mockService.error.set('some error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).not.toBeNull();

    mockService.error.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-delegates-state--error')).toBeNull();
  });

  // ── 7. Tab panel rendering ──────────────────────────────────────────────────

  it('renders app-by-project in the By-project tab panel when not loading and no error (NFR-UI-003)', () => {
    fixture.detectChanges();
    const byProjectEl = fixture.nativeElement.querySelector('app-by-project');
    expect(byProjectEl).not.toBeNull();
  });

  it('does not render the tab content when loading=true (NFR-UI-003, K-015 transition)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-by-project')).not.toBeNull();

    mockService.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-by-project')).toBeNull();
  });

  // ── 8. Tab index signal ──────────────────────────────────────────────────────

  it('updates activeTabIndex signal when onTabChange is called', () => {
    fixture.detectChanges();
    expect(component.activeTabIndex()).toBe(0);

    component.onTabChange({ index: 1 });
    expect(component.activeTabIndex()).toBe(1);

    component.onTabChange({ index: 0 });
    expect(component.activeTabIndex()).toBe(0);
  });

  // ── 10. Delegation History wiring ───────────────────────────────────────────

  describe('onHistoryFromProject handler (10)', () => {
    it('sets piDelegateHistoryContext to byProject and opens piDelegateHistory modal', () => {
      fixture.detectChanges();

      // AllModalsService is provided in root — get the real instance injected
      const allModals = TestBed.inject(AllModalsService);

      component.onHistoryFromProject({ projectCode: 'PRJ-999', projectName: 'Test Project' });

      const ctx = allModals.piDelegateHistoryContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.source).toBe('byProject');
      if (ctx!.source === 'byProject') {
        expect(ctx!.projectCode).toBe('PRJ-999');
        expect(ctx!.projectName).toBe('Test Project');
      }
      expect(allModals.isModalOpen('piDelegateHistory').isOpen).toBe(true);
    });
  });

  describe('onHistoryFromPerson handler (10)', () => {
    it('sets piDelegateHistoryContext to byPerson and opens piDelegateHistory modal', () => {
      fixture.detectChanges();

      const allModals = TestBed.inject(AllModalsService);

      component.onHistoryFromPerson({ delegateUserId: 77, name: 'Bob Delegate' });

      const ctx = allModals.piDelegateHistoryContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.source).toBe('byPerson');
      if (ctx!.source === 'byPerson') {
        expect(ctx!.delegateUserId).toBe(77);
        expect(ctx!.name).toBe('Bob Delegate');
      }
      expect(allModals.isModalOpen('piDelegateHistory').isOpen).toBe(true);
    });
  });

  // ── 11. The role explanation lives in the description, not in a banner ──────

  it('renders no separate info banner — the description carries that copy', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-delegates-info')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="note"]')).toBeNull();
  });

  it('keeps the description visible while loading and on error', () => {
    mockService.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-description')).not.toBeNull();

    mockService.loading.set(false);
    mockService.error.set('boom');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-delegates-description')).not.toBeNull();
  });
});

// ─── Null-user edge case ──────────────────────────────────────────────────────

describe('MyPiDelegatesComponent — unauthenticated edge', () => {
  it('does NOT call loadByUser when sec_user_id is null', async () => {
    const byProjectCache = signal<ProjectDelegates[]>([]);
    const mockSvc = {
      byProjectCache,
      byPersonCache: signal<ProjectDelegates[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      loadByProject: jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined),
      loadByUser: jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined),
      totalProjects: computed(() => byProjectCache().length),
      totalDistinctDelegates: computed(() => 0),
      projectsWithoutDelegate: computed(() => byProjectCache().filter(p => p.delegates.length === 0)),
      currentUserId: signal<number | null>(null),
      isPiOf: () => false,
      isDelegateOf: () => true,
      projectsAsPi: computed(() => []),
      projectsAsDelegate: computed(() => byProjectCache()),
      isAdminView: signal(false)
    };
    const noUserCache = { dataCache: signal({ user: undefined }) };

    await TestBed.configureTestingModule({
      imports: [MyPiDelegatesComponent, NoopAnimationsModule],
      providers: [
        // the By project cell links to /project-detail
        provideRouter([]),
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
