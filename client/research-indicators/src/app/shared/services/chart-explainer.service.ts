// @akili-spec changes/chart-explainers
import { Injectable, WritableSignal, signal } from '@angular/core';

/**
 * The seam a `chart-explainer` component instance exposes to this service so it can be
 * force-closed when a different explainer opens (R-CXP-002 "only one open at a time").
 * `returnFocus` mirrors `ChartExplainerComponent.hide()`'s own contract: the service always
 * calls this with `false` (D-CXP-7 — focus follows the user's latest action, not the explainer
 * that just got displaced).
 */
export interface ChartExplainerHost {
  hide(returnFocus: boolean): void;
}

/**
 * Coordinates "only one chart-explainer popover open at a time" across every
 * `chart-explainer.component.ts` instance on the page (R-CXP-002). Deliberately minimal: it
 * tracks a single open instance and nothing else — no queueing, no per-key state.
 */
@Injectable({
  providedIn: 'root'
})
export class ChartExplainerService {
  private readonly openInstance: WritableSignal<ChartExplainerHost | null> = signal(null);

  /**
   * Registers `instance` as the currently open explainer. If a different instance was already
   * open, it is force-hidden first with `returnFocus=false` — the caller (the newly-opened
   * instance) already owns focus via the user's click/keypress that triggered this call.
   */
  open(instance: ChartExplainerHost): void {
    const previous = this.openInstance();
    if (previous && previous !== instance) {
      previous.hide(false);
    }
    this.openInstance.set(instance);
  }

  /** Clears the tracked open instance, but only when it is still `instance` — a stale close from
   * an already-displaced instance must not erase a newer one. */
  close(instance: ChartExplainerHost): void {
    if (this.openInstance() === instance) {
      this.openInstance.set(null);
    }
  }
}
