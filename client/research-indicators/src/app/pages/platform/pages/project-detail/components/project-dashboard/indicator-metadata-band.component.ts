import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Presentational band chrome for the *Indicator metadata* section
 * (R-IMC-008, design §7.3): indicator dot, title, result-count chip,
 * collapse toggle, and a responsive grid for its projected cards.
 *
 * **Band chrome only.** State is owned by the host (DD-9, mirroring Chunk
 * A's in-memory `expanded` signal): this component takes `collapsed` as an
 * input and emits a parameterless `collapseToggled` output — it never flips
 * its own state, and it holds no timers/persistence of its own.
 *
 * Cards are supplied by the host via content projection (`<ng-content>`);
 * this component never imports or renders `ProjectDashboardCardComponent`
 * itself (DD-6 — that component is not modified or wrapped here).
 */
@Component({
  selector: 'app-indicator-metadata-band',
  standalone: true,
  templateUrl: './indicator-metadata-band.component.html',
  styleUrls: ['./indicator-metadata-band.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorMetadataBandComponent {
  /**
   * The band's indicator name (e.g. "Innovation Development"). Required so
   * the toggle's accessible name always includes it — the mechanism that
   * keeps four otherwise-identical toggles distinguishable (NFR-IMC-002).
   */
  readonly indicator = input.required<string>();

  /** Total result count backing the band's chip. */
  readonly resultCount = input<number>(0);

  /**
   * Per-indicator dot colour, sourced by the host from the same
   * `indicatorSummaries()` `color` field the ranked-list dot already uses
   * (`project-dashboard.component.html:253`,
   * `getIndicatorChartColor(indicator, index, indicators.length)`). Data-driven,
   * not a hex literal in component code — an empty string falls back to the
   * SCSS's unbound `--ac-light-blue-300` accent (design §7.6).
   */
  readonly color = input<string>('');

  /**
   * Number of cards this band renders, supplied by the host from its band
   * model — **not** inferred from projected content. Drives the 4-card 2×2
   * grid variant (design §7.4 / DD-7).
   */
  readonly cardCount = input<number>(0);

  /** Collapse state, owned by the host (DD-9). `true` hides the band's cards. */
  readonly collapsed = input<boolean>(false);

  /** Emitted when the toggle is activated. The band holds no expansion state itself. */
  readonly collapseToggled = output<void>();

  /**
   * Grid variant: 4-card bands use the wider `minmax(400px, 1fr)` track so
   * they land 2×2 instead of a 3+1 orphan row (design §7.4, measured — KZ-006).
   */
  readonly isWideGrid = computed(() => this.cardCount() === 4);

  readonly toggleLabel = computed(() => (this.collapsed() ? 'Expand' : 'Collapse'));

  /**
   * Accessible name for the toggle, including the indicator so four
   * otherwise-identical toggles are distinguishable — mirrors Chunk A's
   * `toggleAriaLabel` (NFR-IMC-002).
   */
  readonly toggleAriaLabel = computed(() => `${this.toggleLabel()} ${this.indicator()} band`);

  readonly resultCountLabel = computed(() => {
    const count = this.resultCount();
    return count === 1 ? '1 result' : `${count} results`;
  });

  onToggleClick(): void {
    this.collapseToggled.emit();
  }
}
