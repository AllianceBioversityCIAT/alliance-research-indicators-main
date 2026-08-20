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
    mapped: 4,
    pending: 194,
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

    const expectedText = 'Coverage 4 / 198 · 2% (eligible CLARISA projects, phase 2026)';
    expect(component.denominatorText()).toBe(expectedText);

    const denomEl = fixture.nativeElement.querySelector('[data-testid="coverage-denominator"]');
    expect(denomEl).not.toBeNull();
    expect(denomEl.textContent.trim()).toBe(expectedText);
  });

  // ── Hard Requirement 2: Exactly THREE cards (DD-6) ───────────────────────

  it('renders EXACTLY three cards and no fourth card (DD-6 / Hard Requirement 2)', async () => {
    mockService.getCoverage.mockResolvedValue(sampleCoverage);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('[data-testid="coverage-card"]');
    expect(cards.length).toBe(3);

    const mappedVal = fixture.nativeElement.querySelector('[data-testid="coverage-mapped-val"]');
    const pendingVal = fixture.nativeElement.querySelector('[data-testid="coverage-pending-val"]');
    const reachableVal = fixture.nativeElement.querySelector('[data-testid="coverage-reachable-val"]');

    expect(mappedVal.textContent.trim()).toBe('4');
    expect(pendingVal.textContent.trim()).toBe('194');
    expect(reachableVal.textContent.trim()).toBe('198');

    // Invariant: mapped + pending === reachable
    expect(component.coverage()!.mapped + component.coverage()!.pending).toBe(component.coverage()!.reachable);
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
    mockService.getCoverage.mockResolvedValue({ mapped: 0, pending: 0, reachable: 0 });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.coverage()?.reachable).toBe(0);

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="coverage-empty"]');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl.textContent).toContain('No eligible CLARISA projects found for phase 2026.');

    // Cards are NOT rendered in empty state
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

  // ── Auto-map button emission ─────────────────────────────────────────────

  it('emits openAutomapper event when Auto-map button is clicked', async () => {
    mockService.getCoverage.mockResolvedValue(sampleCoverage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    let emitted = false;
    component.openAutomapper.subscribe(() => { emitted = true; });

    const automapBtn = fixture.nativeElement.querySelector('[data-testid="trigger-automap-btn"] button');
    expect(automapBtn).not.toBeNull();
    automapBtn.click();

    expect(emitted).toBe(true);
  });
});
