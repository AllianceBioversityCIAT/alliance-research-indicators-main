import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsightsSectionComponent } from './insights-section.component';
import { GetContractInsightsService } from '@shared/services/get-contract-insights.service';
import { ApiService } from '@shared/services/api.service';
import { environment } from '@envs/environment';
import { ContractInsightsReport, DeclaredSdg } from '@shared/interfaces/contract-insights.interface';

interface ContractInsightsServiceMock {
  data: WritableSignal<ContractInsightsReport | null>;
  loading: WritableSignal<boolean>;
  loadError: WritableSignal<boolean>;
  loadedContractId: WritableSignal<string | null>;
  sectionFailed: jest.Mock;
  load: jest.Mock;
  update: jest.Mock;
  reach: () => ContractInsightsReport['reach'];
  sdgCoverage: () => ContractInsightsReport['sdg_coverage'];
  evidence: () => ContractInsightsReport['evidence'];
  reviewFlow: () => ContractInsightsReport['review_flow'];
  contributingLevers: () => ContractInsightsReport['contributing_levers'];
  keywords: () => ContractInsightsReport['keywords'];
}

function createServiceMock(): ContractInsightsServiceMock {
  const dataSignal = signal<ContractInsightsReport | null>(null);
  const loadingSignal = signal(false);
  const loadErrorSignal = signal(false);
  const loadedContractIdSignal = signal<string | null>(null);

  return {
    data: dataSignal,
    loading: loadingSignal,
    loadError: loadErrorSignal,
    loadedContractId: loadedContractIdSignal,
    sectionFailed: jest.fn((key: keyof ContractInsightsReport) => dataSignal()?.[key] === null),
    // Mirrors the real service's synchronous `loading.set(true)` before the
    // fetch settles, so component specs can assert the skeleton is shown
    // between intersection and response (R-IN-003 lazy scenario).
    load: jest.fn((_contractId: string, _options?: { force?: boolean }) => {
      loadingSignal.set(true);
      return Promise.resolve();
    }),
    update: jest.fn(() => {
      loadingSignal.set(true);
      return Promise.resolve();
    }),
    reach: () => dataSignal()?.reach ?? null,
    sdgCoverage: () => dataSignal()?.sdg_coverage ?? null,
    evidence: () => dataSignal()?.evidence ?? null,
    reviewFlow: () => dataSignal()?.review_flow ?? null,
    contributingLevers: () => dataSignal()?.contributing_levers ?? null,
    keywords: () => dataSignal()?.keywords ?? null
  };
}

// Live-shaped fixtures (KZ-001) matching contract-insights.interface.ts —
// never a primitive stand-in.
const REACH_SPARSE: ContractInsightsReport['reach'] = {
  meta: { total_results: 20, n: 12 },
  overall: { women_youth: 3, women_not_youth: 2, men_youth: 4, men_not_youth: 3, total: 12 },
  by_actor_type: [
    { actor_type_id: 1, actor_type_name: 'Farmers', women_youth: 1, women_not_youth: 1, men_youth: 2, men_not_youth: 1, total: 5 }
  ],
  not_disaggregated_rows: 4
};

const EVIDENCE_SPARSE: ContractInsightsReport['evidence'] = {
  meta: { total_results: 10, n: 5 },
  results_with_evidence: 5,
  evidences_total: 8,
  public_count: 6,
  private_count: 2,
  by_role: [{ evidence_role_id: 1, name: 'Primary', count: 5 }]
};

const REVIEW_FLOW_EMPTY: ContractInsightsReport['review_flow'] = {
  meta: { total_results: 10, n: 0 },
  by_event_type: [],
  by_decision: [],
  cycle_time: { median_days: null, p90_days: null, sample_size: 0 },
  excluded_for_incomplete_history: 0
};

const LEVERS_COMPLETE: ContractInsightsReport['contributing_levers'] = {
  meta: { total_results: 3, n: 3 },
  levers: [{ lever_id: 1, short_name: 'L1', full_name: 'Lever One', count: 3 }]
};

