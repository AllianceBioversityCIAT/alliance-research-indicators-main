import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndicatorDeepDiveComponent, IndicatorDeepDiveTab } from './indicator-deep-dive.component';
import { GetIndicatorDetailsService } from '@shared/services/get-indicator-details.service';
import { CapacitySharingDetails, ContractIndicatorDetailsReport } from '@shared/interfaces/contract-indicator-details.interface';

interface IndicatorDetailsServiceMock {
  data: WritableSignal<ContractIndicatorDetailsReport | null>;
  loading: WritableSignal<boolean>;
  loadError: WritableSignal<boolean>;
  loadedContractId: WritableSignal<string | null>;
  sectionFailed: jest.Mock;
  load: jest.Mock;
  update: jest.Mock;
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
    })
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

    serviceMock = createServiceMock();

    await TestBed.configureTestingModule({
      imports: [IndicatorDeepDiveComponent],
      providers: [{ provide: GetIndicatorDetailsService, useValue: serviceMock }]
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
});
