// @akili-spec changes/profile-simulation
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { ImpersonationService } from '@services/impersonation.service';
import { ActionsService } from '@services/actions.service';
import { WebsocketService } from '@sockets/websocket.service';

/**
 * R-IMP-009, design §6. 44 px bar rendered inside `AllianceNavbarComponent`
 * above `#navbar` (D-imp-14) — `role="status" aria-live="polite"` — showing
 * the target identity while a simulation is active, and collapsing to a
 * compact "Simulating {name}" variant when `cache.hasSmallScreen()`.
 *
 * Renders nothing while `impersonation.active()` is false: the component is
 * always mounted (it is a permanent child of the navbar, which itself is
 * never re-created across route changes), so a mid-session simulation start
 * must still move the DOM focus to `End simulation` — the `effect` below
 * reacts to `active()` flipping true rather than relying on a one-time
 * `afterNextRender` hook (which would only cover the unlikely case of the
 * app booting with a simulation already restored).
 */
@Component({
  selector: 'app-simulation-banner',
  templateUrl: './simulation-banner.component.html',
  styleUrl: './simulation-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimulationBannerComponent {
  cache = inject(CacheService);
  impersonation = inject(ImpersonationService);
  actions = inject(ActionsService);
  private readonly router = inject(Router);
  // Defensive: WebsocketService depends on ngx-socket-io's `Socket`, which is not
  // provided in every test/host environment (see PoolFundingAlignmentComponent for
  // the same precedent). `configUser` re-run on end is best-effort UX, never a
  // blocker for R-IMP-010's restore.
  private readonly websocket: WebsocketService | null = (() => {
    try {
      const service = inject(WebsocketService);
      return typeof service?.configUser === 'function' ? service : null;
    } catch {
      return null;
    }
  })();

  /** R-IMP-009 a11y clause: first focusable element after the banner mounts. */
  private readonly endButtonRef = viewChild<ElementRef<HTMLButtonElement>>('endButton');

  targetName = computed(() => {
    const user = this.cache.dataCache().user;
    return `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  });

  targetEmail = computed(() => this.cache.dataCache().user?.email ?? '');

  targetRole = computed(() => this.cache.dataCache().user?.roleName ?? '');

  adminName = computed(() => {
    const actor = this.impersonation.actor();
    return actor ? `${actor.first_name ?? ''} ${actor.last_name ?? ''}`.trim() : '';
  });

  startedTime = computed(() => this.formatStartedTime(this.impersonation.session()?.started_at));

  constructor() {
    effect(() => {
      const active = this.impersonation.active();
      const button = this.endButtonRef();
      if (active && button) {
        button.nativeElement.focus();
      }
    });
  }

  /**
   * R-IMP-010 client end flow (design §5 "Client end"): best-effort end,
   * re-run the socket identity, return to `/home`, and confirm with a toast.
   */
  async endSimulation(): Promise<void> {
    const { actor } = await this.impersonation.end('manual');
    if (actor && this.websocket) {
      await this.websocket.configUser(actor.first_name, actor.sec_user_id);
    }
    await this.router.navigate(['/home']);
    this.actions.showToast({
      severity: 'success',
      summary: 'Simulation ended',
      detail: `Simulation ended — you are back as ${actor?.first_name ?? ''}`
    });
  }

  private formatStartedTime(startedAt: string | undefined): string {
    if (!startedAt) return '';
    const date = new Date(startedAt);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}
