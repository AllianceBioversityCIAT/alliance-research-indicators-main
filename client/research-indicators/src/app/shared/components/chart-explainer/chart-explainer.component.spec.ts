import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartExplainerComponent } from './chart-explainer.component';
import { CHART_EXPLAINERS } from '@shared/constants/chart-explainers.constants';
import { ChartExplainer } from '@shared/interfaces/chart-explainer.interface';

// CHART_EXPLAINERS ships as an intentionally empty skeleton in this task (T-02/T-03 seed the
// real copy) — the fail-closed component reads it directly, so these tests register one
// test-only entry on the exported (runtime-mutable, only `const`-bound) registry object and
// remove it afterwards, rather than mocking the constants module (design.md T-01 note: "choose
// the cleanest, document it").
const TEST_KEY = 'chart-explainer-test-fixture';
const OTHER_TEST_KEY = 'chart-explainer-test-fixture-b';

const TEST_ENTRY: ChartExplainer = {
  title: 'Top test partners',
  what: 'Each bar is one partner institution; its length is how many results name it.',
  howToRead: 'Longer bars mean more results reference that partner.',
  source: 'Counts every non-Rejected result with partner data.',
  derivedFrom: 'test fixture — not a real registry entry'
};

const OTHER_TEST_ENTRY: ChartExplainer = {
  ...TEST_ENTRY,
  title: 'Top test contributing projects'
};

