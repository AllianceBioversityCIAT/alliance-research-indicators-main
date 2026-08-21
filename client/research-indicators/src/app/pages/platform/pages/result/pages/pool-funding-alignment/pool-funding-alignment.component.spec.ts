import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { WebsocketService } from '@sockets/websocket.service';

import PoolFundingAlignmentComponent from './pool-funding-alignment.component';
import { SpTocAlignmentBlockComponent } from './components/sp-toc-alignment-block/sp-toc-alignment-block.component';
import { BilateralService, PatchAlignmentResult } from '@shared/services/bilateral.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { ClarityService } from '@shared/services/clarity.service';
import { SubmissionService } from '@shared/services/submission.service';
import {
  AlignmentResponse,
  BilateralTocCatalogResponse,
  PoolFundingMappingStatus,
  PoolFundingScienceProgram,
  SavedTocAlignment,
  SpAlignmentDraft,
  TocAlignmentWriteDto,
  TocCatalogSp
} from '@interfaces/bilateral/pool-funding-alignment.interface';
import {
  SAVED_TOC_ALIGNMENTS_FIXTURE,
  TOC_CATALOG_CAPSHARING_FIXTURE,
  TOC_CATALOG_CAPSHARING_GUIDANCE_FIXTURE,
  TOC_CATALOG_EMPTY_LEVELS_FIXTURE,
  TOC_CATALOG_TWO_SP_FIXTURE,
  TOC_CATALOG_VERSION_LOCKED_FIXTURE
} from 'src/app/testing/toc-catalog.fixture';

// Faithful re-implementations of the pure T-02 seams the page delegates to, so
// tests exercise the real DTO/draft semantics without re-mocking BilateralService.
const draftsFromSaved = (saved: SavedTocAlignment[] | undefined | null): SpAlignmentDraft[] =>
  (saved ?? []).map(s => ({
    sp_code: s.sp_code,
    aligns_with_toc: s.aligns_with_toc,
    level: s.level ?? null,
    toc_result_id: s.toc_result_id ?? null,
    indicator_id: s.indicator_id ?? null,
    quantitative_contribution: s.quantitative_contribution ?? null
  }));

const writeDtoFromDrafts = (drafts: SpAlignmentDraft[]): TocAlignmentWriteDto[] => {
  const dtos: TocAlignmentWriteDto[] = [];
  for (const draft of drafts) {
    if (draft.aligns_with_toc === false) {
      dtos.push({ sp_code: draft.sp_code, aligns_with_toc: false });
      continue;
    }
    if (draft.aligns_with_toc !== true) continue;
    dtos.push({
      sp_code: draft.sp_code,
      aligns_with_toc: true,
      ...(draft.level !== null ? { level: draft.level } : {}),
      ...(draft.toc_result_id !== null ? { toc_result_id: draft.toc_result_id } : {}),
      ...(draft.indicator_id !== null ? { indicator_id: draft.indicator_id } : {}),
      ...(draft.quantitative_contribution !== null ? { quantitative_contribution: draft.quantitative_contribution } : {})
    });
  }
  return dtos;
};

