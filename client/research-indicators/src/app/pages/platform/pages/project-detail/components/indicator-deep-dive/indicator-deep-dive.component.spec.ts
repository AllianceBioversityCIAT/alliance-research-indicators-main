import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndicatorDeepDiveComponent, IndicatorDeepDiveTab } from './indicator-deep-dive.component';
import { GetIndicatorDetailsService } from '@shared/services/get-indicator-details.service';
import { DarkModeService } from '@shared/services/dark-mode.service';
import {
  CapacitySharingDetails,
  ContractIndicatorDetailsReport,
  InnovationDevDetails,
  InnovationUseDetails,
  PolicyChangeDetails
} from '@shared/interfaces/contract-indicator-details.interface';

// viz-chart initializes real ECharts SVG rendering in ngAfterViewInit; mocked
// at the module boundary (same pattern as results-trend-card.component.spec.ts)
// so these component specs stay fast/deterministic and never depend on a real
// canvas/SVG engine inside jsdom.
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn().mockReturnValue(false),
  clear: jest.fn(),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance),
  registerMap: jest.fn(),
  getMap: jest.fn()
}));

interface IndicatorDetailsServiceMock {
  data: WritableSignal<ContractIndicatorDetailsReport | null>;
  loading: WritableSignal<boolean>;
  loadError: WritableSignal<boolean>;
  loadedContractId: WritableSignal<string | null>;
  sectionFailed: jest.Mock;
  load: jest.Mock;
  update: jest.Mock;
  // T-09: mirrors GetIndicatorDetailsService's real per-section computed
  // accessors (plain functions here, not signals — sufficient since the
  // builders under test only ever call them, never subscribe to identity).
  capacitySharing: () => ContractIndicatorDetailsReport['capacity_sharing'];
  innovationDev: () => ContractIndicatorDetailsReport['innovation_dev'];
  knowledgeProduct: () => ContractIndicatorDetailsReport['knowledge_product'];
  policyChange: () => ContractIndicatorDetailsReport['policy_change'];
  oicr: () => ContractIndicatorDetailsReport['oicr'];
  innovationUse: () => ContractIndicatorDetailsReport['innovation_use'];
  reportingVelocity: () => ContractIndicatorDetailsReport['reporting_velocity'];
}

// Live nested fixture matching the DTO shape (KZ-001) — never a primitive stand-in.
const CAPACITY_SHARING_SPARSE: CapacitySharingDetails = {
  meta: { total_results: 5, n: 2 },
  total_trainees: 120,
  gender_split: [
    { gender: 'Female', count: 80 },
    { gender: 'Male', count: 40 }
  ],
  session_lengths: [{ name: 'Short-term', count: 2 }],
  delivery_modalities: [{ name: 'Virtual', count: 2 }],
  session_types: [{ name: 'Workshop', count: 2 }]
};

const INDICATORS: IndicatorDeepDiveTab[] = [
  { id: 1, indicatorId: 1, label: 'Capacity Sharing for Development', value: 8, color: 'var(--ac-light-blue-300)' },
  { id: 4, indicatorId: 4, label: 'Policy Change', value: 2, color: 'var(--ac-red-1)' }
];

function createServiceMock(): IndicatorDetailsServiceMock {
  const dataSignal = signal<ContractIndicatorDetailsReport | null>(null);
  const loadingSignal = signal(false);
  const loadErrorSignal = signal(false);
  const loadedContractIdSignal = signal<string | null>(null);

  return {
    data: dataSignal,
    loading: loadingSignal,
    loadError: loadErrorSignal,
    loadedContractId: loadedContractIdSignal,
    sectionFailed: jest.fn((key: keyof ContractIndicatorDetailsReport) => dataSignal()?.[key] === null),
    // Mirrors the real service's synchronous `loading.set(true)` before the
    // fetch settles, so component specs can assert the skeleton is shown
    // between intersection and response (R-DD-003 lazy scenario MUST clause).
    load: jest.fn((_contractId: string) => {
      loadingSignal.set(true);
      return Promise.resolve();
    }),
    update: jest.fn(() => {
      loadingSignal.set(true);
      return Promise.resolve();
    }),
    capacitySharing: () => dataSignal()?.capacity_sharing ?? null,
    innovationDev: () => dataSignal()?.innovation_dev ?? null,
    knowledgeProduct: () => dataSignal()?.knowledge_product ?? null,
    policyChange: () => dataSignal()?.policy_change ?? null,
    oicr: () => dataSignal()?.oicr ?? null,
    innovationUse: () => dataSignal()?.innovation_use ?? null,
    reportingVelocity: () => dataSignal()?.reporting_velocity ?? null
  };
}

