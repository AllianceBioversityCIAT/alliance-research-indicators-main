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
    if (
      draft.level === null ||
      draft.toc_result_id === null ||
      draft.indicator_id === null ||
      draft.quantitative_contribution === null ||
      draft.quantitative_contribution < 0
    ) {
      continue;
    }
    dtos.push({
      sp_code: draft.sp_code,
      aligns_with_toc: true,
      level: draft.level,
      toc_result_id: draft.toc_result_id,
      indicator_id: draft.indicator_id,
      quantitative_contribution: draft.quantitative_contribution
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
      showSectionHeaderActions: () => false
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
      showSectionHeaderActions: () => false
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
            showSectionHeaderActions: () => false
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
          { code: 'SP01', name: 'Breeding for Tomorrow' },
          { code: 'SP02', name: 'Sustainable Farming' }
        ]
      });
      component.seedFromServer(currentAlignment()!);

      expect(component.formData().has_contribution).toBe(true);
      expect(codes(component.formData()).sort()).toEqual(['SP01', 'SP02']);
      expect(component.formData().selected_sps[0]).toMatchObject({ official_code: 'SP01', name: 'Breeding for Tomorrow' });
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
        selected_science_programs: [{ code: 'SP01', name: 'Breeding for Tomorrow' }]
      });
      component.seedFromServer(currentAlignment()!);
    });

    it('flip true → false clears selected_sps and toc_drafts', () => {
      expect(codes(component.formData())).toEqual(['SP01']);
      component.onContributionChange(false);
      expect(component.formData().has_contribution).toBe(false);
      expect(codes(component.formData())).toEqual([]);
      expect(component.formData().toc_drafts).toEqual([]);
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

    it('true when has_contribution=true and ≥1 SP selected and form is dirty', () => {
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        toc_drafts: [component['emptyDraft']('SP01')]
      }));
      expect(component.canSave()).toBe(true);
    });

    it('false when not editable, even with valid dirty form', () => {
      editable.set(false);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      expect(component.canSave()).toBe(false);
    });

    it('false when alignment is read-only, even with valid dirty form', () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: false, is_read_only: true });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      expect(component.canSave()).toBe(false);
    });

    it('false while a rendered "Yes" draft is incomplete (D-9)', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: null, quantitative_contribution: null }]
      }));
      expect(component.canSave()).toBe(false);
    });

    it('true when the rendered "Yes" draft is complete', () => {
      tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      component.onContributionChange(true);
      component.formData.update(f => ({
        ...f,
        selected_sps: [sp('SP01')],
        toc_drafts: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 }]
      }));
      expect(component.canSave()).toBe(true);
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
        showSectionHeaderActions: () => false
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
              showSectionHeaderActions: () => false
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

  describe('per-SP ToC blocks (AC-02.2, AC-03.1)', () => {
    // onSpSelectionChange now defers reconcileDrafts via queueMicrotask
    // (toc-mapping-save-gating-ux T-01), so the helper awaits the microtask flush.
    const showBlocks = async (catalog = TOC_CATALOG_TWO_SP_FIXTURE) => {
      tocCatalog.set(catalog);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
      component.onSpSelectionChange();
      await Promise.resolve();
    };

    it('AC-02.2 — N selected SPs render N blocks in selection order', async () => {
      await showBlocks();
      sciencePrograms.set([
        { code: 'SP01', name: 'A', category: null, color: null, icon_key: 'SP01', allocation: 50 },
        { code: 'SP03', name: 'B', category: null, color: null, icon_key: 'SP03', allocation: 50 }
      ]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const blocks = root.querySelectorAll('app-sp-toc-alignment-block');
      expect(blocks.length).toBe(2);
    });

    it('reconcileDrafts appends one empty draft per selected SP', async () => {
      await showBlocks();
      const drafts = component.formData().toc_drafts;
      expect(drafts.map(d => d.sp_code)).toEqual(['SP01', 'SP03']);
      expect(drafts.every(d => d.aligns_with_toc === null)).toBe(true);
    });

    it('AC-03.1 — editing SP01 draft leaves SP03 draft untouched in state AND in the PATCH body (10/25)', async () => {
      await showBlocks();
      // Configure both SP drafts: SP01 → 10, SP03 → 25.
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 10 });
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 });

      const sp03Before = component.formData().toc_drafts.find(d => d.sp_code === 'SP03');

      // Now edit SP01 again (change contribution to 11).
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 });

      const sp03After = component.formData().toc_drafts.find(d => d.sp_code === 'SP03');
      // SP03 reference + values unchanged (independence in state).
      expect(sp03After).toBe(sp03Before);
      expect(sp03After?.quantitative_contribution).toBe(25);

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();

      const [, body] = patchAlignmentMock.mock.calls[0];
      expect(body.toc_alignments).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 },
        { sp_code: 'SP03', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 }
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

    it('T-BIL-ITG-03 — every rendered block receives the envelope resultType', async () => {
      await showBlocks(); // TWO_SP fixture: result_type 'capacity_sharing'
      fixture.detectChanges();
      const blocks = fixture.debugElement.queryAll(By.directive(SpTocAlignmentBlockComponent));
      expect(blocks.length).toBe(2);
      blocks.forEach(block =>
        expect((block.componentInstance as SpTocAlignmentBlockComponent).resultType()).toBe('capacity_sharing')
      );
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
      expect(alertArg.severity).toBe('delete');
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
        selected_science_programs: [{ code: 'SP01', name: 'A' }],
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
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
        toc_alignments: [{ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 }]
      });
    });

    it('omits toc_alignments when has_contribution=false', async () => {
      currentAlignment.set({ ...baseAlignment, has_contribution: true, selected_science_programs: [{ code: 'SP01', name: 'A' }] });
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
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
        selected_science_programs: [{ code: 'SP01', name: 'A' }, { code: 'SP03', name: 'B' }],
        toc_alignments: SAVED_TOC_ALIGNMENTS_FIXTURE
      });
      component.seedFromServer(currentAlignment()!);

      const sp01 = component.draftForSp('SP01');
      const sp03 = component.draftForSp('SP03');
      expect(sp01).toMatchObject({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      expect(sp03).toMatchObject({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null });
    });
  });

  describe('per-block 400 routing (AC-08.2)', () => {
    const dirtyForm = () => {
      tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
      component.onSpSelectionChange();
      fixture.detectChanges();

      expect(component.showTocBlocks()).toBe(false);
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('app-sp-toc-alignment-block')).toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-hlo-section"]')).toBeNull();

      patchAlignmentMock.mockResolvedValue({ ok: true, data: { ...baseAlignment, has_contribution: true } } as PatchAlignmentResult);
      await component.onSave();
      expect(patchAlignmentMock).toHaveBeenCalledWith('RES-001', { has_contribution: true, sp_codes: ['SP01'] });
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));
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
        selected_science_programs: [{ code: 'SP01', name: 'A' }],
        toc_alignments: [staleSaved]
      });
      component.seedFromServer(currentAlignment()!);
      fixture.detectChanges();

      expect(component.staleSnapshots().length).toBe(1);
      const root: HTMLElement = fixture.nativeElement;
      const staleEl = root.querySelector('[data-testid="pf-alignment-stale-SP01"]') as HTMLElement | null;
      expect(staleEl).not.toBeNull();
      expect(root.querySelector('[data-testid="pf-alignment-stale-tag-SP01"]')).not.toBeNull();
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));

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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01')] }));

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
      component.formData.update(f => ({ ...f, selected_sps: spCodes.map(c => sp(c)) }));
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
      sciencePrograms.set([spOption]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('app-multiselect')).not.toBeNull();
      expect(component.showSpPicker()).toBe(true);
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
      component.formData.update(f => ({ ...f, selected_sps: [sp('SP01'), sp('SP03')] }));
      component.onSpSelectionChange();
      component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 });
      component.onDraftChange({ sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null });

      const returned: AlignmentResponse = {
        ...baseAlignment,
        has_contribution: true,
        selected_science_programs: [{ code: 'SP01', name: 'A' }, { code: 'SP03', name: 'B' }]
      };
      patchAlignmentMock.mockResolvedValue({ ok: true, data: returned } as PatchAlignmentResult);
      trackEventMock.mockClear();

      await component.onSave();

      expect(trackEventMock).toHaveBeenCalledWith('bilateral.alignment.saved', {
        result_code: 'RES-001',
        has_contribution: true,
        sp_count: 2,
        toc_alignment_count: 2
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
    const selectSps = async (spCodes: string[], catalog = TOC_CATALOG_TWO_SP_FIXTURE) => {
      tocCatalog.set(catalog);
      mappingStatus.set('mapped');
      currentAlignment.set({ ...baseAlignment, has_contribution: false });
      component.seedFromServer(currentAlignment()!);
      component.onContributionChange(true);
      component.formData.update(f => ({ ...f, selected_sps: spCodes.map(c => sp(c)) }));
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
      it('one PATCH carries BOTH sp_codes and toc_alignments together', async () => {
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
          { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 },
          { sp_code: 'SP03', aligns_with_toc: false }
        ]);
      });

      it('seedFromServer pre-fills toc_drafts from a saved toc_alignments round-trip', () => {
        tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);
        const saved: AlignmentResponse = {
          ...baseAlignment,
          has_contribution: true,
          selected_science_programs: [{ code: 'SP01', name: 'A' }, { code: 'SP03', name: 'B' }],
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
      it('editing SP02 leaves SP06 unchanged in state AND in the composed PATCH toc_alignments', async () => {
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
          { sp_code: 'SP02', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 11 },
          { sp_code: 'SP06', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 905187, indicator_id: 905973, quantitative_contribution: 25 }
        ]);
      });
    });

    describe('REQ-BIL-SGU-05 — Save gating (no global footer hint)', () => {
      it('canSave is false for an incomplete "Yes" draft', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({ sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: null, quantitative_contribution: null });

        expect(component.canSave()).toBe(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-testid="pf-alignment-save-hint"]')).toBeNull();
      });

      it('canSave is false when only quantitative contribution is missing', async () => {
        await selectSps(['SP01'], TOC_CATALOG_CAPSHARING_FIXTURE);
        component.onDraftChange({
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5973,
          quantitative_contribution: null
        });

        expect(component.canSave()).toBe(false);
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
        expect(showGlobalAlertMock.mock.calls[0][0].severity).toBe('delete');
        // Chip restored while the confirm dialog is open.
        expect(codes(component.formData())).toContain('SP03');
      });
    });
  });
});
