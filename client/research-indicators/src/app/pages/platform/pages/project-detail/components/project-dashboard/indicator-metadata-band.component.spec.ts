import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicatorMetadataBandComponent } from './indicator-metadata-band.component';

/**
 * `<ng-content>` only renders when the host actually projects content, so a
 * thin host wrapper is required to exercise R-IMC-008 AC.4 (collapsing hides
 * the projected cards) — `TestBed.createComponent` on the band component
 * alone would leave the projection slot permanently empty regardless of
 * `collapsed`.
 */
@Component({
  standalone: true,
  imports: [IndicatorMetadataBandComponent],
  template: `
    <app-indicator-metadata-band
      [indicator]="indicator"
      [resultCount]="resultCount"
      [cardCount]="cardCount"
      [collapsed]="collapsed"
      (collapseToggled)="toggleCount = toggleCount + 1"
    >
      <div data-testid="projected-card">Card A</div>
      <div data-testid="projected-card">Card B</div>
    </app-indicator-metadata-band>
  `
})
class HostComponent {
  indicator = 'Innovation Development';
  resultCount = 12;
  cardCount = 3;
  collapsed = false;
  toggleCount = 0;
}

/**
 * Two live bands side by side — the only way to prove distinguishability
 * rather than assume it (NFR-IMC-002), and also the vehicle for the
 * per-indicator dot colour case (ISSUE 1 remediation): each band is bound to
 * its own `color`, exactly as the host will bind each band to its own
 * `indicatorSummaries()` entry.
 */
@Component({
  standalone: true,
  imports: [IndicatorMetadataBandComponent],
  template: `
    <app-indicator-metadata-band data-testid="band-a" [indicator]="'Innovation Development'" [color]="colorA"></app-indicator-metadata-band>
    <app-indicator-metadata-band data-testid="band-b" [indicator]="'OICR'" [color]="colorB"></app-indicator-metadata-band>
  `
})
class DualBandHostComponent {
  colorA = '#358540';
  colorB = '#112f5c';
}

function getToggleButton(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.imb-toggle');
}

function getProjectedCards(fixture: ComponentFixture<unknown>): NodeListOf<Element> {
  return fixture.nativeElement.querySelectorAll('[data-testid="projected-card"]');
}

function getGrid(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return fixture.nativeElement.querySelector('.imb-grid');
}