describe('ChartExplainerComponent (R-CXP-002, R-CXP-003 AC.1, NFR-CXP-001)', () => {
  let fixture: ComponentFixture<ChartExplainerComponent>;
  let component: ChartExplainerComponent;

  function getButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('button.chart-explainer__trigger');
  }

  function getPanel(panelId: string): HTMLElement | null {
    return document.body.querySelector(`#${panelId}`);
  }

  beforeEach(async () => {
    (CHART_EXPLAINERS as Record<string, ChartExplainer>)[TEST_KEY] = TEST_ENTRY;
    (CHART_EXPLAINERS as Record<string, ChartExplainer>)[OTHER_TEST_KEY] = OTHER_TEST_ENTRY;

    await TestBed.configureTestingModule({
      imports: [ChartExplainerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChartExplainerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', TEST_KEY);
  });

  afterEach(() => {
    delete (CHART_EXPLAINERS as Record<string, ChartExplainer>)[TEST_KEY];
    delete (CHART_EXPLAINERS as Record<string, ChartExplainer>)[OTHER_TEST_KEY];
    document.body.querySelectorAll('.p-popover').forEach(el => el.remove());
  });

  it('renders no button when the key has no registry entry (fail-closed, R-CXP-001 detail)', () => {
    fixture.componentRef.setInput('key', 'unregistered-key-not-in-registry');
    fixture.detectChanges();
    expect(getButton()).toBeNull();
  });

  it('opens the popover on click: the panel appended to document.body contains the title and all 3 sentences', () => {
    fixture.detectChanges();
    const button = getButton();
    expect(button).toBeTruthy();

    button!.click();
    fixture.detectChanges();

    const panel = getPanel(component.panelId);
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain(TEST_ENTRY.title);
    expect(panel!.textContent).toContain(TEST_ENTRY.what);
    expect(panel!.textContent).toContain(TEST_ENTRY.howToRead);
    expect(panel!.textContent).toContain(TEST_ENTRY.source);
  });

  it('transitions aria-expanded false -> true -> false, and aria-controls is present only while open', () => {
    fixture.detectChanges();
    const button = getButton()!;

    // Arrange the transition (KZ-015): assert the closed starting state first.
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBeNull();

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe(component.panelId);

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBeNull();
  });

  it('Escape closes an open popover and returns focus to the originating button', () => {
    fixture.detectChanges();
    const button = getButton()!;
    document.body.appendChild(fixture.nativeElement);
    const focusSpy = jest.spyOn(button, 'focus');

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('Escape closes even when focus is on document.body, not the button (document-level listener)', () => {
    fixture.detectChanges();
    const button = getButton()!;
    document.body.appendChild(fixture.nativeElement);

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('a second activation of the same button closes it and leaves focus on the button', () => {
    fixture.detectChanges();
    const button = getButton()!;
    document.body.appendChild(fixture.nativeElement);
    const focusSpy = jest.spyOn(button, 'focus');

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('the onHide backstop (PrimeNG outside-click) closes and returns focus (R-CXP-002 AC.5)', () => {
    // This exercises the path this component does NOT itself initiate — no button click, no
    // Escape — the same call PrimeNG's own (onHide) output would make after an outside click.
    fixture.detectChanges();
    const button = getButton()!;
    document.body.appendChild(fixture.nativeElement);
    const focusSpy = jest.spyOn(button, 'focus');

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    component.onPopoverHide();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('the onHide backstop is idempotent: firing again after an already-closed instance does nothing', () => {
    fixture.detectChanges();
    const button = getButton()!;
    document.body.appendChild(fixture.nativeElement);

    button.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);

    button.click(); // closes via the normal button path
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);

    const focusSpy = jest.spyOn(button, 'focus');
    // Simulates PrimeNG's (onHide) firing late/again for a close this component already
    // handled itself — must be a no-op (design.md §5.1: "Idempotent... safe as the backstop").
    component.onPopoverHide();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('does not move focus into the popover panel on open (no auto-focus, R-CXP-002 keyboard scenario)', async () => {
    fixture.detectChanges();
    const button = getButton()!;

    // Arrange the GIVEN from the keyboard-only walkthrough scenario: focus already on the
    // button before activation. jsdom's programmatic click() does not itself move focus, so
    // this must be set explicitly.
    button.focus();
    expect(document.activeElement).toBe(button);

    // Spy on every .focus() call (not just the final document.activeElement) — jsdom's native
    // HTMLButtonElement.click() unconditionally refocuses the clicked button as its own
    // post-dispatch default action, which would mask a same-tick focus-into-panel regression if
    // we only asserted the end state (verified empirically: a component-side call that focuses
    // the panel during open is still overwritten by jsdom's click() by the time this test's
    // assertions run). Recording every call lets this test see a focus attempt on the panel even
    // though jsdom's own behavior later overrides it.
    const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    const panel = getPanel(component.panelId);
    const focusedSomethingInsidePanel = focusSpy.mock.instances.some(instance => !!panel && panel.contains(instance as unknown as Node));
    expect(focusedSomethingInsidePanel).toBe(false);
    expect(document.activeElement).toBe(button);

    focusSpy.mockRestore();
  });

  it("opening a second explainer (fixture B) hides the first (fixture A) WITHOUT focusing A's button", async () => {
    // Two real component fixtures sharing the app-wide ChartExplainerService singleton
    // (providedIn: 'root' -> same TestBed injector), per design.md §7 "two fixtures".
    const fixtureA = fixture;
    const componentA = component;
    fixtureA.detectChanges();
    document.body.appendChild(fixtureA.nativeElement);
    const buttonA = getButton()!;
    const focusSpyA = jest.spyOn(buttonA, 'focus');

    const fixtureB = TestBed.createComponent(ChartExplainerComponent);
    const componentB = fixtureB.componentInstance;
    fixtureB.componentRef.setInput('key', OTHER_TEST_KEY);
    fixtureB.detectChanges();
    document.body.appendChild(fixtureB.nativeElement);
    const buttonB: HTMLButtonElement = fixtureB.nativeElement.querySelector('button.chart-explainer__trigger');

    buttonA.click();
    fixtureA.detectChanges();
    expect(componentA.isOpen()).toBe(true);

    buttonB.click();
    fixtureB.detectChanges();
    fixtureA.detectChanges();

    expect(componentB.isOpen()).toBe(true);
    expect(componentA.isOpen()).toBe(false);
    expect(focusSpyA).not.toHaveBeenCalled();

    // R-CXP-002 AC.4 ("exactly one popover in the DOM"), proved on the DOM itself, not just on
    // component state flags: PrimeNG's overlay teardown (`*ngIf="render"` -> false) runs off its
    // close animation, which needs a stability flush to complete even under NoopAnimations —
    // `whenStable()` on both fixtures lets that settle before counting.
    await fixtureA.whenStable();
    await fixtureB.whenStable();
    fixtureA.detectChanges();
    fixtureB.detectChanges();

    const openRegions = document.body.querySelectorAll('[role="region"]');
    expect(openRegions.length).toBe(1);
    expect(openRegions[0].id).toBe(componentB.panelId);

    fixtureB.nativeElement.remove();
  });
});
