import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import { projectDashboardBarColor } from '@shared/constants/project-dashboard-chart-colors.constants';
import {
  ProjectDashboardChartLayout,
  ProjectDashboardRankedListItem
} from '@interfaces/project-dashboard.interface';

/**
 * Collapsed row cap for ranked lists (R-PDB-002). Exported so the host
 * (`ProjectDashboardComponent`, T-06) can derive `visibleLimit` from the same
 * number rather than a hardcoded literal that can drift (DD-7).
 */
export const COLLAPSED_ITEM_LIMIT = 5;

@Component({
  selector: 'app-project-dashboard-card',
  standalone: true,
  imports: [NgTemplateOutlet, ButtonModule, CustomProgressBarComponent, TooltipModule, TruncatedTextTooltipDirective],
  templateUrl: './project-dashboard-card.component.html',
  host: {
    class: 'block h-full',
    '[class.flex]': "variant() === 'list'",
    '[class.h-full]': "variant() === 'list'",
    '[class.min-h-0]': "variant() === 'list'",
    '[class.w-full]': "variant() === 'list'",
    '[class.min-w-0]': "variant() === 'list'",
    '[class.flex-1]': "variant() === 'list'",
    '[class.flex-col]': "variant() === 'list'"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDashboardCardComponent {
  readonly variant = input<'card' | 'list'>('card');
  readonly title = input('');
  readonly description = input('');
  readonly items = input<readonly ProjectDashboardRankedListItem[]>([]);
  /**
   * Row cap applied to rendering only. `null` (default) renders every item —
   * load-bearing (DD-12): it is what leaves this component purely additive
   * for every existing call site, in particular the geographic card's three
   * `variant="list"` consumers (R-PDB-002 AC.5), which bind no `visibleLimit`
   * and must keep rendering unbounded.
   */
  readonly visibleLimit = input<number | null>(null);
  readonly layout = input<ProjectDashboardChartLayout>('columns');
  readonly largeColumns = input(false);
  readonly barHeightClass = input('h-6');
  readonly itemHeightPx = input<number | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly compact = input(false);
  readonly errorMessage = input('We could not load this data. Please try again.');
  readonly emptyMessage = input('No data available for this project yet.');
  readonly iconClass = input('pi pi-chart-bar');
  readonly notice = input('');
  readonly retry = output<void>();
  /** Emitted when the (T-03) toggle is activated. The card holds no expansion state itself (DD-1r). */
  readonly expandToggled = output<void>();

  /** Slice of `items()` actually rendered — the only thing templates iterate. */
  readonly visibleItems = computed(() => {
    const limit = this.visibleLimit();
    return limit === null ? this.items() : this.items().slice(0, limit);
  });

  /** Whether more items exist beyond the collapsed cap — gates the (T-03) toggle. */
  readonly canExpand = computed(() => this.items().length > COLLAPSED_ITEM_LIMIT);

  /**
   * DD-14 mechanism (ii) — whether the `variant="card"` outlet renders the
   * full list in an out-of-flow overlay instead of in flow. True only when the
   * card is unlimited *and* has more rows than the collapsed cap, i.e. exactly
   * the state the toggle can produce. With `<= COLLAPSED_ITEM_LIMIT` rows an
   * unlimited card keeps its single in-flow render, so R-PDB-002 AC.5 (a card
   * that never binds `visibleLimit` behaves as before this spec) is untouched.
   */
  readonly expandedOverlay = computed(() => this.visibleLimit() === null && this.canExpand());

  /**
   * The slice rendered **in flow** by the `variant="card"` outlet. It is what
   * establishes the card's box, so DD-14 caps it at `COLLAPSED_ITEM_LIMIT`:
   * the in-flow render is then the same size collapsed and expanded, and the
   * expanded rows live in the overlay, which is out of flow. Any numeric
   * `visibleLimit` is still honoured verbatim — the cap only replaces `null`.
   */
  readonly layoutItems = computed(() =>
    this.visibleLimit() === null ? this.items().slice(0, COLLAPSED_ITEM_LIMIT) : this.visibleItems()
  );

  /** Visible label for the (T-03) toggle button — text only, no chart title (that lives in the aria label). */
  readonly toggleLabel = computed(() => (this.visibleLimit() === null ? 'Show less' : 'Show more'));

  /**
   * Accessible name for the (T-03) toggle, including `title()` (NFR-PDB-003) so a screen-reader
   * user hearing four "Show more" buttons — one per ranked card — can tell them apart.
   */
  readonly toggleAriaLabel = computed(() => `${this.toggleLabel()}, ${this.title()}`);

  // Encoding members below deliberately keep reading `items()` (the full list),
  // never `visibleItems()` — see design.md §5.3 / R-PDB-004. `projectDashboardBarColor`
  // paints the `last` colour at `index === total - 1`; a window-scoped total would
  // recolour row 5 the instant row 6 becomes visible.
  readonly maxCount = computed(() => {
    const items = this.items();
    if (!items.length) {
      return 0;
    }
    return Math.max(...items.map(item => item.count), 0);
  });

  readonly totalCount = computed(() => this.items().reduce((sum, item) => sum + item.count, 0));

  fillPercent(count: number): number {
    if (count <= 0) {
      return 0;
    }

    const layout = this.layout();
    if (layout === 'columns' || layout === 'rows-partners') {
      const max = this.maxCount();
      if (max <= 0) {
        return 0;
      }
      return Math.min(100, (count / max) * 100);
    }

    if (layout === 'rows' || layout === 'rows-stacked' || layout === 'rows-stacked-lever') {
      const total = this.totalCount();
      if (total <= 0) {
        return 0;
      }
      return Math.min(100, (count / total) * 100);
    }

    const max = this.maxCount();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (count / max) * 100);
  }

  /**
   * Re-attaches the item type to a `#rankedList` context slice. The Angular
   * template checker types an inline `<ng-template>`'s context variables as
   * `any`, so iterating the raw `rows` variable would silently drop
   * compile-time checking of every `item.*` read in the five layout branches.
   * Identity at runtime — the same array reference is returned, so `@for`'s
   * `track` diffing sees no change.
   */
  rankedRows(rows: readonly ProjectDashboardRankedListItem[]): readonly ProjectDashboardRankedListItem[] {
    return rows;
  }

  linkedResultsLabel(count: number): string {
    return count === 1 ? '1 result' : `${count} results`;
  }

  barColor(index: number): string {
    return projectDashboardBarColor(index, this.items().length);
  }

  partnerBarWidthPercent(count: number): number {
    const max = this.maxCount();
    if (max <= 0 || count <= 0) {
      return 0;
    }
    const available = 94;
    return Math.min(available, (count / max) * available);
  }
}