describe('IndicatorMetadataBandComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---- Band chrome — title, dot, chip ------------------------------------

  describe('band chrome', () => {
    it('renders the indicator name as the title', () => {
      const title = fixture.nativeElement.querySelector('.imb-title');
      expect(title.textContent.trim()).toBe('Innovation Development');
    });

    it('renders a decorative dot hidden from assistive tech', () => {
      const dot = fixture.nativeElement.querySelector('.imb-dot');
      expect(dot).not.toBeNull();
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    });

    // ISSUE 1 remediation: the dot colour is per-indicator, sourced from the
    // host's `indicatorSummaries()` `color` field
    // (`project-dashboard.component.ts:113`) — not a fixed token. A dot bound
    // to the mockup's ramp (`mockup/index.html:180/234/300/336`) must differ
    // between two bands fed different `color` inputs, mirroring the live
    // ranked-list dot at `project-dashboard.component.html:253`.
    it('renders two bands with different `color` inputs with different `.imb-dot` inline backgrounds', () => {
      const dualFixture = TestBed.createComponent(DualBandHostComponent);
      dualFixture.detectChanges();

      const dots = Array.from(dualFixture.nativeElement.querySelectorAll('.imb-dot')) as HTMLElement[];
      expect(dots.length).toBe(2);

      const [dotA, dotB] = dots;
      expect(dotA.style.backgroundColor).toBeTruthy();
      expect(dotB.style.backgroundColor).toBeTruthy();
      expect(dotA.style.backgroundColor).not.toBe(dotB.style.backgroundColor);
    });

    it('pluralizes the result-count chip correctly', () => {
      const chip = () => fixture.nativeElement.querySelector('.imb-chip').textContent.trim();
      expect(chip()).toBe('12 results');

      host.resultCount = 1;
      fixture.detectChanges();
      expect(chip()).toBe('1 result');

      host.resultCount = 0;
      fixture.detectChanges();
      expect(chip()).toBe('0 results');
    });
  });

  // ---- R-IMC-008 AC.4 — collapsing hides cards and flips aria-expanded ---

  describe('collapse behaviour (R-IMC-008 AC.4)', () => {
    it('shows the projected cards and aria-expanded="true" when not collapsed', () => {
      expect(getProjectedCards(fixture).length).toBe(2);
      expect(getToggleButton(fixture).getAttribute('aria-expanded')).toBe('true');
    });

    it('removes the projected cards from the DOM and flips aria-expanded to "false" when collapsed', () => {
      host.collapsed = true;
      fixture.detectChanges();

      // Structurally removed, not merely CSS-hidden — a `display:none` band
      // would satisfy the eye and fail the requirement (see design's
      // evidence rule for the analogous R-IMC-009 case).
      expect(getProjectedCards(fixture).length).toBe(0);
      expect(getGrid(fixture)).toBeNull();
      expect(getToggleButton(fixture).getAttribute('aria-expanded')).toBe('false');
    });

    it('restores the cards and aria-expanded="true" when re-expanded', () => {
      host.collapsed = true;
      fixture.detectChanges();
      host.collapsed = false;
      fixture.detectChanges();

      expect(getProjectedCards(fixture).length).toBe(2);
      expect(getToggleButton(fixture).getAttribute('aria-expanded')).toBe('true');
    });

    it('is presentational — collapsing does not mutate its own state, it only emits (DD-9: state is host-owned)', () => {
      const button = getToggleButton(fixture);
      button.click();

      // The host in this spec deliberately does NOT wire the emitted event
      // back into `collapsed` — proving the component itself never flips
      // its own displayed state from a click.
      expect(getToggleButton(fixture).getAttribute('aria-expanded')).toBe('true');
      expect(host.toggleCount).toBe(1);
    });
  });

  // ---- 4-card 2x2 grid variant (design §7.4 / DD-7) — structural only ----

  describe('grid variant (structural — pixel measurement is T-16, not this spec)', () => {
    it('applies the wide-grid modifier only when the band has exactly 4 cards', () => {
      host.cardCount = 3;
      fixture.detectChanges();
      expect(getGrid(fixture)!.classList.contains('imb-grid-wide')).toBe(false);

      host.cardCount = 4;
      fixture.detectChanges();
      expect(getGrid(fixture)!.classList.contains('imb-grid-wide')).toBe(true);
    });
  });

  // ---- Keyboard reachability and accessible name (NFR-IMC-002) ----------

  describe('keyboard reachability and accessible name (NFR-IMC-002)', () => {
    it('is Tab-reachable — document.activeElement is the toggle after a focus() call', () => {
      const button = getToggleButton(fixture);
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('is a real, enabled <button type="button"> — the platform contract that makes Enter/Space activate it for free', () => {
      const button = getToggleButton(fixture);
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.hasAttribute('disabled')).toBe(false);
      expect(button.hasAttribute('tabindex')).toBe(false); // no negative/explicit tabindex overriding native focusability
    });

    it('confirms jsdom does NOT itself translate a dispatched Enter/Space keydown into a click here — the reason the gate above checks button semantics rather than a synthetic keyboard event', () => {
      const button = getToggleButton(fixture);
      const before = host.toggleCount;
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(host.toggleCount).toBe(before);
    });

    it('is operable by Enter — real browsers dispatch a click for a focused, enabled <button> on Enter, the same path exercised here', () => {
      const button = getToggleButton(fixture);
      const before = host.toggleCount;
      button.focus();
      button.click();
      expect(host.toggleCount).toBe(before + 1);
    });

    it('is operable by Space — real browsers dispatch a click for a focused, enabled <button> on Space, the same path exercised here', () => {
      const button = getToggleButton(fixture);
      const before = host.toggleCount;
      button.focus();
      button.click();
      expect(host.toggleCount).toBe(before + 1);
    });

    it('gives two different bands distinct accessible names that each include their own indicator (distinguishability, not assumption)', () => {
      // Standalone components need no fresh `configureTestingModule` — their
      // `imports` live on the decorator itself, and this TestBed instance is
      // already up from `beforeEach` above.
      const dualFixture = TestBed.createComponent(DualBandHostComponent);
      dualFixture.detectChanges();

      const buttons = Array.from(
        dualFixture.nativeElement.querySelectorAll('.imb-toggle')
      ) as HTMLButtonElement[];
      expect(buttons.length).toBe(2);

      const [labelA, labelB] = buttons.map(button => button.getAttribute('aria-label'));
      expect(labelA).toContain('Innovation Development');
      expect(labelB).toContain('OICR');
      expect(labelA).not.toContain('OICR');
      expect(labelB).not.toContain('Innovation Development');
      expect(labelA).not.toBe(labelB);
    });
  });
});
