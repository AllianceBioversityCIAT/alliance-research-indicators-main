// @akili-spec changes/chart-explainers
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  Signal,
  computed,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { Popover, PopoverModule } from 'primeng/popover';
import { CHART_EXPLAINERS, ChartExplainerKey } from '@shared/constants/chart-explainers.constants';
import { ChartExplainer } from '@shared/interfaces/chart-explainer.interface';
import { ChartExplainerHost, ChartExplainerService } from '@shared/services/chart-explainer.service';

/**
 * Per-key instance counter backing `descriptionId`/`panelId`/`titleId` (D-CXP-5). The same
 * `key` can render in more than one place at once (e.g. two `insights-section` instances) —
 * ids derived only from the key would collide and break `aria-describedby`/`aria-controls`.
 * Module-level (not a class static) so it survives fine across component instances; it is
 * intentionally never reset — a monotonically increasing counter, not a live-instance count.
 */
const instanceCountsByKey = new Map<string, number>();

function nextInstanceIndex(key: string): number {
  const next = (instanceCountsByKey.get(key) ?? 0) + 1;
  instanceCountsByKey.set(key, next);
  return next;
}

/**
 * The "?" chart explainer pattern (design.md §5.1): an accessible-name button that toggles a
 * non-modal `p-popover`, plus an always-rendered sr-only description so the same copy reaches
 * assistive tech without opening anything (R-CXP-003). One component owns this for every chart
 * surface on the dashboard — see design.md §2 for the full architecture.
 *
 * Fail-closed (R-CXP-001 detail): a `key` with no registry entry in `CHART_EXPLAINERS` renders
 * no button at all.
 */
@Component({
  selector: 'app-chart-explainer',
  standalone: true,
  imports: [PopoverModule],
  templateUrl: './chart-explainer.component.html',
  styleUrl: './chart-explainer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartExplainerComponent implements ChartExplainerHost, OnInit {
  readonly key = input.required<ChartExplainerKey>();
  readonly placement = input<'inline' | 'surface'>('inline');

  private readonly explainerService = inject(ChartExplainerService);

  private readonly popoverRef = viewChild<Popover>('explainerPopover');
  private readonly triggerButtonRef = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');

  private readonly isOpenSignal = signal(false);
  readonly isOpen: Signal<boolean> = this.isOpenSignal.asReadonly();

  /** `null` when `key()` has no registry entry — the template's fail-closed gate. */
  readonly explainer = computed<ChartExplainer | null>(() => CHART_EXPLAINERS[this.key()] ?? null);

  // Assigned in ngOnInit, not a field initializer: a required signal input (`key`) is not yet
  // readable at construction time (NG0951) — Angular writes bound input values after the
  // constructor runs but before ngOnInit, which is why the id allocation lives there.
  descriptionId!: string;
  panelId!: string;
  titleId!: string;

  ngOnInit(): void {
    const key = this.key();
    const instanceIndex = nextInstanceIndex(key);
    this.descriptionId = `chx-${key}-${instanceIndex}-desc`;
    this.panelId = `chx-${key}-${instanceIndex}-panel`;
    this.titleId = `chx-${key}-${instanceIndex}-title`;
  }

  /** The always-rendered sr-only description text (R-CXP-003): what + how to read + source,
   * plus the empty hint when the entry has one. */
  readonly srOnlyDescription = computed<string>(() => {
    const entry = this.explainer();
    if (!entry) {
      return '';
    }
    const sentences = [entry.what, entry.howToRead, entry.source];
    if (entry.emptyHint) {
      sentences.push(entry.emptyHint);
    }
    return sentences.join(' ');
  });

  /**
   * Activation handler for the button (design.md §5.1 "Open"). Closed -> registers with the
   * service (so a previously-open explainer elsewhere gets force-hidden) then opens the
   * popover. Open -> closes via the same `hide()` path every other close trigger uses, with
   * focus returned to this button (it is the user's own latest action).
   */
  toggle(event: Event): void {
    if (this.isOpenSignal()) {
      this.hide(true);
      return;
    }

    this.explainerService.open(this);
    this.isOpenSignal.set(true);
    this.popoverRef()?.toggle(event);
  }

  /**
   * Single seam every close path converges on (design.md §5.1 "Close paths"): the service
   * calls this (with `returnFocus=false`) when a different explainer opens; this component's
   * own button-toggle and Escape paths call it (with `returnFocus=true`) before also asking
   * PrimeNG to hide the overlay. Idempotent — closing an already-closed instance is a no-op,
   * which also makes it safe as the backstop for PrimeNG's own outside-click close (see
   * `onPopoverHide`).
   */
  hide(returnFocus: boolean): void {
    if (!this.isOpenSignal()) {
      return;
    }

    this.isOpenSignal.set(false);
    this.explainerService.close(this);
    this.popoverRef()?.hide();

    if (returnFocus) {
      this.triggerButtonRef()?.nativeElement.focus();
    }
  }

  /**
   * Document-level (not host-level): the popover's panel is appended to `body` via
   * `appendTo="body"`, so a listener bound on this component's own host element would never
   * see a keydown that occurred inside the panel — same lesson as the `executiveOverviewReader`
   * FAIL on this branch (project-dashboard.component.ts:1576-1580). Guarded by `isOpenSignal()`
   * so closed instances (there can be many on one dashboard) do nothing on every Escape.
   */
  @HostListener('document:keydown.escape')
  onDocumentEscapeKeydown(): void {
    if (!this.isOpenSignal()) {
      return;
    }
    this.hide(true);
  }

  /**
   * Backstop for closes this component did not itself initiate — PrimeNG's own outside-click
   * dismissal. Routes through the same `hide()` seam so focus-return and service bookkeeping
   * stay in one place; idempotent guard in `hide()` means this never double-fires when the
   * close already happened through the button/Escape path.
   */
  onPopoverHide(): void {
    this.hide(true);
  }
}
