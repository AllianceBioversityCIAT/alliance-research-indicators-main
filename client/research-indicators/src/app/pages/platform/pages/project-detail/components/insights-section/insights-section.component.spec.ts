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
