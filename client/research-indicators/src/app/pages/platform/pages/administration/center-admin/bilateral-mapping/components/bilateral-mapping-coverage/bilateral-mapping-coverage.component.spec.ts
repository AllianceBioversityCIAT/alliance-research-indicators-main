// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-06 / R-CAM-004 AC.4, design.md §6.1, DD-6
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralMappingCoverageComponent } from './bilateral-mapping-coverage.component';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { AutomapperCoverage } from '@interfaces/bilateral/bilateral-project-mapping.interface';

describe('BilateralMappingCoverageComponent', () => {
  let fixture: ComponentFixture<BilateralMappingCoverageComponent>;
  let component: BilateralMappingCoverageComponent;
  let mockService: {
    getCoverage: jest.Mock;
  };

  const sampleCoverage: AutomapperCoverage = {
    reporting_year: 2026,
    mapped: 4,
    pending: 194,
    inactive: 0,
    reachable: 198
  };

  beforeEach(async () => {
    mockService = {
      getCoverage: jest.fn().mockResolvedValue(sampleCoverage)
    };

    await TestBed.configureTestingModule({
      imports: [BilateralMappingCoverageComponent],
      providers: [
        { provide: BilateralMappingService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralMappingCoverageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Hard Requirement 1: Printed denominator string on screen ─────────────

  it('prints the exact denominator statement on screen (R-CAM-004 AC.4 / Hard Requirement 1)', async () => {
    mockService.getCoverage.mockResolvedValue(sampleCoverage);

    fixture.detectChanges(); // ngOnInit -> loadCoverage
    await fixture.whenStable();
    fixture.detectChanges();

    const expectedText = `Coverage 4 / 198 · 2% (eligible CLARISA projects, ${sampleCoverage.reporting_year})`;
    expect(component.denominatorText()).toBe(expectedText);

    const denomEl = fixture.nativeElement.querySelector('[data-testid="coverage-denominator"]');
    expect(denomEl).not.toBeNull();
    expect(denomEl.textContent.trim()).toBe(expectedText);
  });

  // ── Hard Requirement 2: Exactly THREE cards (DD-6) ───────────────────────

  it('renders four coverage cards including the inactive figure (DD-8 / R-APM-009)', async () => {
    mockService.getCoverage.mockResolvedValue(sampleCoverage);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="coverage-card"]');
    expect(cards.length).toBe(4);

    const mappedVal = fixture.nativeElement.querySelector('[data-testid="coverage-mapped-val"]');
    const pendingVal = fixture.nativeElement.querySelector('[data-testid="coverage-pending-val"]');
    const inactiveVal = fixture.nativeElement.querySelector('[data-testid="coverage-inactive-val"]');
    const reachableVal = fixture.nativeElement.querySelector('[data-testid="coverage-reachable-val"]');

    expect(mappedVal.textContent.trim()).toBe('4');
    expect(pendingVal.textContent.trim()).toBe('194');
    expect(inactiveVal.textContent.trim()).toBe('0');
    expect(reachableVal.textContent.trim()).toBe('198');

    const cov = component.coverage()!;
    expect(cov.mapped + cov.pending + cov.inactive).toBe(cov.reachable);
  });

  // ── Hard Requirement 3: Loading shows skeleton, NEVER zero ───────────────

  it('renders skeleton and NEVER renders 0 while loading (Hard Requirement 3)', async () => {
    // Keep in pending loading state
    let resolvePromise: (val: AutomapperCoverage | null) => void = () => {};
    mockService.getCoverage.mockReturnValue(new Promise(resolve => { resolvePromise = resolve; }));

    fixture.detectChanges(); // component is loading: true

    expect(component.loading()).toBe(true);

    const loadingContainer = fixture.nativeElement.querySelector('[data-testid="coverage-loading"]');
    expect(loadingContainer).not.toBeNull();

    const skeletons = fixture.nativeElement.querySelectorAll('[data-testid="coverage-skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);

    // Assert that no numeric "0" or numbers are flashed as card values
    const cardValues = fixture.nativeElement.querySelectorAll('[data-testid="coverage-mapped-val"], [data-testid="coverage-pending-val"], [data-testid="coverage-reachable-val"]');
    expect(cardValues.length).toBe(0);

    // Resolve promise to clean up
    resolvePromise(sampleCoverage);
    await fixture.whenStable();
  });

  // ── Hard Requirement 4: Error state reports unavailability ───────────────

  it('reports unavailability in error state on service failure (Hard Requirement 4)', async () => {
    mockService.getCoverage.mockResolvedValue(null);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);

    const errorEl = fixture.nativeElement.querySelector('[data-testid="coverage-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain('Coverage data is currently unavailable.');

    const retryBtn = fixture.nativeElement.querySelector('[data-testid="coverage-retry-btn"]');
    expect(retryBtn).not.toBeNull();

    // Clicking retry calls loadCoverage again
    mockService.getCoverage.mockResolvedValue(sampleCoverage);
    retryBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.error()).toBe(false);
    expect(component.coverage()).toEqual(sampleCoverage);
  });

  // ── Hard Requirement 5: Empty state explains no eligible projects ────────

  it('explains no eligible projects when reachable is 0 instead of showing 0/0 (Hard Requirement 5)', async () => {
    mockService.getCoverage.mockResolvedValue({
      reporting_year: 2027,
      mapped: 0,
      pending: 0,
      inactive: 0,
      reachable: 0
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.coverage()?.reachable).toBe(0);

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="coverage-empty"]');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl.textContent).toContain('CLARISA has no eligible projects for 2027 yet');

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="coverage-card"]');
    expect(cards.length).toBe(0);
  });

  // ── Hard Requirement F-D: Freshness disclaimer indicator ─────────────────

  it('surfaces the CLARISA cache freshness window (F-D)', async () => {
    mockService.getCoverage.mockResolvedValue(sampleCoverage);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const freshnessEl = fixture.nativeElement.querySelector('[data-testid="coverage-freshness"]');
    expect(freshnessEl).not.toBeNull();
    expect(freshnessEl.textContent).toContain('5-min TTL');
  });

  // ── Auto-map emission output ─────────────────────────────────────────────

  it('emits openAutomapper event when onTriggerAutoMap is called', () => {
    let emitted = false;
    component.openAutomapper.subscribe(() => { emitted = true; });
    component.onTriggerAutoMap();
    expect(emitted).toBe(true);
  });

  // ── R-APM-008: one readiness note per state, after the load transition ──

  describe('R-APM-008 readiness notes', () => {
    function holdCoverage(): { resolve: (value: AutomapperCoverage | null) => void } {
      let resolve: (value: AutomapperCoverage | null) => void = () => {};
      mockService.getCoverage.mockReturnValue(new Promise(r => { resolve = r; }));
      return { resolve: value => resolve(value) };
    }

    it('R-APM-008 — loading shows the skeleton and does not emit a year', async () => {
      const pending = holdCoverage();
      const years: number[] = [];
      component.reportingYear.subscribe(year => years.push(year));

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="coverage-loading"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-readiness"]')).toBeNull();
      expect(years).toEqual([]);

      pending.resolve(sampleCoverage);
      await fixture.whenStable();
    });

    it('R-APM-008 — CLARISA error shows the unavailable message and does not emit a year', async () => {
      const pending = holdCoverage();
      const years: number[] = [];
      component.reportingYear.subscribe(year => years.push(year));

      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-error"]')).toBeNull();

      pending.resolve(null);
      await fixture.whenStable();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="coverage-error"]');
      expect(errorEl).not.toBeNull();
      expect(errorEl.textContent).toContain('Coverage data is currently unavailable.');
      expect(years).toEqual([]);
    });

    it('R-APM-008 — reachable = 0 says CLARISA has no eligible projects for the loaded year', async () => {
      const pending = holdCoverage();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-empty"]')).toBeNull();

      pending.resolve({ reporting_year: 2027, mapped: 0, pending: 0, inactive: 0, reachable: 0 });
      await fixture.whenStable();
      fixture.detectChanges();

      const note = fixture.nativeElement.querySelector('[data-testid="coverage-readiness"]');
      expect(note.textContent.trim()).toBe('CLARISA has no eligible projects for 2027 yet');
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-card"]')).toBeNull();
    });

    it('R-APM-008 — reachable > 0 and mapped = 0 says no mappings yet and names the loaded year', async () => {
      const pending = holdCoverage();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-no-mappings"]')).toBeNull();

      pending.resolve({ reporting_year: 2027, mapped: 0, pending: 3, inactive: 0, reachable: 3 });
      await fixture.whenStable();
      fixture.detectChanges();

      const note = fixture.nativeElement.querySelector('[data-testid="coverage-readiness"]');
      expect(note.textContent.trim()).toBe('No mappings for 2027 yet — run Auto-map');
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-card"]')).toBeNull();
    });

    it('R-APM-008 — normal coverage is labelled with the loaded year and shows the inactive figure', async () => {
      const pending = holdCoverage();
      const years: number[] = [];
      component.reportingYear.subscribe(year => years.push(year));

      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="coverage-denominator"]')).toBeNull();

      const loaded: AutomapperCoverage = {
        reporting_year: 2027,
        mapped: 197,
        pending: 0,
        inactive: 1,
        reachable: 198
      };
      pending.resolve(loaded);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(years).toEqual([2027]);
      const inactiveVal = fixture.nativeElement.querySelector('[data-testid="coverage-inactive-val"]');
      expect(inactiveVal.textContent.trim()).toBe('1');
      const denom = fixture.nativeElement.querySelector('[data-testid="coverage-denominator"]');
      expect(denom.textContent).toContain('2027');
      expect(denom.textContent).not.toContain('phase');
    });
  });
});