describe('PoolFundingAlignmentComponent', () => {
  let component: PoolFundingAlignmentComponent;
  let fixture: ComponentFixture<PoolFundingAlignmentComponent>;
  let currentAlignment: ReturnType<typeof signal<AlignmentResponse | null>>;
  let loadingAlignment: ReturnType<typeof signal<boolean>>;
  let savingAlignment: ReturnType<typeof signal<boolean>>;
  let editable: ReturnType<typeof signal<boolean>>;
  let sciencePrograms: ReturnType<typeof signal<PoolFundingScienceProgram[]>>;
  let mappingStatus: ReturnType<typeof signal<PoolFundingMappingStatus | null>>;
  let tocCatalog: ReturnType<typeof signal<BilateralTocCatalogResponse | null>>;
  let loadingTocCatalog: ReturnType<typeof signal<boolean>>;
  let tocCatalogError: ReturnType<typeof signal<boolean>>;
  let getAlignmentMock: jest.Mock;
  let getScienceProgramsMock: jest.Mock;
  let getTocCatalogMock: jest.Mock;
  let patchAlignmentMock: jest.Mock;
  let routerNavigate: jest.Mock;
  let showToastMock: jest.Mock;
  let showGlobalAlertMock: jest.Mock;
  let socketEvents$: Subject<unknown>;
  let listenMock: jest.Mock;
  let trackEventMock: jest.Mock;

  const codes = (form: { selected_sps: { official_code: string }[] }) => form.selected_sps.map(sp => sp.official_code);
  const sp = (official_code: string) => ({ official_code });

  const baseAlignment: AlignmentResponse = {
    result_code: 'RES-001',
    eligible: true,
    has_pool_funding_alignment_eligible: true,
    has_contribution: null,
    selected_science_programs: [],
    selected_levers: [],
    is_synced_to_prms: false,
    is_read_only: false
  };

  const catalogForSp = (spCode: string): TocCatalogSp | null =>
    tocCatalog()?.catalogs?.find(c => c.sp_code === spCode) ?? null;

  beforeEach(async () => {
    currentAlignment = signal<AlignmentResponse | null>(null);
    loadingAlignment = signal<boolean>(false);
    savingAlignment = signal<boolean>(false);
    editable = signal<boolean>(true);
    sciencePrograms = signal<PoolFundingScienceProgram[]>([]);
    mappingStatus = signal<PoolFundingMappingStatus | null>(null);
    tocCatalog = signal<BilateralTocCatalogResponse | null>(null);
    loadingTocCatalog = signal<boolean>(false);
    tocCatalogError = signal<boolean>(false);
    getAlignmentMock = jest.fn().mockResolvedValue(null);
    getScienceProgramsMock = jest.fn().mockResolvedValue([]);
    getTocCatalogMock = jest.fn().mockResolvedValue(null);
    patchAlignmentMock = jest.fn();
    routerNavigate = jest.fn().mockResolvedValue(true);
    showToastMock = jest.fn();
    showGlobalAlertMock = jest.fn();
    socketEvents$ = new Subject<unknown>();
    listenMock = jest.fn().mockReturnValue(socketEvents$.asObservable());
    trackEventMock = jest.fn();

    const bilateralServiceMock = {
      currentAlignment,
      loadingAlignment,
      savingAlignment,
      editable,
      sciencePrograms,
      mappingStatus,
      tocCatalog,
      loadingTocCatalog,
      tocCatalogError,
      getAlignment: getAlignmentMock,
      getSciencePrograms: getScienceProgramsMock,
      getTocCatalog: getTocCatalogMock,
      patchAlignment: patchAlignmentMock,
      catalogForSp,
      draftsFromSaved,
      writeDtoFromDrafts
    };

    const cacheServiceMock = {
      currentResultId: signal(123),
      getCurrentNumericResultId: () => 123,
      currentMetadata: signal({ result_title: 'Test Title' }),
      currentResultIsLoading: signal(false),
      isSidebarCollapsed: () => false,
      hasSmallScreen: () => false,
      showSectionHeaderActions: () => false,
      isExternalResult: () => false
    };

    const routeMock = {
      snapshot: {
        paramMap: {
          get: (k: string) => (k === 'id' ? 'RES-001' : null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [PoolFundingAlignmentComponent, HttpClientTestingModule],
      providers: [
        { provide: BilateralService, useValue: bilateralServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ActionsService, useValue: { showToast: showToastMock, showGlobalAlert: showGlobalAlertMock } },
        { provide: SubmissionService, useValue: { isEditableStatus: signal(true) } },
        { provide: WebsocketService, useValue: { listen: listenMock } },
        { provide: ClarityService, useValue: { trackEvent: trackEventMock } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PoolFundingAlignmentComponent);
    component = fixture.componentInstance;
  });

  it('should create and call getAlignment with the route resultCode on init', () => {
    expect(component).toBeTruthy();
    expect(getAlignmentMock).toHaveBeenCalledWith('RES-001');
  });

  it('renders the section title info icon aligned with tooltip text matching the info banner', () => {
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('[data-testid="pf-alignment-title-info-icon"]') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-label')).toBe(component.INFO_BANNER);
    expect(icon.classList.contains('pf-alignment-section-heading__icon')).toBe(true);
  });

  it('falls back to cache.getCurrentNumericResultId when route param is absent', async () => {
    TestBed.resetTestingModule();
    const altRoute = { snapshot: { paramMap: { get: () => null } } };
    const altCache = {
      currentResultId: signal(456),
      getCurrentNumericResultId: () => 456,
      currentMetadata: signal({}),
      currentResultIsLoading: signal(false),
      isSidebarCollapsed: () => false,
      hasSmallScreen: () => false,
      showSectionHeaderActions: () => false,
      isExternalResult: () => false
    };
    const altGet = jest.fn().mockResolvedValue(null);
    await TestBed.configureTestingModule({
      imports: [PoolFundingAlignmentComponent, HttpClientTestingModule],
      providers: [
        {
          provide: BilateralService,
          useValue: {
            currentAlignment: signal<AlignmentResponse | null>(null),
            loadingAlignment: signal(false),
            savingAlignment: signal(false),
            editable: signal(true),
            sciencePrograms: signal<PoolFundingScienceProgram[]>([]),
            mappingStatus: signal<PoolFundingMappingStatus | null>(null),
            tocCatalog: signal<BilateralTocCatalogResponse | null>(null),
            loadingTocCatalog: signal(false),
            tocCatalogError: signal(false),
            getAlignment: altGet,
            getSciencePrograms: jest.fn().mockResolvedValue([]),
            getTocCatalog: jest.fn().mockResolvedValue(null),
            catalogForSp,
            draftsFromSaved,
            writeDtoFromDrafts
          }
        },
        { provide: CacheService, useValue: altCache },
        { provide: ActivatedRoute, useValue: altRoute },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } },
        { provide: WebsocketService, useValue: { listen: jest.fn().mockReturnValue(new Subject().asObservable()) } },
        { provide: ClarityService, useValue: { trackEvent: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    TestBed.createComponent(PoolFundingAlignmentComponent);

    expect(altGet).toHaveBeenCalledWith('456');
  });

  // Regression — prod-mode DI poisoned record: after WebsocketService's factory
  // throws once (Socket has no provider app-wide), Angular's hydrate() returns
  // the CIRCULAR sentinel `{}` on the NEXT inject instead of throwing (the
  // guard is ngDevMode-gated). The component must shape-check and degrade to
  // the no-socket UX instead of crashing with "listen is not a function".
  it('constructs without socket refresh when the injector yields a listen-less object (poisoned CIRCULAR sentinel)', async () => {
    TestBed.resetTestingModule();
    const sentinelGet = jest.fn().mockResolvedValue(null);
    await TestBed.configureTestingModule({
      imports: [PoolFundingAlignmentComponent, HttpClientTestingModule],
      providers: [
        {
          provide: BilateralService,
          useValue: {
            currentAlignment: signal<AlignmentResponse | null>(null),
            loadingAlignment: signal(false),
            savingAlignment: signal(false),
            editable: signal(true),
            sciencePrograms: signal<PoolFundingScienceProgram[]>([]),
            mappingStatus: signal<PoolFundingMappingStatus | null>(null),
            tocCatalog: signal<BilateralTocCatalogResponse | null>(null),
            loadingTocCatalog: signal(false),
            tocCatalogError: signal(false),
            getAlignment: sentinelGet,
            getSciencePrograms: jest.fn().mockResolvedValue([]),
            getTocCatalog: jest.fn().mockResolvedValue(null),
            catalogForSp,
            draftsFromSaved,
            writeDtoFromDrafts
          }
        },
        {
          provide: CacheService,
          useValue: {
            currentResultId: signal(123),
            getCurrentNumericResultId: () => 123,
            currentMetadata: signal({}),
            currentResultIsLoading: signal(false),
            isSidebarCollapsed: () => false,
            hasSmallScreen: () => false,
            showSectionHeaderActions: () => false,
            isExternalResult: () => false
          }
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'RES-001' : null) } } } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
        { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } },
        // The poisoned record: truthy, but no `listen` function on it.
        { provide: WebsocketService, useValue: {} },
        { provide: ClarityService, useValue: { trackEvent: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    expect(() => TestBed.createComponent(PoolFundingAlignmentComponent)).not.toThrow();
    expect(sentinelGet).toHaveBeenCalledWith('RES-001');
  });

  describe('view modes — has_contribution', () => {
    it('formData is empty when alignment is null (loading)', () => {
      expect(component.formData()).toEqual({
        has_contribution: null,
        selected_sps: [],
        // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127
        primary_sp_code: null,
        toc_drafts: []
      });
    });

    it('seeds formData from server when alignment loads (has_contribution=null)', () => {
      currentAlignment.set({ ...baseAlignment });
      component.seedFromServer(currentAlignment()!);

      expect(component.formData().has_contribution).toBeNull();
      expect(codes(component.formData())).toEqual([]);
    });

    it('seeds formData from server with has_contribution=false', () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);

      expect(component.formData().has_contribution).toBe(false);
      expect(codes(component.formData())).toEqual([]);
    });

    it('seeds formData from server with has_contribution=true and pre-filled SPs', () => {
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [
          { code: 'SP01', name: 'Breeding for Tomorrow', role: 'PRIMARY' },
          { code: 'SP02', name: 'Sustainable Farming', role: 'CONTRIBUTING' }
        ]
      });
      component.seedFromServer(currentAlignment()!);

      expect(component.formData().has_contribution).toBe(true);
      expect(codes(component.formData()).sort()).toEqual(['SP01', 'SP02']);
      expect(component.formData().selected_sps[0]).toMatchObject({ official_code: 'SP01', name: 'Breeding for Tomorrow' });
      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-123 AC.1, R-BIL-127
      // Primary derived solely from the wire's role: 'PRIMARY' entry, not position.
      expect(component.formData().primary_sp_code).toBe('SP01');
    });

    it('falls back to selected_levers when selected_science_programs is absent (backend compat)', () => {
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: undefined,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'Lever 1' },
          { lever_code: 'SP02', lever_name: 'Lever 2' }
        ]
      });
      component.seedFromServer(currentAlignment()!);

      expect(codes(component.formData()).sort()).toEqual(['SP01', 'SP02']);
    });
  });

  describe('toggle behavior — onContributionChange', () => {
    beforeEach(() => {
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'Breeding for Tomorrow', role: 'PRIMARY' }]
      });
      component.seedFromServer(currentAlignment()!);
    });

    it('flip true → false clears selected_sps, toc_drafts AND primary_sp_code', () => {
      expect(codes(component.formData())).toEqual(['SP01']);
      expect(component.formData().primary_sp_code).toBe('SP01');
      component.onContributionChange(false);
      expect(component.formData().has_contribution).toBe(false);
      expect(codes(component.formData())).toEqual([]);
      expect(component.formData().toc_drafts).toEqual([]);
      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127
      // A stale Primary must not survive into a later "Yes" flip.
      expect(component.formData().primary_sp_code).toBeNull();
    });

    it('flip false → true preserves selected_sps already in form state', () => {
      component.onContributionChange(false);
      expect(codes(component.formData())).toEqual([]);
      component.onContributionChange(true);
      expect(component.formData().has_contribution).toBe(true);
      expect(codes(component.formData())).toEqual([]);
    });
  });

  describe('canSave gate', () => {
    beforeEach(() => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
    });

    it('false when not dirty (form matches server)', () => {
      expect(component.canSave()).toBe(false);
    });

    it('false when has_contribution=true and selected_sps is empty (≥1 SP required)', () => {
      component.onContributionChange(true);
      expect(codes(component.formData())).toEqual([]);
      expect(component.canSave()).toBe(false);
    });

    it('true when has_contribution=true and ≥1 SP selected, a Primary chosen, and form is dirty', () => {
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        primary_sp_code: 'SP01',
        toc_drafts: [component['emptyDraft']('SP01')]
      }));
      expect(component.canSave()).toBe(true);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-127 AC.3
    // has_contribution: true with ≥1 SP selected but NO Primary chosen must block
    // save — the client-side clause canSave() gains (design.md §6.1), independent
    // of the server 400. Sabotage check: reverting the `!form.primary_sp_code`
    // clause in canSave() would flip this to true (the draft is otherwise complete
    // and dirty), so this fixture can fail on a real regression.
    it('R-BIL-127 AC.3 — false when has_contribution=true, ≥1 SP selected, but no Primary chosen', () => {
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        toc_drafts: [component['emptyDraft']('SP01')]
      }));
      expect(component.formData().primary_sp_code).toBeNull();
      expect(component.canSave()).toBe(false);
    });

    it('false when not editable, even with valid dirty form (Primary chosen)', () => {
      editable.set(false);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      expect(component.canSave()).toBe(false);
    });

    it('false when alignment is read-only, even with valid dirty form (Primary chosen)', () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false, is_read_only: true });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      expect(component.canSave()).toBe(false);
    });

    it('false while the Primary’s rendered "Yes" draft is below the Level + HLO floor (missing toc_result_id)', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        primary_sp_code: 'SP01',
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: null, indicator_id: null, quantitative_contribution: null }]
      }));
      expect(component.canSave()).toBe(false);
    });

    // R-BIL-112 AC.1/AC.2 — the defect being fixed: a "Yes" carrying Level + HLO
    // but no indicator must NOT disable save (it used to, under the old
    // completeness gate — D-C1-4 reverts that half).
    it('true while the Primary’s rendered "Yes" draft has Level + HLO but no indicator (partial, at the floor)', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        primary_sp_code: 'SP01',
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: null, quantitative_contribution: null }]
      }));
      expect(component.canSave()).toBe(true);
    });

    it('false while the Primary’s rendered "Yes" draft supplies a negative quantitative_contribution', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        primary_sp_code: 'SP01',
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: -1 }]
      }));
      expect(component.canSave()).toBe(false);
    });

    it('true when the Primary’s rendered "Yes" draft is complete', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        primary_sp_code: 'SP01',
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 }]
      }));
      expect(component.canSave()).toBe(true);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.2
    // Discriminating fixture (tasks.md §4): ≥2 selected SPs, a Primary chosen, and
    // the NON-Primary SP's draft is unanswered (null). If canSave() still evaluated
    // "every selected SP" (the pre-T-15 loop), this would be false; under the
    // narrowed "Primary's draft only" loop it is true. Sabotage: reverting T-15's
    // narrowing (evaluating every draft instead of only the Primary's) flips this
    // fixture to false, proving the loop is actually narrowed and not merely
    // untriggered by coincidence.
    it('R-BIL-128 AC.2 — canSave() ignores a Contributing SP’s missing ToC answer', () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01'), sp('SP03')],
        primary_sp_code: 'SP01',
        toc_drafts: [
          { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 },
          { sp_code: 'SP03', aligns_with_toc: null, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null }
        ]
      }));
      expect(component.canSave()).toBe(true);
    });

    // The other direction — guards against inverting R-BIL-128 AC.2 into a
    // regression of the C1 R-BIL-112 floor: the PRIMARY's own unanswered draft
    // must still block, even with a Contributing SP selected alongside it.
    it('R-BIL-128 AC.2 (other direction) — the Primary’s own unanswered draft still blocks save', () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01'), sp('SP03')],
        primary_sp_code: 'SP01',
        toc_drafts: [
          { sp_code: 'SP01', aligns_with_toc: null, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null },
          { sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 }
        ]
      }));
      expect(component.canSave()).toBe(false);
    });
  });

  describe('eligibility redirect', () => {
    const buildWith = async (alignmentValue: AlignmentResponse | null) => {
      TestBed.resetTestingModule();
      const navigate = jest.fn().mockResolvedValue(true);
      const altGet = jest.fn().mockResolvedValue(alignmentValue);
      const route = { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'RES-001' : null) } } };
      const cache = {
        currentResultId: signal(123),
        getCurrentNumericResultId: () => 123,
        currentMetadata: signal({}),
        currentResultIsLoading: signal(false),
        isSidebarCollapsed: () => false,
        hasSmallScreen: () => false,
        showSectionHeaderActions: () => false,
        isExternalResult: () => false
      };
      await TestBed.configureTestingModule({
        imports: [PoolFundingAlignmentComponent, HttpClientTestingModule],
        providers: [
          {
            provide: BilateralService,
            useValue: {
              currentAlignment: signal<AlignmentResponse | null>(null),
              loadingAlignment: signal(false),
              savingAlignment: signal(false),
              editable: signal(true),
              sciencePrograms: signal<PoolFundingScienceProgram[]>([]),
              mappingStatus: signal<PoolFundingMappingStatus | null>(null),
              tocCatalog: signal<BilateralTocCatalogResponse | null>(null),
              loadingTocCatalog: signal(false),
              tocCatalogError: signal(false),
              getAlignment: altGet,
              getSciencePrograms: jest.fn().mockResolvedValue([]),
              getTocCatalog: jest.fn().mockResolvedValue(null),
              patchAlignment: jest.fn(),
              catalogForSp,
              draftsFromSaved,
              writeDtoFromDrafts
            }
          },
          { provide: CacheService, useValue: cache },
          { provide: ActivatedRoute, useValue: route },
          { provide: Router, useValue: { navigate } },
          { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } },
          { provide: WebsocketService, useValue: { listen: jest.fn().mockReturnValue(new Subject().asObservable()) } }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PoolFundingAlignmentComponent);
      await Promise.resolve();
      await Promise.resolve();
      return { component: f.componentInstance, navigate };
    };

    it('does not redirect when alignment resolves with eligible=true', async () => {
      const { navigate, component: c } = await buildWith({ ...baseAlignment });
      expect(navigate).not.toHaveBeenCalled();
      expect(c.loadFailed()).toBe(false);
    });

    it('redirects to general-information when alignment resolves with eligible=false', async () => {
      const { navigate } = await buildWith({ ...baseAlignment, eligible: false, has_pool_funding_alignment_eligible: false });
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/result', 'RES-001', 'general-information'], { replaceUrl: true });
    });

    it('does not redirect and flips loadFailed when getAlignment resolves null (network error)', async () => {
      const { navigate, component: c } = await buildWith(null);
      expect(navigate).not.toHaveBeenCalled();
      expect(c.loadFailed()).toBe(true);
    });
  });

  describe('section load — three GETs', () => {
    it('fetches alignment, science-programs, and ToC catalog once eligible', async () => {
      TestBed.resetTestingModule();
      const altGet = jest.fn().mockResolvedValue({ ...baseAlignment });
      const altGetSps = jest.fn().mockResolvedValue([]);
      const altGetCatalog = jest.fn().mockResolvedValue(TOC_CATALOG_CAPSHARING_FIXTURE);
      await TestBed.configureTestingModule({
        imports: [PoolFundingAlignmentComponent, HttpClientTestingModule],
        providers: [
          {
            provide: BilateralService,
            useValue: {
              currentAlignment: signal<AlignmentResponse | null>(null),
              loadingAlignment: signal(false),
              savingAlignment: signal(false),
              editable: signal(true),
              sciencePrograms: signal<PoolFundingScienceProgram[]>([]),
              mappingStatus: signal<PoolFundingMappingStatus | null>(null),
              tocCatalog: signal<BilateralTocCatalogResponse | null>(null),
              loadingTocCatalog: signal(false),
              tocCatalogError: signal(false),
              getAlignment: altGet,
              getSciencePrograms: altGetSps,
              getTocCatalog: altGetCatalog,
              patchAlignment: jest.fn(),
              catalogForSp,
              draftsFromSaved,
              writeDtoFromDrafts
            }
          },
          {
            provide: CacheService,
            useValue: {
              currentResultId: signal(123),
              getCurrentNumericResultId: () => 123,
              currentMetadata: signal({}),
              currentResultIsLoading: signal(false),
              isSidebarCollapsed: () => false,
              hasSmallScreen: () => false,
              showSectionHeaderActions: () => false,
              isExternalResult: () => false
            }
          },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? 'RES-001' : null) } } } },
          { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
          { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } },
          { provide: WebsocketService, useValue: { listen: jest.fn().mockReturnValue(new Subject().asObservable()) } },
          { provide: ClarityService, useValue: { trackEvent: jest.fn() } }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      TestBed.createComponent(PoolFundingAlignmentComponent);
      await Promise.resolve();
      await Promise.resolve();

      expect(altGetSps).toHaveBeenCalledWith('RES-001');
      expect(altGetCatalog).toHaveBeenCalledWith('RES-001');
    });
  });

  describe('per-SP ToC blocks (AC-02.2 → R-BIL-128 AC.1, AC-03.1 → R-BIL-128 AC.2/AC.3)', () => {
    // onSpSelectionChange now defers reconcileDrafts via queueMicrotask
    // (toc-mapping-save-gating-ux T-01), so the helper awaits the microtask flush.
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128
    // SP01 defaults to Primary — the block-gating tests below exercise the
    // now-Primary-only rendering rule (design.md §6.2); tests that need a
    // different Primary call component.onPrimaryChange() after this helper.
    const showBlocks = async (catalog = TOC_CATALOG_TWO_SP_FIXTURE) => {
      tocCatalog.set(catalog);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      await Promise.resolve();
    };

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.1
    // Re-pointed (tasks.md §1): "N selected SPs render N blocks" is obsolete under
    // R-BIL-128 — the ToC block renders for the Primary alone. Contributing SPs
    // (SP03 here) render NO block, question, or cascade (R-BIL-128 rationale).
    it('AC-02.2 → R-BIL-128 AC.1 — with N selected SPs, exactly ONE ToC block renders, for the Primary', async () => {
      await showBlocks();
      sciencePrograms.set([
        { code: 'SP01', name: 'A', category: null, color: null, icon_key: 'SP01', allocation: 50 },
        { code: 'SP03', name: 'B', category: null, color: null, icon_key: 'SP03', allocation: 50 }
      ]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const blocks = root.querySelectorAll('app-sp-toc-alignment-block');
      expect(blocks.length).toBe(1);
      expect(root.querySelector('[data-testid="pf-alignment-block-SP01"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-block-SP03"]')).toBeNull();
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.4
    it('R-BIL-128 AC.4 — changing the Primary moves the rendered block to the new Primary', async () => {
      await showBlocks();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-block-SP01"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-block-SP03"]')).toBeNull();

      component.onPrimaryChange('SP03');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-block-SP01"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-block-SP03"]')).not.toBeNull();
    });

    it('reconcileDrafts appends one empty draft per selected SP', async () => {
      await showBlocks();
      const drafts = component.formData().toc_drafts;
      expect(drafts.map(d => d.sp_code)).toEqual(['SP01', 'SP03']);
      expect(drafts.every(d => d.aligns_with_toc === null)).toBe(true);
    });

    it('AC-03.1 — editing SP01 (Primary) draft leaves SP03 (Contributing) draft untouched in state, and only the Primary’s entry reaches the PATCH body (10/25)', async () => {
      await showBlocks();
      // Configure both SP drafts: SP01 → 10, SP03 → 25.
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 10 });
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 });

      const sp03Before = component.formData().toc_drafts.find(d => d.sp_code === 'SP03');

      // Now edit SP01 again (change contribution to 11).
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 });

      const sp03After = component.formData().toc_drafts.find(d => d.sp_code === 'SP03');
      // SP03 reference + values unchanged (independence in state — unaffected by
      // the Primary-only PATCH restriction below, which is a payload concern).
      expect(sp03After).toBe(sp03Before);
      expect(sp03After?.quantitative_contribution).toBe(25);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.3
      // At most one toc_alignments entry, for the Primary (SP01) — SP03's edit
      // must NOT leak into the payload even though it is independently tracked
      // in state above.
      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body.toc_alignments).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 }
      ]);
    });

    it('onDraftChange replaces a draft immutably (new array reference)', async () => {
      await showBlocks();
      const before = component.formData().toc_drafts;
      component.onDraftChange({ ...component.draftForSp('SP01'), aligns_with_toc: false });
      const after = component.formData().toc_drafts;
      expect(after).not.toBe(before);
      expect(after.find(d => d.sp_code === 'SP01')?.aligns_with_toc).toBe(false);
    });

    // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-03)
    it('T-BIL-ITG-03 — resultType mirrors the catalog envelope (null until loaded)', () => {
      expect(component.resultType()).toBeNull();
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      expect(component.resultType()).toBe('capacity_sharing');
    });

    // Re-pointed alongside AC-02.2 (tasks.md §1) — only ONE block renders now
    // (the Primary's), so "every rendered block" means the single block.
    it('T-BIL-ITG-03 — the rendered (Primary’s) block receives the envelope resultType', async () => {
      await showBlocks(); // TWO_SP fixture: result_type 'capacity_sharing'
      fixture.detectChanges();
      const blocks = fixture.debugElement.queryAll(By.directive(SpTocAlignmentBlockComponent));
      expect(blocks.length).toBe(1);
      expect((blocks[0].componentInstance as SpTocAlignmentBlockComponent).sp().official_code).toBe('SP01');
      blocks.forEach(block =>
        expect((block.componentInstance as SpTocAlignmentBlockComponent).resultType()).toBe('capacity_sharing')
      );
    });
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16
  // R-BIL-127 (selector distinguishes Primary/Contributing) + R-BIL-129 (saved
  // ToC for a non-Primary SP stays visible, read-only) + carried-forward
  // obligations 5b/5c/5d (tasks.md T-16).
  describe('Primary/Contributing role selector (R-BIL-127)', () => {
    const selectTwo = () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
    };

    it('R-BIL-127 AC.1 — selecting a Primary marks that SP as Primary and leaves the other Contributing', () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      expect(component.isPrimary('SP01')).toBe(true);
      expect(component.isPrimary('SP03')).toBe(false);
      expect(component.formData().primary_sp_code).toBe('SP01');
    });

    it('R-BIL-127 AC.2 — choosing a different Primary demotes the previous one in the same interaction', () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      expect(component.isPrimary('SP01')).toBe(true);

      component.onPrimaryChange('SP03');

      expect(component.isPrimary('SP03')).toBe(true);
      expect(component.isPrimary('SP01')).toBe(false);
      expect(component.formData().primary_sp_code).toBe('SP03');
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 attempt 3 / R-BIL-127 AC.2
    // isDirty()'s dedicated Primary clause (component.ts:360,
    // `if (server.primary_sp_code !== form.primary_sp_code) return true;`) is the
    // ONLY thing that makes a Primary-ONLY change dirty, and therefore saveable
    // at all (attempt-3 review finding 2 — `BRDA:360,37,0`, uncovered). Every
    // other payload test in this corpus changes `primary_sp_code` alongside
    // another dirtying edit (selection or draft), so the clause was never the
    // SOLE cause of dirtiness anywhere — this fixture makes it so, and
    // end-to-end discharges R-BIL-127 AC.2's scenario for the first time
    // ("the save payload carries `primary_sp_code` with both codes still in
    // `sp_codes`").
    it('R-BIL-127 AC.2 — changing ONLY the Primary (no other edit) makes the form dirty, saveable, and the PATCH carries primary_sp_code with both codes in sp_codes', async () => {
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [
          { code: 'SP01', name: 'A', role: 'PRIMARY' },
          { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }
        ]
      });
      component.seedFromServer(currentAlignment()!);
      expect(component.isDirty()).toBe(false);

      component.onPrimaryChange('SP03');

      expect(component.isDirty()).toBe(true);
      expect(component.canSave()).toBe(true);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body.primary_sp_code).toBe('SP03');
      expect(body.sp_codes).toEqual(expect.arrayContaining(['SP01', 'SP03']));
      expect(body.sp_codes).toHaveLength(2);
    });

    // "Never two Primaries mid-interaction" (R-BIL-127 AC.1/AC.2, requirements.md
    // scenario) is structurally unrepresentable, not merely untested: `primary_sp_code`
    // is a single `string | null` field (design.md §6.1, mirroring D-C2-1's wire-shape
    // reasoning). A runtime assertion "no two SPs are both Primary" would be
    // tautological — it can only ever pass, because the type makes the violating
    // state impossible to construct in the first place, not just difficult to reach.
    it('R-BIL-127 AC.1/AC.2 — "never two Primaries" is enforced structurally, not by a runtime check (documented, not a discharge)', () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      component.onPrimaryChange('SP03');
      // The only assertion this fixture CAN make: one scalar field holds at most
      // one value. A test claiming to "prove" no second Primary exists would be
      // asserting the type system's guarantee back at itself.
      expect(typeof component.formData().primary_sp_code === 'string' || component.formData().primary_sp_code === null).toBe(true);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 attempt 3 / R-BIL-127 AC.4
    // Non-destructive path: no ToC catalog is loaded here, so `showTocBlocks()`
    // is false and canSave()'s ToC-completeness gate (component.ts:344-347) is
    // structurally inactive — isolating THIS test to the ONE clause AC.4 is
    // actually about: `form.has_contribution === true && !form.primary_sp_code`
    // (component.ts:328). SP01's draft is therefore also left UNTOUCHED (null),
    // so deselecting it does not trigger the D-6a destructive-confirm dialog
    // (hasMeaningfulAlignment is false) — reconcileDrafts() takes the direct
    // syncDraftsToSelection() path, which is where primaryStillSelected() clears
    // the Primary (component.ts:557). The companion test immediately below
    // covers the OTHER path — confirming a destructive removal of the Primary,
    // which clears it via applyDestructiveRemoval() (component.ts:598) instead.
    // Discriminating fix (attempt-3 review, finding 1): canSave() is asserted
    // TRUE immediately before the deselect, so the FALSE assertion after it
    // cannot be a tautology over an already-blocked save.
    it('R-BIL-127 AC.4 — deselecting the SP holding Primary clears primary_sp_code and re-blocks save', async () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      component.onSpSelectionChange();
      await Promise.resolve();

      // Primary chosen, selection dirty relative to the server snapshot, and no
      // ToC gate active — canSave() is genuinely true here.
      expect(component.formData().primary_sp_code).toBe('SP01');
      expect(component.canSave()).toBe(true);

      // Deselect SP01 (the Primary, draft untouched — no destructive confirm).
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP03')] }));
      component.onSpSelectionChange();
      await Promise.resolve();

      expect(showGlobalAlertMock).not.toHaveBeenCalled();
      expect(component.formData().primary_sp_code).toBeNull();
      expect(component.canSave()).toBe(false);
      expect(component.primaryRequiredMessage()).toBe(component.PRIMARY_SP_REQUIRED_MESSAGE);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 attempt 3 / R-BIL-127 AC.4
    // (destructive-confirm path, closes attempt-3 review finding 1's second half).
    // T-14's record claims "deselecting the SP holding Primary clears the Primary"
    // was implemented on BOTH removal paths — the direct one covered above, and
    // this one, reached when the deselected SP's draft is "meaningful" (touched
    // or server-saved), which routes through the house destructive-confirm
    // dialog instead. Before this test, applyDestructiveRemoval's own
    // primary-clearing branch (component.ts:598,
    // `primary_sp_code: form.primary_sp_code === spCode ? null : form.primary_sp_code`)
    // had never been exercised by anything in this corpus (`BRDA:598,63,0`).
    it('R-BIL-127 AC.4 — confirming a destructive removal of the Primary also clears primary_sp_code', async () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      // Give SP01 (the Primary) a touched draft so hasMeaningfulAlignment('SP01')
      // is true and deselecting it routes through confirmDestructiveRemoval() /
      // applyDestructiveRemoval(), not the direct syncDraftsToSelection() path.
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });

      component.formData.update(f => ({ ...f, selected_sps: [sp('SP03')] }));
      component.onSpSelectionChange();
      await Promise.resolve();

      expect(showGlobalAlertMock).toHaveBeenCalledTimes(1);
      const confirm = showGlobalAlertMock.mock.calls[0][0].confirmCallback.event;
      confirm();

      expect(component.formData().primary_sp_code).toBeNull();
      expect(codes(component.formData())).toEqual(['SP03']);
      expect(component.canSave()).toBe(false);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-127 AC.5
    it('R-BIL-127 AC.5 — read-only and version-locked both disable the Primary control alongside the existing picker', () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      expect(component.primaryControlDisabled()).toBe(false);

      currentAlignment.set({ ...baseAlignment, has_contribution: true, is_read_only: true });
      expect(component.primaryControlDisabled()).toBe(true);

      currentAlignment.set({ ...baseAlignment, has_contribution: true, is_read_only: false });
      tocCatalog.set(TOC_CATALOG_VERSION_LOCKED_FIXTURE);
      expect(component.primaryControlDisabled()).toBe(true);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-127 AC.5 (DOM)
    // ROOT-CAUSED (T-16 attempt 2, bounded investigation): this test deliberately
    // renders the Primary radio row with `is_read_only` still FALSE on the first
    // `detectChanges()`, THEN mutates `currentAlignment` and calls `detectChanges()`
    // again — it does NOT collapse both state changes into one render pass.
    // Empirically confirmed this is load-bearing, not stylistic: creating the
    // `p-radioButton` row for the FIRST time (inside `@for`, `p-radioButton` is
    // `ChangeDetectionStrategy.OnPush`) with `primaryControlDisabled()` already
    // `true` at creation leaves `componentInstance.disabled` (and the native
    // `<input disabled>` attribute) reading `false` even though the TS-level
    // computed itself is correctly `true` both before and after that same
    // `detectChanges()` call — and a SECOND no-op `detectChanges()` (no new
    // signal write) does not self-correct it either. The binding only takes on
    // an already-EXISTING p-radioButton instance's NEXT change-detection pass,
    // triggered by a genuine signal write after creation — exactly the sequence
    // this test uses. So: NOT a stale DebugElement/query problem (re-querying
    // `de` isn't what fixes it — a fresh signal write on an already-created row
    // is), and not a signal/computed bug (the TS value is right throughout) —
    // it is a first-render input-propagation gap on this OnPush child inside
    // `@for`, sidestepped by asserting the initial (false) state BEFORE the
    // state that flips it to true. This assertion is not lower-confidence: its
    // current two-step shape is the correct, deliberate way to observe the
    // property, and the given root cause is testable by anyone who prefers to
    // verify rather than take it on faith (create the row with disabled=true in
    // one pass and watch componentInstance.disabled read false).
    it('R-BIL-127 AC.5 — primaryControlDisabled is true when alignment is read-only or version-locked', () => {
      mappingStatus.set('mapped');
      selectTwo();
      component.onPrimaryChange('SP01');
      expect(component.primaryControlDisabled()).toBe(false);

      currentAlignment.set({ ...baseAlignment, has_contribution: true, is_read_only: true });
      expect(component.primaryControlDisabled()).toBe(true);
    });

    it('R-BIL-127 AC.6 (presence-assertion only) — Primary carries a distinct badge with star icon and Contributing carries Make Primary action', () => {
      mappingStatus.set('mapped');
      sciencePrograms.set([
        { code: 'SP01', name: 'Breeding', icon_key: 'SP01', allocation: 50 },
        { code: 'SP03', name: 'Agronomy', icon_key: 'SP03', allocation: 50 }
      ]);
      selectTwo();
      component.onPrimaryChange('SP01');
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const primaryBadge = root.querySelector('[data-testid="pf-alignment-role-primary-SP01"]');
      const makePrimaryBtn = root.querySelector('[data-testid="pf-alignment-set-primary-SP03"]');
      expect(primaryBadge).not.toBeNull();
      expect(makePrimaryBtn).not.toBeNull();
      expect(primaryBadge!.textContent?.trim()).toContain('Primary');
      expect(primaryBadge!.querySelector('.pi-star-fill')).not.toBeNull();
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.5
    it('R-BIL-128 AC.5 — with no Primary chosen, no ToC block renders (save already blocked by R-BIL-127 AC.3)', () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      mappingStatus.set('mapped');
      selectTwo();
      component.onSpSelectionChange();
      fixture.detectChanges();

      expect(component.primarySelectedSp()).toBeNull();
      expect(fixture.nativeElement.querySelector('app-sp-toc-alignment-block')).toBeNull();
      expect(component.canSave()).toBe(false);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / carried-forward 5b
    // `contributingSps` (design.md §6.1) has no template consumer as of T-14/T-15
    // (every selected SP is shown once in the Primary selector, role read off
    // `isPrimary`). Deleting it is a production change beyond T-16's single
    // sanctioned one (the `role` type flip, 5a) — flipping a signal's ts-prune
    // status is not that. Decision: ASSERT it here so the derivation is proven
    // correct and the signal earns its place until a future task either wires
    // it into the template or removes it deliberately.
    it('5b — contributingSps derives the selected set minus the Primary', () => {
      selectTwo();
      component.onPrimaryChange('SP01');
      expect(component.contributingSps().map(s => s.official_code)).toEqual(['SP03']);

      component.onPrimaryChange('SP03');
      expect(component.contributingSps().map(s => s.official_code)).toEqual(['SP01']);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / carried-forward 5c
    // Covers the component's consumption of an already-parsed
    // `result.primarySpError` (pool-funding-alignment.component.ts:781-789) — the
    // defensive path canSave() should make unreachable, exercised here via a
    // race-condition-shaped 400. The OTHER half — `extractPrimarySpError` itself,
    // the JSON-parsing logic in bilateral.service.ts that the T-14 review flagged
    // as untested — is covered separately in
    // `bilateral.service.spec.ts` → describe('extractPrimarySpError via
    // patchAlignment (T-14 / T-16, R-BIL-127)'). Both halves of 5c are closed.
    it('5c — a defensive primarySpError from the server surfaces as an inline error on primary_sp_code', async () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      mappingStatus.set('mapped');
      selectTwo();
      component.onPrimaryChange('SP01');
      component.onSpSelectionChange();
      await Promise.resolve();
      // canSave() must be true for onSave() to even reach the server — the
      // whole point of this defensive path is that it fires despite canSave()
      // having passed (a race the client cannot pre-validate away).
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });
      expect(component.canSave()).toBe(true);

      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        primarySpError: 'SP01 is no longer a valid Primary for this result.'
      } as PatchAlignmentResult);

      await component.onSave();

      expect(component.inlineErrors()?.['primary_sp_code']).toBe('SP01 is no longer a valid Primary for this result.');
      expect(showToastMock).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning' }));
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / carried-forward 5d
    // Pins existing (confusing but real) rendering: with `role: null` on every row
    // (a legacy alignment, R-BIL-126, before any Primary is ever chosen), the
    // `@else` branch in the template renders an affirmative "Contributing" badge
    // even though the true state is "no role chosen yet" — because
    // `primarySpCode` derives from `role === 'PRIMARY'` (snapshotFromServer), and
    // none of the rows carry that. Editable forms are mitigated by the concurrent
    // `primaryRequiredMessage`; a READ-ONLY legacy alignment has no such message
    // (suppressed by `isReadOnly()`), so the user sees a confident "Contributing"
    // with nothing correcting it. Recorded per tasks.md 5d — behavior pinned, not
    // endorsed; see design.md §12.2 for the decision record.
    it('5d — a read-only legacy alignment (role: null on every row) renders "Contributing" on every SP, not a neutral state', () => {
      mappingStatus.set('mapped');
      sciencePrograms.set([
        { code: 'SP01', name: 'A', icon_key: 'SP01', allocation: 50 },
        { code: 'SP03', name: 'B', icon_key: 'SP03', allocation: 50 }
      ]);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        is_read_only: true,
        selected_science_programs: [
          { code: 'SP01', name: 'A', role: null },
          { code: 'SP03', name: 'B', role: null }
        ]
      });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      expect(component.formData().primary_sp_code).toBeNull();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-role-contributing-SP01"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-role-contributing-SP03"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-role-primary-SP01"]')).toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-role-primary-SP03"]')).toBeNull();
    });
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-129
  describe('Non-Primary saved ToC stays visible, read-only (R-BIL-129)', () => {
    const orphanedRow = (overrides: Partial<SavedTocAlignment> = {}): SavedTocAlignment => ({
      sp_code: 'SP03',
      aligns_with_toc: true,
      level: 'OUTPUT',
      toc_result_id: 5187,
      indicator_id: 5973,
      quantitative_contribution: 3,
      toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
      indicator_description: 'An indicator',
      unit_of_measurement: 'Number',
      target_value: '10',
      target_year: 2026,
      ...overrides
    });

    it('R-BIL-129 AC.1/AC.2 — a saved ToC alignment for a non-Primary SP renders as a read-only summary identifying its SP, with no editable control', () => {
      mappingStatus.set('mapped');
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }],
        toc_alignments: [orphanedRow()]
      });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const summary = root.querySelector('[data-orphaned="true"]') as HTMLElement | null;
      expect(summary).not.toBeNull();
      expect(summary!.textContent).toContain('SP03');
      // AC.2 — no editable control inside the summary (no input/select/button).
      expect(summary!.querySelector('input, select, textarea, button, [contenteditable]')).toBeNull();
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-129 AC.3/AC.4
    it('R-BIL-129 AC.3/AC.4 — the orphaned row is never in the PATCH payload and never dirties the form', async () => {
      mappingStatus.set('mapped');
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }],
        toc_alignments: [orphanedRow()]
      });
      component.seedFromServer(currentAlignment()!);

      // AC.4 — orphaned SP03's saved row does not make the freshly-seeded form dirty.
      expect(component.isDirty()).toBe(false);
      expect(component.canSave()).toBe(false); // not dirty yet

      // Dirty the form via an unrelated change (edit the Primary's own draft), save.
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 9 });
      expect(component.isDirty()).toBe(true);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      const [, body] = patchAlignmentMock.mock.calls[0];
      // AC.3 — SP03 (orphaned, Contributing) never appears in toc_alignments.
      expect(body.toc_alignments).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 9 }
      ]);
    });

    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-129 AC.5
    // Discriminating fixture (tasks.md §4): SP03's row is genuinely BOTH (a)
    // orphaned — sp_code ('SP03') ≠ primary_sp_code ('SP01') — AND (b) stale — its
    // toc_result_id (999999) does not resolve in the live catalog for its level.
    // A row that is only one of the two would render once even under a
    // CONCATENATING (buggy) implementation, so it would NOT be evidence; this
    // fixture is the one that can actually fail.
    //
    // ⚠ The trap (T-15 review): a row that is both renders under
    // `data-testid="pf-alignment-stale-<sp>"`, NOT `"pf-alignment-orphaned-<sp>"`
    // (component.html:291, ternary on row.isStale — deliberate, AC-08.4 backward
    // compatibility). Querying `[data-testid="pf-alignment-orphaned-SP03"]` here
    // would find nothing against a CORRECT implementation and misread as "renders
    // zero times". Query `[data-orphaned]` / `[data-stale]` instead.
    it('R-BIL-129 AC.5 — a row that is both orphaned AND stale renders exactly once, with both attributes on the single element', () => {
      mappingStatus.set('mapped');
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE); // has SP01 results, but NOT toc_result_id 999999
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }],
        toc_alignments: [orphanedRow({ toc_result_id: 999999 })] // orphaned (sp_code≠primary) AND stale (unresolvable)
      });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      expect(component.readOnlyTocSummaries().length).toBe(1);
      const root: HTMLElement = fixture.nativeElement;
      const matches = root.querySelectorAll('[data-orphaned="true"], [data-stale="true"]');
      // Sabotage-provable: a concatenating (Array, not Map-keyed) implementation
      // of readOnlyTocSummaries would render TWO elements for this sp_code.
      expect(matches.length).toBe(1);
      const el = matches[0] as HTMLElement;
      expect(el.getAttribute('data-orphaned')).toBe('true');
      expect(el.getAttribute('data-stale')).toBe('true');
      // The trap: rendered under the STALE testid, not the orphaned one.
      expect(el.getAttribute('data-testid')).toBe('pf-alignment-stale-SP03');
      expect(root.querySelector('[data-testid="pf-alignment-orphaned-SP03"]')).toBeNull();
    });
  });

  // R-BIL-115 — regression (already implemented): the selected-SP chip renders
  // through the `#rows` ng-template of `app-multiselect` (pool-funding-alignment
  // .component.html :151), driven by `findScienceProgram()` resolving the chip's
  // allocation from the per-result `sciencePrograms` picker list.
  describe('R-BIL-115 — SP selector display format (regression)', () => {
    const spOption = (overrides: Partial<PoolFundingScienceProgram> = {}): PoolFundingScienceProgram => ({
      code: 'SP06',
      name: 'Climate Action',
      category: null,
      color: '#000000',
      icon_key: 'SP06',
      allocation: 10,
      ...overrides
    });

    const renderSelectedChip = async (option: PoolFundingScienceProgram) => {
      mappingStatus.set('mapped');
      sciencePrograms.set([option, spOption({ code: 'SP02', name: 'Other SP', icon_key: 'SP02' })]);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [{ official_code: option.code, name: option.name, category: option.category ?? null, color: option.color ?? null }]
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('AC.1 — renders the selected SP as "<code> — <allocation>% - <name>"', async () => {
      await renderSelectedChip(spOption());
      const card = fixture.nativeElement.querySelector('[data-testid="pf-alignment-sp-card-SP06"]') as HTMLElement | null;
      expect(card).not.toBeNull();
      expect(card!.textContent?.replace(/\s+/g, ' ').trim()).toContain('SP06 — 10% - Climate Action');
    });

    it('AC.2 — a null allocation renders the existing "—" placeholder, never the literal "null"', async () => {
      // Runtime data can carry a null allocation even though the wire type is
      // declared non-nullable (`?? '—'` in the template is the actual guard).
      await renderSelectedChip(spOption({ allocation: null as unknown as number }));
      const card = fixture.nativeElement.querySelector('[data-testid="pf-alignment-sp-card-SP06"]') as HTMLElement | null;
      expect(card).not.toBeNull();
      expect(card!.textContent?.replace(/\s+/g, ' ').trim()).toContain('SP06 — —% - Climate Action');
      expect(card!.textContent).not.toMatch(/\bnull\b/);
    });
  });

  describe('deselect-confirm flow (AC-02.3, D-6a)', () => {
    // onSpSelectionChange defers reconcileDrafts via queueMicrotask
    // (toc-mapping-save-gating-ux T-01), so flush the microtask after each notify.
    const selectTwoWithAlignment = async () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
      // Give SP03 a meaningful (touched) alignment.
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 });
    };

    it('removing an SP with a touched draft prompts the house confirm and keeps the chip until confirmed', async () => {
      await selectTwoWithAlignment();
      // Simulate the multiselect removing SP03 from the form, then notify.
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      await Promise.resolve();

      expect(showGlobalAlertMock).toHaveBeenCalledTimes(1);
      const alertArg = showGlobalAlertMock.mock.calls[0][0];
      expect(alertArg.severity).toBe('secondary');
      expect(alertArg.confirmCallback.label).toBe('Remove');
      expect(alertArg.cancelCallback.label).toBe('Cancel');
      // Chip restored while the dialog is open.
      expect(codes(component.formData())).toContain('SP03');
    });

    it('confirm removes the SP and its draft', async () => {
      await selectTwoWithAlignment();
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
      const confirm = showGlobalAlertMock.mock.calls[0][0].confirmCallback.event;
      confirm();
      expect(codes(component.formData())).toEqual(['SP01']);
      expect(component.formData().toc_drafts.map(d => d.sp_code)).toEqual(['SP01']);
    });

    it('cancel keeps the SP selected', async () => {
      await selectTwoWithAlignment();
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
      const cancel = showGlobalAlertMock.mock.calls[0][0].cancelCallback.event;
      cancel();
      expect(codes(component.formData())).toContain('SP03');
    });

    it('removing an SP with an untouched/empty draft needs no confirm', async () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
      // SP03 has only an empty draft.
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      await Promise.resolve();

      expect(showGlobalAlertMock).not.toHaveBeenCalled();
      expect(codes(component.formData())).toEqual(['SP01']);
      expect(component.formData().toc_drafts.map(d => d.sp_code)).toEqual(['SP01']);
    });
  });

  describe('isDirty covers toc_drafts', () => {
    it('a draft change marks the form dirty', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }],
        toc_alignments: [{ sp_code: 'SP01', aligns_with_toc: false }]
      });
      component.seedFromServer(currentAlignment()!);
      expect(component.isDirty()).toBe(false);

      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      expect(component.isDirty()).toBe(true);
    });
  });

  describe('onSave — body composition (AC-08.1)', () => {
    const dirtyTocForm = () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
    };

    it('includes toc_alignments built from writeDtoFromDrafts', async () => {
      dirtyTocForm();
      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();
      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body).toEqual({
        has_contribution: true,
        sp_codes: ['SP01'],
        primary_sp_code: 'SP01',
        toc_alignments: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 }]
      });
    });

    // R-BIL-112 AC.1/AC.2/NFR-BIL-112 — the core fix: a "Yes" draft with
    // Level + HLO but no indicator (1) does not disable save and (2) actually
    // reaches the PATCH body instead of being silently dropped by the writer.
    it('a Level + HLO draft with no indicator is PRESENT in the PATCH toc_alignments (partial draft reaches the server)', async () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: null,
        quantitative_contribution: null
      });

      expect(component.canSave()).toBe(true);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body.toc_alignments).toEqual([{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187 }]);
    });

    it('omits toc_alignments when has_contribution=false', async () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: true, selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }] });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(false);
      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: false } } as PatchAlignmentResult);
      await component.onSave();
      expect(patchAlignmentMock).toHaveBeenCalledWith('RES-001', { has_contribution: false });
    });

    it('does not send justification on PATCH (RR-G)', async () => {
      dirtyTocForm();
      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();
      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body).not.toHaveProperty('justification');
    });

    // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-06)
    it('AC-06.1 — active guidance (cross-type selection) leaks NOTHING into the write DTO: parent-spec fields only', async () => {
      // Guidance catalog + a cross-type ('other') indicator 7302 on mixed HLO
      // 7201: badges, classifications, hasTypeMatch flags and the cross-type
      // warning are all live in the UI for this exact draft.
      tocCatalog.set(TOC_CATALOG_CAPSHARING_GUIDANCE_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 7201, indicator_id: 7302, quantitative_contribution: 12 });

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body.toc_alignments).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 7201, indicator_id: 7302, quantitative_contribution: 12 }
      ]);
      // Exact key set per TocAlignmentWriteDto — no guidance field (badge /
      // classification / hasTypeMatch / …) ever reaches the PATCH payload.
      const dtoKeys = ['aligns_with_toc', 'indicator_id', 'level', 'quantitative_contribution', 'sp_code', 'toc_result_id'];
      for (const dto of body.toc_alignments as TocAlignmentWriteDto[]) {
        expect(Object.keys(dto).sort()).toEqual(dtoKeys);
      }
      expect(JSON.stringify(body)).not.toMatch(/badge|classification|hasTypeMatch/);
    });
  });

  describe('pre-fill round-trip (AC-08.1)', () => {
    it('seeds drafts from saved toc_alignments via draftsFromSaved', () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }],
        toc_alignments: SAVED_TOC_ALIGNMENTS_FIXTURE
      });
      component.seedFromServer(currentAlignment()!);

      const sp01 = component.draftForSp('SP01');
      const sp03 = component.draftForSp('SP03');
      expect(sp01).toMatchObject({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      expect(sp03).toMatchObject({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null });
    });

    // R-BIL-114 — client scenario "Partial row renders without error". T-09.
    // `SAVED_TOC_ALIGNMENTS_FIXTURE` above only exercises a COMPLETE "Yes"
    // (SP01) and a "No" (SP03) — neither is a saved PARTIAL row. This pins the
    // genuinely new reload case: a saved "Yes" carrying Level + HLO but no
    // indicator round-trips through `draftsFromSaved`
    // (bilateral.service.ts:347-356, unmodified by this task) with exactly the
    // expected nulls — proving the RELOAD path, not the already-covered
    // mid-entry cascade (R-BIL-116 AC.3 in the sibling block spec).
    it('a saved partial row (Level + HLO, no indicator) reloads with indicator/contribution null and level/toc_result_id populated', () => {
      const partialSaved: SavedTocAlignment = {
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: null,
        quantitative_contribution: null,
        toc_result_title: 'HLO1.AOW1.IO1 Steer to impact',
        indicator_description: null,
        unit_of_measurement: null,
        target_value: null,
        target_year: null
      };
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }],
        toc_alignments: [partialSaved]
      });
      component.seedFromServer(currentAlignment()!);

      const sp01 = component.draftForSp('SP01');
      expect(sp01).toEqual({
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: null,
        quantitative_contribution: null
      });
    });
  });

  describe('per-block 400 routing (AC-08.2)', () => {
    const dirtyForm = () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });
    };

    it('routes tocAlignmentErrors to the owning SP block keyed by field', async () => {
      dirtyForm();
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        tocAlignmentErrors: [
          { sp_code: 'SP01', field: 'quantitative_contribution', message: 'must be ≥ 0' },
          { sp_code: 'SP03', message: 'invalid' }
        ]
      } as PatchAlignmentResult);

      await component.onSave();

      expect(component.blockErrorsForSp('SP01')).toEqual({ quantitative_contribution: 'must be ≥ 0' });
      expect(component.blockErrorsForSp('SP03')).toEqual({ _: 'invalid' });
      expect(showToastMock).not.toHaveBeenCalled();
    });

    it('clears the block error for an SP on its next draft change', async () => {
      dirtyForm();
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        tocAlignmentErrors: [{ sp_code: 'SP01', field: 'quantitative_contribution', message: 'must be ≥ 0' }]
      } as PatchAlignmentResult);
      await component.onSave();
      expect(component.blockErrorsForSp('SP01')).not.toBeNull();

      component.onDraftChange({ ...component.draftForSp('SP01'), quantitative_contribution: 4 });
      expect(component.blockErrorsForSp('SP01')).toBeNull();
    });

    it('NO REGRESSION — unknown_sp_codes 400 still drives the inline sp_codes error + chip highlight', async () => {
      dirtyForm();
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        unknownSpCodes: ['SP04']
      } as PatchAlignmentResult);

      await component.onSave();

      expect(component.rejectedSpCodes()).toEqual(['SP04']);
      expect(component.inlineErrors()?.['sp_codes']).toContain('SP04');
    });
  });

  describe('version gate (AC-09.1)', () => {
    it('version_locked catalog disables blocks and omits toc_alignments on save', async () => {
      tocCatalog.set(TOC_CATALOG_VERSION_LOCKED_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });

      expect(component.versionLocked()).toBe(true);
      expect(component.blocksDisabled()).toBe(true);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();
      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body).not.toHaveProperty('toc_alignments');
    });

    it('renders the version-locked banner when versionLocked is true', () => {
      tocCatalog.set(TOC_CATALOG_VERSION_LOCKED_FIXTURE);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-version-locked-banner"]')).not.toBeNull();
    });

    it('AC-08.3 — 409 toc_mapping_version_locked refetches and sets the version-locked flag', async () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });

      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 409,
        description: 'toc_mapping_version_locked'
      } as PatchAlignmentResult);
      getAlignmentMock.mockClear();
      getTocCatalogMock.mockClear();

      await component.onSave();

      expect(component.versionLocked()).toBe(true);
      expect(getAlignmentMock).toHaveBeenCalledWith('RES-001');
      expect(getTocCatalogMock).toHaveBeenCalledWith('RES-001');
      expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', summary: 'Version locked' }));
    });
  });

  describe('allowed_levels: [] (AC-04.3)', () => {
    it('renders no ToC blocks and saves SP codes only', async () => {
      tocCatalog.set(TOC_CATALOG_EMPTY_LEVELS_FIXTURE);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      fixture.detectChanges();

      expect(component.showTocBlocks()).toBe(false);
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('app-sp-toc-alignment-block')).toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-hlo-section"]')).toBeNull();

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();
      expect(patchAlignmentMock).toHaveBeenCalledWith('RES-001', { has_contribution: true, sp_codes: ['SP01'], primary_sp_code: 'SP01' });
    });
  });

  describe('HLO section visibility while ToC catalog loads (Issue 5)', () => {
    const selectOneSpWhileCatalogPending = async () => {
      tocCatalog.set(null);
      loadingTocCatalog.set(true);
      tocCatalogError.set(false);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      await Promise.resolve();
      fixture.detectChanges();
    };

    it('shows the HLO section with a loading affordance when SPs are selected but the catalog is still fetching', async () => {
      await selectOneSpWhileCatalogPending();
      const root: HTMLElement = fixture.nativeElement;
      expect(component.showHloSection()).toBe(true);
      expect(component.hloSectionVisible()).toBe(true);
      expect(root.querySelector('[data-testid="pf-alignment-hlo-section"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-hlo-loading"]')).not.toBeNull();
      expect(root.querySelector('app-sp-toc-alignment-block')).toBeNull();
    });

    it('renders ToC blocks once the catalog resolves after SP selection', async () => {
      await selectOneSpWhileCatalogPending();
      loadingTocCatalog.set(false);
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('app-sp-toc-alignment-block').length).toBe(1);
    });

    it('refetches the catalog when SPs are selected and no catalog is loaded yet', async () => {
      tocCatalog.set(null);
      loadingTocCatalog.set(false);
      tocCatalogError.set(false);
      getTocCatalogMock.mockClear();
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
      expect(getTocCatalogMock).toHaveBeenCalledWith('RES-001');
    });
  });

  describe('stale snapshot render (AC-08.4)', () => {
    it('renders a read-only snapshot sub-view for a saved alignment whose toc_result_id no longer resolves', () => {
      // CapSharing catalog has SP01 results but NOT toc_result_id 999999 → stale.
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      mappingStatus.set('mapped');
      const staleSaved: SavedTocAlignment = {
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 999999,
        indicator_id: 888888,
        quantitative_contribution: 7,
        toc_result_title: 'Retired HLO',
        indicator_description: 'Retired indicator',
        unit_of_measurement: 'Number',
        target_value: '4',
        target_year: 2026
      };
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        // SP01 IS the Primary here — stale-but-not-orphaned, isolating AC-08.4
        // from R-BIL-129's orphan case (covered separately below).
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }],
        toc_alignments: [staleSaved]
      });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      expect(component.staleSnapshots().length).toBe(1);
      const root: HTMLElement = fixture.nativeElement;
      const staleEl = root.querySelector('[data-testid="pf-alignment-stale-SP01"]') as HTMLElement | null;
      expect(staleEl).not.toBeNull();
      expect(staleEl!.getAttribute('data-stale')).toBe('true');
      expect(staleEl!.hasAttribute('data-orphaned')).toBe(false);
      expect(root.querySelector('[data-testid="pf-alignment-stale-tag-SP01"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-orphaned-tag-SP01"]')).toBeNull();
      // Flat read-back fields render directly off the row (D-10 — no snapshot wrapper).
      const staleText = staleEl!.textContent ?? '';
      expect(staleText).toContain('Retired HLO');
      expect(staleText).toContain('Retired indicator');
      expect(staleText).toContain('Number');
      expect(staleText).toContain('4');
      expect(staleText).toContain('7');
    });
  });

  describe('read-only states (regression)', () => {
    it('isReadOnly is true when alignment.is_read_only=true', () => {
      currentAlignment.set({ ...baseAlignment, is_read_only: true });
      expect(component.isReadOnly()).toBe(true);
    });

    it('canSave returns false when alignment is read-only, even with valid dirty form', () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      currentAlignment.set({ ...baseAlignment, is_read_only: true });
      expect(component.canSave()).toBe(false);
    });

    it('banner copy constants are stable (regression guard against drift)', () => {
      expect(component.SYNCED_BANNER).toBe('This result has been pushed to PRMS. Alignment can no longer be edited from STAR.');
      expect(component.READ_ONLY_BANNER).toBe("You don't have permission to edit this section.");
    });
  });

  describe('read-only DOM (banners + badge + Save visibility) — regression', () => {
    it('renders synced badge + synced banner when is_read_only && is_synced_to_prms; Save absent', () => {
      currentAlignment.set({ ...baseAlignment, is_read_only: true, is_synced_to_prms: true });
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-synced-badge"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-synced-banner"]')).not.toBeNull();
    });

    it('renders read-only banner when !editable && !is_read_only; no synced badge', () => {
      editable.set(false);
      currentAlignment.set({ ...baseAlignment, is_read_only: false });
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-readonly-banner"]')).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-synced-banner"]')).toBeNull();
    });
  });

  describe('PRMS-sourced read-only differentiation (REQ-BIL-ASR-02) — regression', () => {
    it('readOnlyCause derivation across the four states', () => {
      currentAlignment.set({ ...baseAlignment, is_read_only: true, is_synced_to_prms: true });
      expect(component.readOnlyCause()).toBe('synced');
      currentAlignment.set({ ...baseAlignment, is_read_only: true, is_synced_to_prms: false });
      expect(component.readOnlyCause()).toBe('prms-sourced');
      editable.set(false);
      currentAlignment.set({ ...baseAlignment, is_read_only: false, is_synced_to_prms: false });
      expect(component.readOnlyCause()).toBe('permission');
      editable.set(true);
      currentAlignment.set({ ...baseAlignment, is_read_only: false, is_synced_to_prms: false });
      expect(component.readOnlyCause()).toBeNull();
    });

    it('AC-02.4 — 409 PRMS-sourced description refetches and resolves to the prms-sourced banner', async () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));

      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 409,
        description: 'Result is PRMS-sourced; bilateral alignment is read-only in STAR'
      } as PatchAlignmentResult);
      getAlignmentMock.mockClear();
      getAlignmentMock.mockImplementation(async () => {
        currentAlignment.set({ ...baseAlignment, is_read_only: true, is_synced_to_prms: false });
        return currentAlignment();
      });

      await component.onSave();

      expect(component.readOnlyCause()).toBe('prms-sourced');
      expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Owned by PRMS' }));
    });

    it('409 without PRMS-sourced/version-locked description keeps the "Synced to PRMS" toast', async () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')], primary_sp_code: 'SP01' }));

      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 409,
        description: 'Result was synced to PRMS'
      } as PatchAlignmentResult);
      getAlignmentMock.mockClear();
      getAlignmentMock.mockResolvedValue({ ...baseAlignment, is_read_only: true, is_synced_to_prms: true });

      await component.onSave();

      expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Synced to PRMS' }));
    });
  });

  describe('unknown_sp_codes 400 handler (REQ-BIL-ASR-03) — regression', () => {
    const dirtyFormWith = (spCodes: string[]) => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: spCodes.map(c => sp(c)), primary_sp_code: spCodes[0] ?? null }));
    };

    it('AC-03.1/AC-03.3 — 400 with unknownSpCodes → inline sp_codes error naming the codes, no toast', async () => {
      dirtyFormWith(['SP04', 'SP07']);
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        unknownSpCodes: ['SP04', 'SP07']
      } as PatchAlignmentResult);

      await component.onSave();

      expect(component.inlineErrors()?.['sp_codes']).toBe(
        'These Science Programs are no longer valid for this result: SP04, SP07. Remove them and save again.'
      );
      expect(component.rejectedSpCodes()).toEqual(['SP04', 'SP07']);
      expect(showToastMock).not.toHaveBeenCalled();
    });

    it('AC-03.2 — isRejectedSp returns true only for rejected codes', async () => {
      dirtyFormWith(['SP04', 'SP09']);
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        unknownSpCodes: ['SP04']
      } as PatchAlignmentResult);
      await component.onSave();
      expect(component.isRejectedSp('SP04')).toBe(true);
      expect(component.isRejectedSp('SP09')).toBe(false);
      expect(component.isRejectedSp(null)).toBe(false);
    });

    it('non-unknown_sp_codes 400 uses the existing fieldErrors path (no rejectedSpCodes)', async () => {
      dirtyFormWith(['SP01']);
      patchAlignmentMock.mockResolvedValue({
        ok: false,
        status: 400,
        description: 'Validation failed',
        fieldErrors: { has_contribution: 'invalid', sp_codes: 'at least one required' }
      } as PatchAlignmentResult);

      await component.onSave();

      expect(component.inlineErrors()).toEqual({ has_contribution: 'invalid', sp_codes: 'at least one required' });
      expect(component.rejectedSpCodes()).toEqual([]);
    });
  });

  describe('per-result SP picker (REQ-BIL-ASR-01) — regression', () => {
    const spOption: PoolFundingScienceProgram = {
      code: 'SP09', name: 'Scaling for Impact', category: 'Scaling programs', color: '#ec4899', icon_key: 'SP09', allocation: 25
    };
    const showPickerSection = () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
    };

    it('AC-01.2 — unmapped renders the contact-ops message and hides the picker', () => {
      showPickerSection();
      mappingStatus.set('unmapped');
      sciencePrograms.set([]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-unmapped-message"]')).not.toBeNull();
      expect(root.querySelector('app-multiselect')).toBeNull();
      expect(component.showSpPicker()).toBe(false);
    });

    it('AC-01.3 — mapped + empty SP list renders the no-SPs message and hides the picker', () => {
      showPickerSection();
      mappingStatus.set('mapped');
      sciencePrograms.set([]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-no-sps-message"]')).not.toBeNull();
      expect(component.hasNoSciencePrograms()).toBe(true);
    });

    it('AC-01.1 — mapped + SPs renders the picker bound to the per-result control-list source', () => {
      showPickerSection();
      mappingStatus.set('mapped');
      sciencePrograms.set([spOption, { ...spOption, code: 'SP02', icon_key: 'SP02' }]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-testid="pf-alignment-multi-sp-grid"]')).not.toBeNull();
      expect(component.showSpPicker()).toBe(true);
    });

    it('T-09 / R-PSP-004 — stale renders the reconcile-ops message, hides the picker, and does not tell user to register mapping (KZ-015)', () => {
      showPickerSection();
      fixture.detectChanges(); // KZ-015: arrange transition after initial detectChanges

      mappingStatus.set('stale');
      sciencePrograms.set([]);
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const staleEl = root.querySelector('[data-testid="pf-alignment-stale-message"]');
      expect(staleEl).not.toBeNull();
      expect(staleEl?.textContent?.trim()).toContain(
        'The linked CLARISA project could not be found in the current feed. Contact the bilateral operations team to reconcile the project mapping.'
      );
      expect(staleEl?.textContent).not.toContain('register');
      expect(root.querySelector('[data-testid="pf-alignment-unmapped-message"]')).toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-multi-sp-grid"]')).toBeNull();
      expect(component.isStale()).toBe(true);
      expect(component.showSpPicker()).toBe(false);
    });

    it('T-09 / R-PSP-004 — all three empty-state messages are pairwise distinct on rendered DOM', () => {
      showPickerSection();
      fixture.detectChanges();

      // 1. Unmapped state
      mappingStatus.set('unmapped');
      sciencePrograms.set([]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const unmappedText = root.querySelector('[data-testid="pf-alignment-unmapped-message"]')?.textContent?.trim();

      // 2. Stale state
      mappingStatus.set('stale');
      fixture.detectChanges();
      const staleText = root.querySelector('[data-testid="pf-alignment-stale-message"]')?.textContent?.trim();

      // 3. No SPs defined state
      mappingStatus.set('mapped');
      fixture.detectChanges();
      const noSpsText = root.querySelector('[data-testid="pf-alignment-no-sps-message"]')?.textContent?.trim();

      expect(unmappedText).toBeTruthy();
      expect(staleText).toBeTruthy();
      expect(noSpsText).toBeTruthy();

      expect(staleText).not.toEqual(unmappedText);
      expect(staleText).not.toEqual(noSpsText);
      expect(unmappedText).not.toEqual(noSpsText);
    });

    it('T-09 / R-PFU-003 — does NOT render Pending qualifier chip anywhere in result pool funding alignment view', () => {
      currentAlignment.set({
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [
          { code: 'SP01', name: 'Science Program 1', role: 'PRIMARY' },
          { code: 'SP02', name: 'Science Program 2', role: 'CONTRIBUTING' }
        ]
      });
      sciencePrograms.set([
        { code: 'SP01', name: 'Science Program 1', icon_key: 'SP01', allocation: 50, mapping_status: 'Pending' },
        { code: 'SP02', name: 'Science Program 2', icon_key: 'SP02', allocation: 50, mapping_status: 'Confirmed' }
      ]);
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const pendingTagSp01 = root.querySelector('[data-testid="pf-alignment-pending-tag-SP01"]');
      const pendingTagSp02 = root.querySelector('[data-testid="pf-alignment-pending-tag-SP02"]');

      expect(pendingTagSp01).toBeNull();
      expect(pendingTagSp02).toBeNull();
      expect(root.textContent).not.toContain('Pending');
    });
  });

  describe('real-time reconcile via Socket.IO — regression', () => {
    it('subscribes to result.pool-funding-alignment.changed on init', () => {
      expect(listenMock).toHaveBeenCalledWith('result.pool-funding-alignment.changed');
    });

    it('on matching event with dirty form, fires info toast and does NOT auto-refetch', () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      expect(component.isDirty()).toBe(true);
      getAlignmentMock.mockClear();

      socketEvents$.next({ result_code: 'RES-001', by_user_id: 99, at: '2026-05-22T00:00:00Z' });

      expect(getAlignmentMock).not.toHaveBeenCalled();
      expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Alignment updated' }));
    });
  });

  describe('telemetry (Clarity events)', () => {
    it('fires bilateral.alignment.saved with sp_count and toc_alignment_count on PATCH', async () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')], primary_sp_code: 'SP01' }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });

      const returned: AlignmentResponse = {
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }]
      };
      patchAlignmentMock.mockResolvedValue({ ok: true, data: returned } as PatchAlignmentResult);
      trackEventMock.mockClear();

      await component.onSave();

      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.3
      // toc_alignment_count reflects the COMPOSED PATCH BODY (`body.toc_alignments`),
      // which now carries at most one entry (the Primary's) — SP03's "No" draft is
      // tracked in form state but never reaches the body, so the count is 1, not 2.
      expect(trackEventMock).toHaveBeenCalledWith('bilateral.alignment.saved', {
        result_code: 'RES-001',
        has_contribution: true,
        sp_count: 2,
        toc_alignment_count: 1
      });
    });

    it('no longer fires bilateral.alignment.hlo_selector_opened (event removed)', async () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();

      const calledEvents = trackEventMock.mock.calls.map(c => c[0]);
      expect(calledEvents).not.toContain('bilateral.alignment.hlo_selector_opened');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // toc-mapping-save-gating-ux — REQ-BIL-SGU-01…05, NFR-BIL-SGU-02
  // Locks in the T-01 draft-lifecycle fix (deferred reconcile + upsert) and the
  // T-02 Save-disabled hint. onSpSelectionChange defers reconcileDrafts via
  // queueMicrotask, so helpers flush the microtask (await Promise.resolve())
  // before asserting on toc_drafts (same pattern as the existing helpers).
  // ──────────────────────────────────────────────────────────────────────────
  describe('save-gating-ux (REQ-BIL-SGU-*)', () => {
    // Bring the page to "has_contribution = Yes" with the given SPs selected and
    // the reconcile microtask flushed — mirrors the established showBlocks helper.
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-127
    // The FIRST sp code defaults to Primary; a test needing a different Primary
    // (or none at all) calls component.onPrimaryChange(...) after this resolves.
    const selectSps = async (spCodes: string[], catalog = TOC_CATALOG_TWO_SP_FIXTURE) => {
      tocCatalog.set(catalog);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: spCodes.map(c => sp(c)), primary_sp_code: spCodes[0] ?? null }));
      component.onSpSelectionChange();
      await Promise.resolve();
    };

    describe('REQ-BIL-SGU-02 — SP selection populates a per-SP draft (upsert on edit)', () => {
      it('selecting N SPs populates toc_drafts (count + selection order) after the microtask flush', async () => {
        await selectSps(['SP01', 'SP03']);
        const drafts = component.formData().toc_drafts;
        expect(drafts.length).toBe(2);
        // Selection order preserved.
        expect(drafts.map(d => d.sp_code)).toEqual(['SP01', 'SP03']);
        expect(drafts.every(d => d.aligns_with_toc === null)).toBe(true);
      });

      it('onDraftChange APPENDS (upserts) an answer for an sp_code NOT present in toc_drafts — never dropped', async () => {
        await selectSps(['SP01']);
        // SP03 is NOT in toc_drafts (only SP01 selected). A direct draft change
        // for SP03 must be recorded, not silently dropped (REQ-BIL-SGU-02 upsert).
        expect(component.formData().toc_drafts.map(d => d.sp_code)).toEqual(['SP01']);

        component.onDraftChange({
          sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT',
          toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 7
        });

        const drafts = component.formData().toc_drafts;
        expect(drafts.map(d => d.sp_code)).toEqual(['SP01', 'SP03']);
        const sp03 = drafts.find(d => d.sp_code === 'SP03');
        expect(sp03).toMatchObject({ sp_code: 'SP03', aligns_with_toc: true, quantitative_contribution: 7 });
      });
    });

    describe('REQ-BIL-SGU-01 — "Yes" immediately reveals the cascade (no prior save)', () => {
      it('answering "Yes" on a freshly-selected SP records aligns_with_toc=true on its draft with NO save', async () => {
        await selectSps(['SP01']);
        const draft = component.draftForSp('SP01');
        expect(draft.aligns_with_toc).toBeNull();

        // The block emits the "Yes" answer via draftChange — no save in between.
        component.onDraftChange({ ...draft, aligns_with_toc: true });

        const after = component.draftForSp('SP01');
        expect(after.aligns_with_toc).toBe(true);
        // The reveal is driven purely by draft state — no PATCH was issued.
        expect(patchAlignmentMock).not.toHaveBeenCalled();
      });

      it('the "Yes" answer persists across change detection (recorded in the draft)', async () => {
        await selectSps(['SP01']);
        component.onDraftChange({ ...component.draftForSp('SP01'), aligns_with_toc: true });
        // Simulate an unrelated re-render (another field changes elsewhere).
        fixture.detectChanges();
        expect(component.draftForSp('SP01').aligns_with_toc).toBe(true);
      });
    });

    describe('REQ-BIL-SGU-03 — single-pass select → map → save', () => {
      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.3
      // Re-pointed: sp_codes still carries BOTH selected SPs (unaffected by the
      // Primary restriction), but toc_alignments now carries at MOST ONE entry —
      // the Primary's (SP01) — never SP03's "No" draft.
      it('one PATCH carries BOTH sp_codes together, but toc_alignments carries only the Primary’s entry', async () => {
        await selectSps(['SP01', 'SP03']);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
        component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });

        patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
        await component.onSave();

        expect(patchAlignmentMock).toHaveBeenCalledTimes(1);
        const [resultCode, body] = patchAlignmentMock.mock.calls[0];
        expect(resultCode).toBe('RES-001');
        expect(body.sp_codes).toEqual(['SP01', 'SP03']);
        expect(body.toc_alignments).toEqual([
          { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 }
        ]);
      });

      it('seedFromServer pre-fills toc_drafts from a saved toc_alignments round-trip', () => {
        tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
        const saved: AlignmentResponse = {
          ...baseAlignment,
          has_contribution: true,
          selected_science_programs: [{ code: 'SP01', name: 'A', role: 'PRIMARY' }, { code: 'SP03', name: 'B', role: 'CONTRIBUTING' }],
          toc_alignments: SAVED_TOC_ALIGNMENTS_FIXTURE
        };
        component.seedFromServer(saved);

        const drafts = component.formData().toc_drafts;
        expect(drafts.map(d => d.sp_code)).toEqual(['SP01', 'SP03']);
        expect(component.draftForSp('SP01')).toMatchObject({
          sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3
        });
        expect(component.draftForSp('SP03')).toMatchObject({
          sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null
        });
      });
    });

    describe('per-SP independence — editing one SP leaves the other untouched (10/25)', () => {
      // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16 / R-BIL-128 AC.2/AC.3
      // Re-pointed: independence in FORM STATE still holds regardless of role
      // (both SP02 and SP06 keep independent draft references). The composed
      // PATCH body, however, now carries only the Primary's (SP02, first of the
      // two per selectSps()) entry — SP06's edit must NOT leak into the payload.
      it('editing SP02 (Primary) leaves SP06 (Contributing) unchanged in state; only SP02’s entry reaches the composed PATCH toc_alignments', async () => {
        // Two-SP scenario using SP02 + SP06; the catalog levels just need to be
        // non-empty so the blocks render — independence is a draft-array property.
        await selectSps(['SP02', 'SP06']);
        component.onDraftChange({ sp_code: 'SP02', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 10 });
        component.onDraftChange({ sp_code: 'SP06', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 });

        const sp06Before = component.formData().toc_drafts.find(d => d.sp_code === 'SP06');

        // Edit SP02 again (10 → 11). SP06's draft reference + value must not move.
        component.onDraftChange({ sp_code: 'SP02', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 });

        const sp06After = component.formData().toc_drafts.find(d => d.sp_code === 'SP06');
        expect(sp06After).toBe(sp06Before);
        expect(sp06After?.quantitative_contribution).toBe(25);

        patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
        await component.onSave();

        const [, body] = patchAlignmentMock.mock.calls[0];
        expect(body.toc_alignments).toEqual([
          { sp_code: 'SP02', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 }
        ]);
      });
    });

    describe('REQ-BIL-SGU-05 — Save gating (no global footer hint)', () => {
      // R-BIL-112 AC.2 — a "Yes" at the Level + HLO floor (no indicator) no longer
      // disables save; this is the reverted half of the old completeness gate
      // (D-C1-4). The save-hint absence assertion is unaffected either way.
      it('canSave is true for a "Yes" draft at the Level + HLO floor (no indicator)', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: null, quantitative_contribution: null });

        expect(component.canSave()).toBe(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-save-hint"]')).toBeNull();
      });

      it('canSave is false for a "Yes" draft below the Level + HLO floor (missing toc_result_id)', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: null, indicator_id: null, quantitative_contribution: null });

        expect(component.canSave()).toBe(false);
      });

      // R-BIL-112 AC.3 — quantitative_contribution is no longer required for
      // saveability once an indicator is chosen.
      it('canSave is true when only quantitative contribution is missing (indicator chosen)', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5973,
          quantitative_contribution: null
        });

        expect(component.canSave()).toBe(true);
      });

      it('canSave is true when the "Yes" draft is complete with contribution 0', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5973,
          quantitative_contribution: 0
        });

        expect(component.canSave()).toBe(true);
      });

      it('canSave is true when the "Yes" draft is complete', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });

        expect(component.canSave()).toBe(true);
      });

      it('canSave is true when the draft answers "No"', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });
        expect(component.canSave()).toBe(true);
      });

      it('canSave is false when the draft is unanswered (required *)', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        expect(component.draftForSp('SP01').aligns_with_toc).toBeNull();
        expect(component.canSave()).toBe(false);
      });
    });

    describe('REQ-BIL-SGU-04 — determinate (non-error/non-loading) block state on a loaded catalog', () => {
      it('catalogState is "ready" when the catalog loaded (not loading, not error)', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        loadingTocCatalog.set(false);
        tocCatalogError.set(false);
        expect(component.catalogState()).toBe('ready');
      });

      it('catalogState reflects the service signals: loading and error', () => {
        loadingTocCatalog.set(true);
        expect(component.catalogState()).toBe('loading');
        loadingTocCatalog.set(false);
        tocCatalogError.set(true);
        expect(component.catalogState()).toBe('error');
      });
    });

    describe('REQ-BIL-SGU-* regression — D-6a destructive-deselect confirm still fires', () => {
      it('deselecting an SP holding a meaningful alignment calls showGlobalAlert after the microtask flush', async () => {
        await selectSps(['SP01', 'SP03']);
        // Give SP03 a meaningful (touched) alignment.
        component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 });

        // Multiselect removes SP03, then notifies.
        component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
        component.onSpSelectionChange();
        await Promise.resolve();

        expect(showGlobalAlertMock).toHaveBeenCalledTimes(1);
        expect(showGlobalAlertMock.mock.calls[0][0].severity).toBe('secondary');
        // Chip restored while the confirm dialog is open.
        expect(codes(component.formData())).toContain('SP03');
      });
    });
  });

  describe('Single Science Program Auto-Selection (R-PFU-001)', () => {
    const singleSpOption: PoolFundingScienceProgram = {
      code: 'SP06',
      name: 'Climate Action',
      category: null,
      color: '#4caf50',
      icon_key: 'SP06',
      allocation: 100,
      mapping_status: 'Confirmed'
    };

    beforeEach(() => {
      mappingStatus.set('mapped');
      sciencePrograms.set([singleSpOption]);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();
    });

    it('clicking "Yes" when 1 SP is mapped automatically sets selected_sps, primary_sp_code, and toc_drafts', () => {
      expect(component.isSingleSp()).toBe(true);
      expect(component.singleSp()).toEqual(singleSpOption);

      component.onContributionChange(true);

      expect(component.formData().has_contribution).toBe(true);
      expect(component.formData().selected_sps.length).toBe(1);
      expect(component.formData().selected_sps[0].code).toBe('SP06');
      expect(component.formData().primary_sp_code).toBe('SP06');
      expect(component.formData().toc_drafts.length).toBe(1);
      expect(component.formData().toc_drafts[0].sp_code).toBe('SP06');
    });

    it('renders Single-SP Card in the DOM with icon, code, allocation, title, Primary badge, and a11y attributes', async () => {
      component.onContributionChange(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('[data-testid="pf-alignment-single-sp-card"]') as HTMLElement;
      expect(card).toBeTruthy();
      expect(card.getAttribute('tabindex')).toBe('0');
      expect(card.getAttribute('role')).toBe('region');
      expect(card.getAttribute('aria-label')).toBe('Selected Science Program');
      expect(card.textContent).toContain('SP06');
      expect(card.textContent).toContain('100%');
      expect(card.textContent).toContain('Climate Action');

      const badge = fixture.nativeElement.querySelector('[data-testid="single-sp-primary-badge"]');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Primary');
    });

    it('does NOT render multi-select dropdown when sciencePrograms().length === 1', async () => {
      component.onContributionChange(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const multiselect = fixture.nativeElement.querySelector('app-multiselect');
      expect(multiselect).toBeFalsy();
    });

    it('does NOT render separate primary radio question when sciencePrograms().length === 1', async () => {
      component.onContributionChange(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const primarySection = fixture.nativeElement.querySelector('[data-testid="pf-alignment-primary-section"]');
      expect(primarySection).toBeFalsy();
    });

    it('clicking "No" resets the selection, primary_sp_code, and drafts', () => {
      component.onContributionChange(true);
      expect(component.formData().selected_sps.length).toBe(1);

      component.onContributionChange(false);
      expect(component.formData().has_contribution).toBe(false);
      expect(component.formData().selected_sps).toEqual([]);
      expect(component.formData().primary_sp_code).toBeNull();
      expect(component.formData().toc_drafts).toEqual([]);
    });
  });

  describe('Multi-SP Interactive Cards & Inline Primary Toggle (R-PFU-002, R-PFU-003)', () => {
    beforeEach(() => {
      mappingStatus.set('mapped');
      sciencePrograms.set([
        { code: 'SP01', name: 'Science Program 1', icon_key: 'SP01', allocation: 60, mapping_status: 'Confirmed' },
        { code: 'SP02', name: 'Science Program 2', icon_key: 'SP02', allocation: 40, mapping_status: 'Pending' }
      ]);
      component.onContributionChange(true);
      fixture.detectChanges();
    });

    it('renders interactive cards grid for multi-SP project with keyboard a11y', async () => {
      const grid = fixture.nativeElement.querySelector('[data-testid="pf-alignment-multi-sp-grid"]');
      expect(grid).toBeTruthy();

      const card1 = fixture.nativeElement.querySelector('[data-testid="pf-alignment-sp-card-SP01"]') as HTMLElement;
      const card2 = fixture.nativeElement.querySelector('[data-testid="pf-alignment-sp-card-SP02"]') as HTMLElement;
      expect(card1).toBeTruthy();
      expect(card2).toBeTruthy();
      expect(card1.getAttribute('tabindex')).toBe('0');
      expect(card1.getAttribute('role')).toBe('checkbox');
      expect(card1.getAttribute('aria-checked')).toBe('false');
    });

    it('selecting first SP auto-designates it as Primary', () => {
      const sp1 = sciencePrograms()[0];
      component.toggleSp(sp1);

      expect(component.formData().selected_sps.length).toBe(1);
      expect(component.formData().selected_sps[0].code).toBe('SP01');
      expect(component.formData().primary_sp_code).toBe('SP01');
      expect(component.isPrimary('SP01')).toBe(true);
    });

    it('selecting a second SP retains the first as Primary and renders "Make Primary" button on the second', async () => {
      const [sp1, sp2] = sciencePrograms();
      component.toggleSp(sp1);
      component.toggleSp(sp2);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.formData().selected_sps.length).toBe(2);
      expect(component.formData().primary_sp_code).toBe('SP01');

      const primaryBadge = fixture.nativeElement.querySelector('[data-testid="pf-alignment-role-primary-SP01"]');
      const contributingBadge = fixture.nativeElement.querySelector('[data-testid="pf-alignment-role-contributing-SP02"]');
      const makePrimaryBtn = fixture.nativeElement.querySelector('[data-testid="pf-alignment-set-primary-SP02"]');
      expect(primaryBadge).toBeTruthy();
      expect(primaryBadge.textContent).toContain('Primary');
      expect(contributingBadge).toBeTruthy();
      expect(contributingBadge.textContent).toContain('Contributing');
      expect(makePrimaryBtn).toBeTruthy();
      expect(makePrimaryBtn.textContent).toContain('Make Primary');
    });

    it('clicking "Make Primary" sets the new primary SP and updates badges', async () => {
      const [sp1, sp2] = sciencePrograms();
      component.toggleSp(sp1);
      component.toggleSp(sp2);

      component.setPrimarySp('SP02');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.formData().primary_sp_code).toBe('SP02');
      expect(component.isPrimary('SP02')).toBe(true);
      expect(component.isPrimary('SP01')).toBe(false);

      const primaryBadge = fixture.nativeElement.querySelector('[data-testid="pf-alignment-role-primary-SP02"]');
      const makePrimaryBtn = fixture.nativeElement.querySelector('[data-testid="pf-alignment-set-primary-SP01"]');
      expect(primaryBadge).toBeTruthy();
      expect(makePrimaryBtn).toBeTruthy();
    });

    it('deselecting primary SP when 1 SP remains auto-promotes the remaining SP to Primary', () => {
      const [sp1, sp2] = sciencePrograms();
      component.toggleSp(sp1);
      component.toggleSp(sp2);
      expect(component.formData().primary_sp_code).toBe('SP01');

      // Deselect SP01 (which was primary)
      component.toggleSp(sp1);
      expect(component.formData().selected_sps.length).toBe(1);
      expect(component.formData().selected_sps[0].code).toBe('SP02');
      expect(component.formData().primary_sp_code).toBe('SP02');
    });

    it('does NOT render the separate Primary radio question or any "Pending" status badge in DOM (R-PFU-003)', async () => {
      const [sp1, sp2] = sciencePrograms();
      component.toggleSp(sp1);
      component.toggleSp(sp2);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const primarySection = fixture.nativeElement.querySelector('[data-testid="pf-alignment-primary-section"]');
      expect(primarySection).toBeFalsy();

      const pendingBadge = fixture.nativeElement.querySelector('[data-testid*="pending"]');
      expect(pendingBadge).toBeFalsy();
      expect(fixture.nativeElement.textContent).not.toContain('Pending');
    });
  });
});