const KEYWORDS_SPARSE: ContractInsightsReport['keywords'] = {
  meta: { total_results: 10, n: 3 },
  keywords: [{ keyword: 'soil health', count: 3 }]
};

function fullReport(overrides?: Partial<ContractInsightsReport>): ContractInsightsReport {
  return {
    reach: REACH_SPARSE,
    sdg_coverage: { meta: { total_results: 10, n: 6 }, sdgs: [] },
    evidence: EVIDENCE_SPARSE,
    review_flow: REVIEW_FLOW_EMPTY,
    contributing_levers: LEVERS_COMPLETE,
    keywords: KEYWORDS_SPARSE,
    ...overrides
  };
}

describe('InsightsSectionComponent (R-IN-003, D-F4-3/4/5)', () => {
  let fixture: ComponentFixture<InsightsSectionComponent>;
  let component: InsightsSectionComponent;
  let serviceMock: ContractInsightsServiceMock;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;
  let capturedCallback: IntersectionObserverCallback | undefined;

  beforeEach(async () => {
    // A real `IntersectionObserver` global lets the component reach its own
    // `createIntersectionObserver` boundary, which individual tests stub
    // (D-F3-5) — jsdom itself has no native IntersectionObserver.
    originalIntersectionObserver = (globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    jest.clearAllMocks();
    serviceMock = createServiceMock();

    await TestBed.configureTestingModule({
      imports: [InsightsSectionComponent],
      providers: [{ provide: GetContractInsightsService, useValue: serviceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(InsightsSectionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver | undefined }).IntersectionObserver = originalIntersectionObserver;
    jest.restoreAllMocks();
  });

  function setInputs(overrides?: { contractId?: string; declaredSdgs?: DeclaredSdg[] }): void {
    fixture.componentRef.setInput('contractId', overrides?.contractId ?? 'C-1');
    fixture.componentRef.setInput('declaredSdgs', overrides?.declaredSdgs ?? []);
  }

  function spyOnObserver(): { observe: jest.Mock; disconnect: jest.Mock } {
    const fakeObserver = { observe: jest.fn(), disconnect: jest.fn() };
    jest.spyOn(component as any, 'createIntersectionObserver').mockImplementation(((callback: IntersectionObserverCallback) => {
      capturedCallback = callback;
      return fakeObserver as unknown as IntersectionObserver;
    }) as any);
    return fakeObserver;
  }

  function completeLoad(data: ContractInsightsReport): void {
    serviceMock.loading.set(false);
    serviceMock.data.set(data);
    fixture.detectChanges();
  }

  describe('Laziness (KZ-015 transition, R-IN-003/R-IN-004 lazy scenario)', () => {
    it('issues zero fetches before intersection — construct below-fold', () => {
      setInputs();
      const fakeObserver = spyOnObserver();

      fixture.detectChanges();

      expect(serviceMock.load).not.toHaveBeenCalled();
      expect(fakeObserver.observe).toHaveBeenCalledTimes(1);
    });

    it('fetches exactly once when the observed element intersects', () => {
      setInputs();
      spyOnObserver();
      fixture.detectChanges();

      capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

      expect(serviceMock.load).toHaveBeenCalledTimes(1);
      expect(serviceMock.load).toHaveBeenCalledWith('C-1');
    });

    it(
      'does not re-fetch on further intersections (failing input: load in ngOnInit breaks the zero-fetch ' +
        'assertion above)',
      () => {
        setInputs();
        spyOnObserver();
        fixture.detectChanges();

        capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
        capturedCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
        capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
        fixture.detectChanges();

        expect(serviceMock.load).toHaveBeenCalledTimes(1);
      }
    );

    it('shows the loading skeleton (not an empty notice) between construction and response (K-016)', () => {
      setInputs();
      spyOnObserver();
      fixture.detectChanges();

      const skeletonRegions = fixture.nativeElement.querySelectorAll('[role="status"]');
      expect(skeletonRegions.length).toBeGreaterThan(0);
      expect(fixture.nativeElement.textContent).not.toContain('report actor-group reach breakdown yet');
    });

    it(
      'keeps the region in the natural tab order BEFORE any load (Reviewer FAIL #1): pre-intersection all six ' +
        'cards render only skeletons with zero focusable descendants, so the keyboard-focus laziness path is ' +
        'unreachable unless the <section> itself carries tabindex="0" (failing input: removing tabindex leaves ' +
        'only the spec\'s synthetic focusin dispatch as proof, which no real keyboard user can produce)',
      () => {
        setInputs();
        spyOnObserver();
        fixture.detectChanges();

        const section: HTMLElement = fixture.nativeElement.querySelector('section');
        expect(section.tabIndex).toBe(0);
        // Confirms the skeleton subtree really has no other focusable
        // descendant to fall back on — the section itself must be reachable.
        expect(section.querySelectorAll('button, a, [tabindex]:not(section), input, select, textarea').length).toBe(0);
      }
    );

    it('triggers the fetch on keyboard focus entering the region, not only intersection', () => {
      setInputs();
      spyOnObserver();
      fixture.detectChanges();

      expect(serviceMock.load).not.toHaveBeenCalled();

      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      expect(serviceMock.load).toHaveBeenCalledTimes(1);

      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(serviceMock.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback when IntersectionObserver is unavailable (declared gap, D-F3-5)', () => {
    beforeEach(() => {
      delete (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    });

    it('loads once on init when IntersectionObserver is absent', () => {
      setInputs();
      fixture.detectChanges();

      expect(serviceMock.load).toHaveBeenCalledTimes(1);
      expect(serviceMock.load).toHaveBeenCalledWith('C-1');
    });
  });

  describe('Whole-load error takes priority over sectionFailed (T-07 Reviewer forward pointer)', () => {
    beforeEach(() => {
      setInputs();
      fixture.detectChanges();
      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
    });

    it(
      'renders the shared error state on every card when loadError is true — data() is null so sectionFailed() ' +
        'would return false for every key (failing input: branching on sectionFailed first renders six empty ' +
        'notices instead of one shared error)',
      () => {
        serviceMock.loading.set(false);
        serviceMock.loadError.set(true);
        fixture.detectChanges();

        const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
        expect(alerts.length).toBe(6);
        expect(fixture.nativeElement.textContent).not.toContain('report actor-group reach breakdown yet');
        expect(fixture.nativeElement.textContent).not.toContain('have evidence recorded yet');
      }
    );
  });

  describe('Tri-state per card (design §5 workflow rule 3)', () => {
    beforeEach(() => {
      setInputs();
      fixture.detectChanges();
      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
    });

    it('renders error + shared retry (not empty/sparse) when a section resolves null, and retry force-reloads', () => {
      completeLoad(fullReport({ reach: null }));

      const reachCard: HTMLElement = fixture.nativeElement.querySelector('[data-card="reach"]');
      expect(reachCard.querySelector('[role="alert"]')).not.toBeNull();
      expect(reachCard.textContent).not.toContain('report actor-group reach breakdown yet');
      expect(reachCard.querySelector('[data-slot="chart-placeholder"]')).toBeNull();

      const retryBtn: HTMLButtonElement = reachCard.querySelector('button[aria-label="Retry loading reach data"]')!;
      expect(retryBtn).not.toBeNull();
      retryBtn.click();

      // beforeEach's focusin already issued one `load`; retry must force a second.
      expect(serviceMock.load).toHaveBeenCalledTimes(2);
      expect(serviceMock.load).toHaveBeenNthCalledWith(2, 'C-1', { force: true });
      expect(serviceMock.update).not.toHaveBeenCalled();
    });

    it('renders notice-only (no chart placeholder) when n = 0', () => {
      completeLoad(fullReport({ review_flow: REVIEW_FLOW_EMPTY }));

      const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="review-flow"]');
      expect(card.textContent).toContain('have review history recorded yet');
      expect(card.querySelector('[data-slot="chart-placeholder"]')).toBeNull();
      expect(card.querySelector('[role="alert"]')).toBeNull();
    });

    it('renders the sparse notice "n of N" plus a chart placeholder when 0 < n < total_results', () => {
      completeLoad(fullReport({ reach: REACH_SPARSE }));

      const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="reach"]');
      expect(card.textContent).toContain('Showing actor-group reach data from 12 of 20 results.');
      expect(card.querySelector('[data-slot="chart-placeholder"][data-chart="reach-stacked-bar"]')).not.toBeNull();
      expect(card.querySelector('[role="alert"]')).toBeNull();
    });

    it('renders content-only (no sparse/empty notice) when n = total_results', () => {
      completeLoad(fullReport({ contributing_levers: LEVERS_COMPLETE }));

      const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="contributing-levers"]');
      expect(card.textContent).not.toContain('Showing contributing lever data from');
      expect(card.textContent).not.toContain('report a contributing lever yet');
      expect(card.querySelector('[data-slot="chart-placeholder"][data-chart="levers-bars"]')).not.toBeNull();
    });

    it('shows the not-disaggregated count as a count separate from the (future) bars — never folded in (R-IN-003 Reach scenario)', () => {
      completeLoad(fullReport({ reach: REACH_SPARSE }));

      const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="reach"]');
      expect(card.textContent).toContain('Not disaggregated');
      const placeholder = card.querySelector('[data-slot="chart-placeholder"]');
      // The not-disaggregated tile lives outside the placeholder container.
      expect(placeholder?.textContent).not.toContain('Not disaggregated');
      expect(component.reachNotDisaggregatedRows()).toBe(4);
    });
  });

  describe('Empty breakdown array with n > 0 (inactive lookup rows, T-01 Reviewer forward pointer)', () => {
    it(
      'renders a sensible notice — never broken chips — when sdg_coverage.n > 0 but sdgs = [] and no SDGs ' +
        'are declared (failing input: naive rendering of an empty chip group would leave no feedback at all)',
      () => {
        setInputs({ declaredSdgs: [] });
        fixture.detectChanges();
        const section: HTMLElement = fixture.nativeElement.querySelector('section');
        section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        fixture.detectChanges();

        completeLoad(fullReport({ sdg_coverage: { meta: { total_results: 10, n: 4 }, sdgs: [] } }));

        const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="sdg-coverage"]');
        expect(card.textContent).toContain('Showing SDG data from 4 of 10 results.');
        expect(card.textContent).toContain('No SDG rows are available to compare for these results.');
        expect(card.textContent).not.toContain('Reported & declared:');
        expect(card.querySelector('[role="alert"]')).toBeNull();
      }
    );
  });

  describe('SDG chip derivation (R-IN-003 SDG comparison scenario, D-F4-4)', () => {
    beforeEach(() => {
      setInputs({
        declaredSdgs: [
          { id: 2, label: 'SDG 2' },
          { id: 13, label: 'SDG 13' }
        ]
      });
      fixture.detectChanges();
      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();

      completeLoad(
        fullReport({
          sdg_coverage: {
            meta: { total_results: 10, n: 6 },
            sdgs: [
              { sdg_id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger', count: 4 },
              { sdg_id: 15, short_name: 'SDG 15', full_name: 'Life on Land', count: 2 }
            ]
          }
        })
      );
    });

    it('derives reported∩declared, declared-only, and reported-only from the declared input and the reported section', () => {
      expect(component.reportedAndDeclaredSdgs().map(s => s.sdg_id)).toEqual([2]);
      expect(component.declaredOnlySdgs().map(s => s.id)).toEqual([13]);
      expect(component.reportedOnlySdgs().map(s => s.sdg_id)).toEqual([15]);
    });

    it('renders each chip group with the reported count on reported chips and no count on declared-only chips', () => {
      const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="sdg-coverage"]');
      expect(card.textContent).toContain('Reported & declared:');
      expect(card.textContent).toContain('SDG 2 (4)');
      expect(card.textContent).toContain('Declared only:');
      expect(card.textContent).toContain('SDG 13');
      expect(card.textContent).not.toContain('SDG 13 (');
      expect(card.textContent).toContain('Reported only:');
      expect(card.textContent).toContain('SDG 15 (2)');
    });

    it('derives the SDG chips without issuing any additional fetch beyond the one lazy Insights load', () => {
      // The declared SDGs come from the F1 hero input, and sdg_coverage is
      // already part of the one Insights payload — the derivation is pure
      // computed state, never a second request (R-IN-003 BUT-clause).
      expect(serviceMock.load).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// tasks.md T-08 bullet 3 (acceptance line, literal): "no additional HTTP
// request for SDGs (assert on the Http mock: only the insights call)". The
// suite above substitutes GetContractInsightsService entirely, so it cannot
// see HTTP at all. This block wires the REAL service + REAL ApiService
// against HttpTestingController — the same pattern as
// get-contract-insights.service.spec.ts — so "only the insights call" is an
// actual Http-mock assertion, not an inference from a mocked `load` spy.
// ---------------------------------------------------------------------------
describe('InsightsSectionComponent — literal Http-mock assertion for the SDG derivation (tasks.md T-08 bullet 3)', () => {
  let fixture: ComponentFixture<InsightsSectionComponent>;
  let httpMock: HttpTestingController;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;

  const insightsUrl = (id: string) => `${environment.mainApiUrl}agresso/contracts/reports/insights?contract-id=${encodeURIComponent(id)}`;

  beforeEach(async () => {
    originalIntersectionObserver = (globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    await TestBed.configureTestingModule({
      imports: [InsightsSectionComponent],
      providers: [ApiService, GetContractInsightsService, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(InsightsSectionComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Throws if any request besides the ones already matched by expectOne()
    // below is still outstanding — the literal "only the insights call" proof.
    httpMock.verify();
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver | undefined }).IntersectionObserver =
      originalIntersectionObserver;
  });

  it('issues exactly one HTTP request for the whole Insights payload — deriving the SDG chips triggers no second request', async () => {
    fixture.componentRef.setInput('contractId', 'C-1');
    fixture.componentRef.setInput('declaredSdgs', [
      { id: 2, label: 'SDG 2' },
      { id: 13, label: 'SDG 13' }
    ] satisfies DeclaredSdg[]);
    fixture.detectChanges();

    // Zero requests before intersection/focus (KZ-015 transition).
    httpMock.expectNone(insightsUrl('C-1'));

    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    const req = httpMock.expectOne(insightsUrl('C-1'));
    expect(req.request.method).toBe('GET');
    req.flush({
      data: {
        reach: null,
        sdg_coverage: {
          meta: { total_results: 10, n: 6 },
          sdgs: [
            { sdg_id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger', count: 4 },
            { sdg_id: 15, short_name: 'SDG 15', full_name: 'Life on Land', count: 2 }
          ]
        },
        evidence: null,
        review_flow: null,
        contributing_levers: null,
        keywords: null
      } satisfies ContractInsightsReport,
      successfulRequest: true
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const card: HTMLElement = fixture.nativeElement.querySelector('[data-card="sdg-coverage"]');
    expect(card.textContent).toContain('SDG 2 (4)');
    expect(card.textContent).toContain('SDG 13');
    expect(card.textContent).not.toContain('SDG 13 (');
    expect(card.textContent).toContain('SDG 15 (2)');

    // No further request is outstanding after the chips render — proven by
    // afterEach's httpMock.verify(), not inferred from a spy call count.
  });
});

// ---------------------------------------------------------------------------
// T-09 — chart option/table builders (R-IN-003 chart forms, KZ-001). Each
// spec reads the builder's OUTPUT options/tableModel object from a
// live-shaped fixture — never a call-sequence assertion.
// ---------------------------------------------------------------------------
describe('InsightsSectionComponent — T-09 chart builders (R-IN-003, KZ-001)', () => {
  let fixture: ComponentFixture<InsightsSectionComponent>;
  let component: InsightsSectionComponent;
  let serviceMock: ContractInsightsServiceMock;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;

  beforeEach(async () => {
    originalIntersectionObserver = (globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    serviceMock = createServiceMock();

    await TestBed.configureTestingModule({
      imports: [InsightsSectionComponent],
      providers: [{ provide: GetContractInsightsService, useValue: serviceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(InsightsSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contractId', 'C-1');
    fixture.componentRef.setInput('declaredSdgs', []);
    fixture.detectChanges();
    // Past intersection so the tri-state content slot (not the skeleton)
    // renders once a fixture calls `load()` below — the builder specs care
    // about mounted DOM, not just the raw computed values.
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
  });

  afterEach(() => {
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver | undefined }).IntersectionObserver = originalIntersectionObserver;
  });

  function load(data: ContractInsightsReport): void {
    serviceMock.loading.set(false);
    serviceMock.data.set(data);
    fixture.detectChanges();
  }

  const REVIEW_FLOW_WITH_DECISIONS: ContractInsightsReport['review_flow'] = {
    meta: { total_results: 10, n: 6 },
    by_event_type: [],
    by_decision: [
      { decision: 'APPROVE', label: 'Approved', count: 4 },
      { decision: 'REJECT', label: 'Rejected', count: 2 }
    ],
    cycle_time: { median_days: null, p90_days: null, sample_size: 0 },
    excluded_for_incomplete_history: 0
  };

  describe('reach-stacked-bar', () => {
    it(
      'never puts not_disaggregated_rows into any series (BUT-clause, failing input: folding it in as a fifth ' +
        'category or adding its value to a series array reddens this — the sentinel 999 must not appear anywhere ' +
        'in the series data, and there must be exactly 2 categories: Overall + the one actor type)',
      () => {
        const reachWithSentinel: ContractInsightsReport['reach'] = {
          ...REACH_SPARSE,
          not_disaggregated_rows: 999
        };
        load(fullReport({ reach: reachWithSentinel }));

        const options = component.reachStackedBarOptions() as unknown as {
          xAxis: { data: string[] };
          series: { data: number[] }[];
        };
        expect(options).not.toBeNull();
        expect(options.xAxis.data).toEqual(['Overall', 'Farmers']);
        expect(options.series.length).toBe(4);
        for (const series of options.series) {
          expect(series.data).not.toContain(999);
        }
      }
    );

    it('exposes the same overall + per-actor-type sums in the accessible table (R-IN-003 Reach card AND-clause)', () => {
      load(fullReport({ reach: REACH_SPARSE }));

      const table = component.reachStackedBarTableModel();
      expect(table).not.toBeNull();
      expect(table?.rows).toEqual([
        ['Overall', 3, 2, 4, 3],
        ['Farmers', 1, 1, 2, 1]
      ]);
    });

    it('returns null options/table when there is no by-actor-type breakdown (guards the html\'s hasRows gate)', () => {
      load(fullReport({ reach: { ...REACH_SPARSE, by_actor_type: [] } }));

      expect(component.reachStackedBarOptions()).toBeNull();
      expect(component.reachStackedBarTableModel()).toBeNull();
    });
  });

  describe('evidence-role-bars', () => {
    it('renders a non-empty tableModel and one bar-series data point per role', () => {
      load(fullReport({ evidence: EVIDENCE_SPARSE }));

      const table = component.evidenceRoleBarTableModel();
      expect(table).not.toBeNull();
      expect(table?.rows).toEqual([['Primary', 5]]);

      const options = component.evidenceRoleBarOptions() as unknown as { series: { data: number[] }[] };
      expect(options.series[0].data).toEqual([5]);
    });
  });

  describe('review-flow-funnel', () => {
    it('renders the label, never the raw decision code (R-IN-002 label MUST)', () => {
      load(fullReport({ review_flow: REVIEW_FLOW_WITH_DECISIONS }));

      const options = component.reviewFlowFunnelOptions() as unknown as {
        series: { data: { name: string }[] }[];
      };
      const names = options.series[0].data.map(d => d.name);
      expect(names).toEqual(['Approved', 'Rejected']);
      expect(names).not.toContain('APPROVE');
      expect(names).not.toContain('REJECT');
    });

    it(
      'is rendered in the order delivered by the server — never re-sorted client-side (design R-1, failing ' +
        'input: sorting by count descending would swap Rejected and Approved for this deliberately non-monotone fixture)',
      () => {
        const outOfCountOrder: ContractInsightsReport['review_flow'] = {
          ...REVIEW_FLOW_WITH_DECISIONS,
          by_decision: [
            { decision: 'REJECT', label: 'Rejected', count: 1 },
            { decision: 'APPROVE', label: 'Approved', count: 9 }
          ]
        };
        load(fullReport({ review_flow: outOfCountOrder }));

        const options = component.reviewFlowFunnelOptions() as unknown as {
          series: { sort: string; data: { name: string }[] }[];
        };
        expect(options.series[0].sort).toBe('none');
        expect(options.series[0].data.map(d => d.name)).toEqual(['Rejected', 'Approved']);
      }
    );
  });

  describe('levers-bars', () => {
    it('renders one bar per lever using short_name, matching the same builder family as F1 rankings', () => {
      load(fullReport({ contributing_levers: LEVERS_COMPLETE }));

      const table = component.leversBarTableModel();
      expect(table?.rows).toEqual([['L1', 3]]);

      const options = component.leversBarOptions() as unknown as { yAxis: { data: string[] } };
      expect(options.yAxis.data).toEqual(['L1']);
    });
  });

  describe('keywords-treemap', () => {
    // Top 30, server-ordered desc by count (R-IN-002) — the builder must
    // carry every item's name/count through untouched.
    const THIRTY_KEYWORDS: { keyword: string; count: number }[] = Array.from({ length: 30 }, (_, i) => ({
      keyword: `keyword-${i}`,
      count: 30 - i
    }));

    it(
      'maps all top-30 items with their counts (failing input: slicing/truncating before mapping, or dropping ' +
        'the count, reddens the length/value assertions below)',
      () => {
        load(fullReport({ keywords: { meta: { total_results: 40, n: 30 }, keywords: THIRTY_KEYWORDS } }));

        const table = component.keywordsTreemapTableModel();
        expect(table?.rows.length).toBe(30);
        expect(table?.rows[0]).toEqual(['keyword-0', 30]);
        expect(table?.rows[29]).toEqual(['keyword-29', 1]);

        const options = component.keywordsTreemapOptions() as unknown as {
          series: { data: { name: string; value: number }[] }[];
        };
        const data = options.series[0].data;
        expect(data.length).toBe(30);
        expect(data.map(d => d.value)).toEqual(THIRTY_KEYWORDS.map(k => k.count));
      }
    );

    it('assigns the deepest ramp bucket to the most frequent keyword and the lightest to the least frequent (sequential ramp, design §6)', () => {
      load(fullReport({ keywords: { meta: { total_results: 40, n: 30 }, keywords: THIRTY_KEYWORDS } }));

      const options = component.keywordsTreemapOptions() as unknown as {
        series: { data: { itemStyle: { color: string } }[] }[];
      };
      const colors = options.series[0].data.map(d => d.itemStyle.color);
      // Fallback var(...) tokens in jsdom (ramp CSS custom properties don't
      // resolve here) — assert the bucket boundary, not a literal hex value.
      expect(colors[0]).toBe('var(--ac-viz-ramp-5)');
      expect(colors[29]).toBe('var(--ac-viz-ramp-1)');
    });

    it('never uses visualMap (T-06 forward pointer: VisualMapComponent is not registered)', () => {
      load(fullReport({ keywords: KEYWORDS_SPARSE }));

      const options = component.keywordsTreemapOptions() as unknown as Record<string, unknown>;
      expect(options['visualMap']).toBeUndefined();
    });

    describe('label contrast reads the ACTUALLY RESOLVED ramp color (theme-aware, not a fixed bucket rule)', () => {
      const RAMP_TOKEN_NAMES = ['--ac-viz-ramp-1', '--ac-viz-ramp-2', '--ac-viz-ramp-3', '--ac-viz-ramp-4', '--ac-viz-ramp-5'];
      let originalRamp: (string | null)[] = [];

      beforeEach(() => {
        // Inline styles on the root ARE resolved by jsdom's getComputedStyle
        // (unlike stylesheet rules, which jsdom does not compute) — this
        // proves the label-color decision reads the real resolved color.
        originalRamp = RAMP_TOKEN_NAMES.map(n => document.documentElement.style.getPropertyValue(n) || null);
        document.documentElement.style.setProperty('--ac-viz-ramp-1', '#ffffff');
        document.documentElement.style.setProperty('--ac-viz-ramp-2', '#dddddd');
        document.documentElement.style.setProperty('--ac-viz-ramp-3', '#999999');
        document.documentElement.style.setProperty('--ac-viz-ramp-4', '#333333');
        document.documentElement.style.setProperty('--ac-viz-ramp-5', '#000000');
      });

      afterEach(() => {
        RAMP_TOKEN_NAMES.forEach((n, i) => {
          const value = originalRamp[i];
          if (value) {
            document.documentElement.style.setProperty(n, value);
          } else {
            document.documentElement.style.removeProperty(n);
          }
        });
      });

      it(
        'pairs the darkest resolved stop with a light label and the lightest resolved stop with a dark label ' +
          '(failing input: a fixed "bucket >= 3 -> white" rule reads the token order, not the actual resolved ' +
          'luminance — tokens:validate independently confirms the ramp inverts direction between themes, so a ' +
          'bucket-index rule would be right in one theme and backwards in the other)',
        () => {
          load(
            fullReport({
              keywords: {
                meta: { total_results: 5, n: 5 },
                keywords: [
                  { keyword: 'a', count: 5 },
                  { keyword: 'b', count: 4 },
                  { keyword: 'c', count: 3 },
                  { keyword: 'd', count: 2 },
                  { keyword: 'e', count: 1 }
                ]
              }
            })
          );

          const options = component.keywordsTreemapOptions() as unknown as {
            series: { data: { itemStyle: { color: string }; label: { color: string } }[] }[];
          };
          const nodes = options.series[0].data;
          // rank 0 (most frequent) -> deepest bucket -> ramp-5 = #000000 (dark)
          expect(nodes[0].itemStyle.color).toBe('#000000');
          expect(nodes[0].label.color).toBe('var(--ac-white-1)');
          // rank 4 (least frequent of the top 5) -> lightest bucket -> ramp-1 = #ffffff
          expect(nodes[4].itemStyle.color).toBe('#ffffff');
          expect(nodes[4].label.color).toBe('var(--ac-grey-900)');
        }
      );
    });
  });

  describe('every mounted viz-chart receives a non-empty tableModel (R-IN-003 tableModel MUST)', () => {
    it('renders at least one app-viz-chart per chart-bearing card when all sections have breakdown rows', () => {
      load(
        fullReport({
          reach: REACH_SPARSE,
          evidence: EVIDENCE_SPARSE,
          review_flow: REVIEW_FLOW_WITH_DECISIONS,
          contributing_levers: LEVERS_COMPLETE,
          keywords: KEYWORDS_SPARSE
        })
      );

      const vizCharts = fixture.nativeElement.querySelectorAll('app-viz-chart');
      expect(vizCharts.length).toBe(5);
      expect(component.reachStackedBarTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.evidenceRoleBarTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.reviewFlowFunnelTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.leversBarTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.keywordsTreemapTableModel()?.rows.length).toBeGreaterThan(0);
    });
  });
});