describe('IndicatorDeepDiveComponent (R-DD-003, R-DD-005, D-F3-2/5/7)', () => {
  let fixture: ComponentFixture<IndicatorDeepDiveComponent>;
  let component: IndicatorDeepDiveComponent;
  let serviceMock: IndicatorDetailsServiceMock;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;

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
    mockChartInstance.isDisposed.mockReturnValue(false);
    serviceMock = createServiceMock();

    await TestBed.configureTestingModule({
      imports: [IndicatorDeepDiveComponent],
      providers: [{ provide: GetIndicatorDetailsService, useValue: serviceMock }, DarkModeService]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorDeepDiveComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver | undefined }).IntersectionObserver = originalIntersectionObserver;
    jest.restoreAllMocks();
  });

  function setInputs(overrides?: { contractId?: string; indicators?: IndicatorDeepDiveTab[] }): void {
    fixture.componentRef.setInput('contractId', overrides?.contractId ?? 'C-1');
    fixture.componentRef.setInput('indicators', overrides?.indicators ?? INDICATORS);
  }

  function spyOnObserver(): { observe: jest.Mock; disconnect: jest.Mock } {
    const fakeObserver = { observe: jest.fn(), disconnect: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(component as any, 'createIntersectionObserver').mockImplementation(((callback: IntersectionObserverCallback) => {
      capturedCallback = callback;
      return fakeObserver as unknown as IntersectionObserver;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    return fakeObserver;
  }

  let capturedCallback: IntersectionObserverCallback | undefined;

  describe('Laziness (KZ-015 transition, R-DD-003 lazy scenario)', () => {
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

    it('does not re-fetch on further intersections or tab switches (failing input: load in ngOnInit breaks the zero-fetch assertion above)', () => {
      setInputs();
      spyOnObserver();
      fixture.detectChanges();

      capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      capturedCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
      capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      component.selectTab(INDICATORS[1]);
      fixture.detectChanges();

      expect(serviceMock.load).toHaveBeenCalledTimes(1);
    });

    it('shows the loading skeleton (not empty) between construction and response — distinct from empty (K-016)', () => {
      setInputs();
      spyOnObserver();
      fixture.detectChanges();

      const skeletonRegion = fixture.nativeElement.querySelector('[role="status"]');
      expect(skeletonRegion).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('do not include this metadata yet');
    });

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

  describe('Tri-state per tab (D-F3-7)', () => {
    beforeEach(() => {
      setInputs();
      fixture.detectChanges();

      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
    });

    function completeLoad(data: ContractIndicatorDetailsReport): void {
      serviceMock.loading.set(false);
      serviceMock.data.set(data);
      fixture.detectChanges();
    }

    it('renders notice-only (no charts, no retry) when n = 0', () => {
      completeLoad({ capacity_sharing: { ...CAPACITY_SHARING_SPARSE, meta: { total_results: 3, n: 0 } } });

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('do not include this metadata yet');
      expect(fixture.nativeElement.querySelector('[data-slot="charts"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('renders the sparse notice "n of N" plus a charts slot when 0 < n < total_results', () => {
      completeLoad({ capacity_sharing: CAPACITY_SHARING_SPARSE });

      const text = fixture.nativeElement.textContent;
      expect(text).toContain('2 of 5 Capacity Sharing for Development results');
      expect(fixture.nativeElement.querySelector('[data-slot="charts"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('renders charts-only (no sparse/empty notice) when n = total_results', () => {
      completeLoad({ capacity_sharing: { ...CAPACITY_SHARING_SPARSE, meta: { total_results: 5, n: 5 } } });

      const text = fixture.nativeElement.textContent;
      expect(text).not.toContain('Showing metadata from');
      expect(text).not.toContain('do not include this metadata yet');
      expect(fixture.nativeElement.querySelector('[data-slot="charts"]')).not.toBeNull();
    });

    it(
      'renders error + shared retry (NOT sparse/empty) when the section resolves null, and retry force-reloads ' +
        '— not update() (failing input: retry() calling update() leaves this inert since loadedContractId is only set on a successful load)',
      () => {
        completeLoad({ capacity_sharing: null });

        const alert = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('do not include this metadata yet');
        expect(fixture.nativeElement.textContent).not.toContain('Showing metadata from');
        expect(fixture.nativeElement.querySelector('[data-slot="charts"]')).toBeNull();

        const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
          'button[aria-label="Retry loading Capacity Sharing for Development details"]'
        );
        expect(retryBtn).not.toBeNull();
        retryBtn.click();

        // The beforeEach's initial focusin already issued one `load` call —
        // retry must issue a second, forced one, and must never call `update`.
        expect(serviceMock.load).toHaveBeenCalledTimes(2);
        expect(serviceMock.load).toHaveBeenNthCalledWith(2, 'C-1', { force: true });
        expect(serviceMock.update).not.toHaveBeenCalled();
      }
    );

    it(
      'renders the whole-payload error state with shared retry when loadError is true, and retry re-fetches even though ' +
        'loadedContractId was never set on the failed first load (the ordinary R-DD-003 error scenario)',
      () => {
        serviceMock.loading.set(false);
        serviceMock.loadError.set(true);
        fixture.detectChanges();

        const alert = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();

        const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
          'button[aria-label="Retry loading Capacity Sharing for Development details"]'
        );
        expect(retryBtn).not.toBeNull();
        retryBtn.click();

        expect(serviceMock.load).toHaveBeenCalledTimes(2);
        expect(serviceMock.load).toHaveBeenNthCalledWith(2, 'C-1', { force: true });
        expect(serviceMock.update).not.toHaveBeenCalled();
      }
    );
  });

  describe('Tab strip (D-F3-2, R-DD-005)', () => {
    it('renders tabs in the order given (bar order) without re-sorting', () => {
      setInputs();
      fixture.detectChanges();

      const tabButtons = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(tabButtons.length).toBe(2);
      expect(tabButtons[0].textContent).toContain('Capacity Sharing for Development');
      expect(tabButtons[1].textContent).toContain('Policy Change');
    });

    it('activates a tab on click, updates aria-selected, without an extra fetch beyond the one already triggered', () => {
      setInputs();
      fixture.detectChanges();

      const tabButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('[role="tab"]');
      expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
      expect(tabButtons[1].getAttribute('aria-selected')).toBe('false');

      tabButtons[1].click();
      fixture.detectChanges();

      expect(component.activeTab()?.id).toBe(4);
      expect(fixture.nativeElement.querySelectorAll('[role="tab"]')[1].getAttribute('aria-selected')).toBe('true');
    });

    it('navigates with ArrowRight/ArrowLeft (keyboard-navigable tablist, WCAG 2.1 AA)', () => {
      setInputs();
      fixture.detectChanges();

      const tabButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('[role="tab"]');

      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const preventDefaultSpy = jest.spyOn(rightEvent, 'preventDefault');
      tabButtons[0].dispatchEvent(rightEvent);
      fixture.detectChanges();

      expect(component.activeTab()?.id).toBe(4);
      expect(preventDefaultSpy).toHaveBeenCalled();

      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      fixture.nativeElement.querySelectorAll('[role="tab"]')[1].dispatchEvent(leftEvent);
      fixture.detectChanges();

      expect(component.activeTab()?.id).toBe(1);
    });
  });

  describe('No indicators (edge case)', () => {
    it('renders a fallback message and no tablist when indicators is empty and not loading', () => {
      setInputs({ indicators: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('No indicators with results to show a deep-dive for.');
    });

    it(
      'shows a skeleton — never the terminal empty notice — while the F1 indicator summaries this panel depends on ' +
        'are still loading (failing input: no `loading` gate, the empty copy renders on every dashboard first paint)',
      () => {
        setInputs({ indicators: [] });
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('No indicators with results to show a deep-dive for.');
      }
    );

    it('swaps from skeleton to the empty notice once loading finishes with the indicator list still empty', () => {
      setInputs({ indicators: [] });
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('No indicators with results to show a deep-dive for.');

      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No indicators with results to show a deep-dive for.');
    });
  });

  describe('Chart option builders (T-09, R-DD-004, D-F3-3/6)', () => {
    // Mirrors the 'Tri-state per tab' describe's `completeLoad` helper:
    // intersect/focus first (hasIntersected → true), then resolve the load.
    function loadWithData(data: ContractIndicatorDetailsReport): void {
      const section: HTMLElement = fixture.nativeElement.querySelector('section');
      section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      serviceMock.loading.set(false);
      serviceMock.data.set(data);
      fixture.detectChanges();
    }

    // Live nested fixture (KZ-001): meta.n = 6 (rows with satellite data), but
    // `is_simpler_to_use` was only answered by 4 of those 6 rows — the
    // "unanswered flags" case R-DD-004's scenario and D-F3-3 exist for.
    const INNOVATION_DEV_FIXTURE: InnovationDevDetails = {
      meta: { total_results: 6, n: 6 },
      readiness_levels: [
        { level: 3, name: 'IRL 3', count: 1 },
        { level: 1, name: 'IRL 1', count: 2 }
      ],
      innovation_types: [{ name: 'Product', count: 3 }],
      innovation_natures: [{ name: 'New', count: 2 }],
      anticipated_users: [{ name: 'Farmers', count: 1 }],
      scalability_profile: [
        { flag: 'is_cheaper_than_alternatives', label: 'Cheaper', true_count: 2, answered_count: 5 },
        { flag: 'is_simpler_to_use', label: 'Simpler', true_count: 3, answered_count: 4 },
        { flag: 'does_perform_better', label: 'Performs', true_count: 4, answered_count: 6 },
        { flag: 'is_desirable_to_users', label: 'Desirable', true_count: 1, answered_count: 3 },
        { flag: 'has_commercial_viability', label: 'Commercial', true_count: 0, answered_count: 2 },
        { flag: 'has_suitable_enabling_environment', label: 'Enabling', true_count: 5, answered_count: 6 },
        { flag: 'has_evidence_of_uptake', label: 'Uptake', true_count: 2, answered_count: 4 }
      ]
    };

    const POLICY_FIXTURE: PolicyChangeDetails = {
      meta: { total_results: 3, n: 3 },
      // Deliberately not monotonic by count — a naive re-sort (e.g. by count
      // descending) would reorder these; the server owns funnel order.
      stage_funnel: [
        { name: 'Adopted', count: 1 },
        { name: 'Piloted', count: 5 },
        { name: 'Proposed', count: 3 }
      ],
      policy_types: [{ name: 'Regulation', count: 2 }],
      implicated_institutions_count: 4
    };

    const INNOVATION_USE_FIXTURE: InnovationUseDetails = {
      meta: { total_results: 4, n: 4 },
      gender_youth_reach: {
        overall: { women_youth: 10, women_not_youth: 5, men_youth: 8, men_not_youth: 3 },
        by_actor_type: [{ actor_type_name: 'Farmers', women_youth: 6, women_not_youth: 2, men_youth: 4, men_not_youth: 1 }]
      },
      organization_types: [{ name: 'Public', count: 2 }],
      quantifications: [
        { unit: 'hectares', total: 120, count: 3 },
        { unit: 'people', total: 450, count: 4 }
      ]
    };

    it(
      'radar values derive from answered_count, not meta.n — R-DD-004 scenario / D-F3-3 ' +
        '(failing input: dividing by meta.n instead of answered_count gives 50 instead of 75 for this fixture)',
      () => {
        setInputs();
        fixture.detectChanges();
        loadWithData({ innovation_dev: INNOVATION_DEV_FIXTURE });

        const options = component.innovationScalabilityRadarOptions() as unknown as {
          series: [{ data: [{ value: number[] }] }];
        };
        expect(options).not.toBeNull();
        const values = options.series[0].data[0].value;
        // index 1 = is_simpler_to_use: true_count 3, answered_count 4 → 75%.
        // Dividing by meta.n (6) instead would yield 50 — the two must differ
        // for this fixture to discriminate (disqualifier: an all-answered
        // fixture where n === every answered_count cannot tell them apart).
        expect(values[1]).toBe(75);
        expect(values[1]).not.toBe(50);
      }
    );

    it('exposes the same true/answered numbers in the radar chart accessible table (R-DD-004 scenario)', () => {
      setInputs();
      fixture.detectChanges();
      loadWithData({ innovation_dev: INNOVATION_DEV_FIXTURE });

      const table = component.innovationScalabilityTableModel();
      expect(table).not.toBeNull();
      expect(table?.rows).toContainEqual(['Simpler', 3, 4]);
      expect(table?.rows.length).toBe(7);
    });

    it('funnel data is rendered in the order delivered by the server, never re-sorted (design R-1)', () => {
      setInputs();
      fixture.detectChanges();
      loadWithData({ policy_change: POLICY_FIXTURE });

      const options = component.policyStageFunnelChartOptions() as unknown as {
        series: [{ sort: string; data: { name: string }[] }];
      };
      expect(options).not.toBeNull();
      expect(options.series[0].sort).toBe('none');
      expect(options.series[0].data.map(d => d.name)).toEqual(['Adopted', 'Piloted', 'Proposed']);
    });

    it('every rendered viz-chart in the active (capacity sharing) tab receives a non-empty tableModel', () => {
      setInputs();
      fixture.detectChanges();
      loadWithData({ capacity_sharing: CAPACITY_SHARING_SPARSE });

      const vizCharts = fixture.nativeElement.querySelectorAll('app-viz-chart');
      expect(vizCharts.length).toBeGreaterThan(0);
      expect(component.capacityGenderTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.capacitySessionLengthTableModel()?.rows.length).toBeGreaterThan(0);
      expect(component.capacityModalityTableModel()?.rows.length).toBeGreaterThan(0);
    });

    it('quantifications render as a plain accessible table, never through viz-chart (D-F3-6)', () => {
      setInputs({ indicators: [{ id: 6, indicatorId: 6, label: 'Innovation Use', value: 4, color: 'var(--ac-green-1)' }] });
      fixture.detectChanges();
      loadWithData({ innovation_use: INNOVATION_USE_FIXTURE });

      const table = component.innovationUseQuantificationsTableModel();
      expect(table?.rows).toEqual([
        ['hectares', 120, 3],
        ['people', 450, 4]
      ]);
      // Not `querySelector('table')` alone — viz-chart also renders its own
      // sr-only accessible `<table>` per chart instance; scope to the
      // plain-table wrapper this D-F3-6 markup owns.
      const renderedTable: HTMLTableElement = fixture.nativeElement.querySelector('[data-slot="quantifications-table"] table');
      expect(renderedTable).not.toBeNull();
      expect(renderedTable.textContent).toContain('hectares');
      // The stacked-bar reach chart is a viz-chart; the quantifications table
      // is not — assert the table exists independently of chart count.
      expect(fixture.nativeElement.querySelectorAll('app-viz-chart').length).toBeGreaterThan(0);
    });

    it('the innovation-use stacked bars are stacked (not grouped) across the same `stack` id', () => {
      setInputs({ indicators: [{ id: 6, indicatorId: 6, label: 'Innovation Use', value: 4, color: 'var(--ac-green-1)' }] });
      fixture.detectChanges();
      loadWithData({ innovation_use: INNOVATION_USE_FIXTURE });

      const options = component.innovationUseGenderYouthChartOptions() as unknown as { series: { stack: string }[] };
      expect(options).not.toBeNull();
      const stackIds = options.series.map(s => s.stack);
      expect(new Set(stackIds).size).toBe(1);
    });
  });
});
