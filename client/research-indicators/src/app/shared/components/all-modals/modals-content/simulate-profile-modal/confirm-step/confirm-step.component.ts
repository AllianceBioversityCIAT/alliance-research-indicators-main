// @akili-spec changes/profile-simulation — T-10, R-IMP-008, design §5 "Client start", §6, §12 D-imp-9/13/18
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { ImpersonationService } from '@services/impersonation.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@services/actions.service';
import { WebsocketService } from '@sockets/websocket.service';
import { ImpersonationUserRow } from '@interfaces/impersonation.interface';

const DEFAULT_START_ERROR = 'Could not start the simulation. Try again.';

/**
 * R-IMP-008 — confirm step of `SimulateProfileModalComponent` (mockup
 * artboard 3). Renders the target summary card and the red "actions affect
 * real data" callout, then submits `POST /impersonation/start`.
 *
 * Design §5 "Client start" step 2 assigns the post-`201` side effects
 * (`impersonation.start`, then `configUser`/`navigate`/toast) to "the
 * calling component" — here, THIS component, since it is the one that
 * invokes the start call. `ImpersonationService` itself stays free of
 * `Router`/`WebsocketService`/`ActionsService` (D-imp-13); this component
 * is the caller that owns those side effects, in the fixed order asserted
 * by the spec: `impersonation.start` -> `closeModal` -> `configUser` ->
 * `navigate` -> toast.
 *
 * `Cancel` emits `back` rather than closing the modal itself, mirroring
 * `UserSearchStepComponent`'s `userSelected` pattern (T-09) — this
 * component reports user intent, the parent decides what "back" means. Per
 * the mockup, Cancel closes the whole modal (no third step to return to),
 * so the parent wires `(back)` to `allModals.closeModal('simulateProfile')`.
 *
 * This component owns no Escape/close listener of its own (that stays
 * `SimulateProfileModalComponent`'s job, T-09). If a close/Escape happens
 * while `start()` is already in flight, the in-flight call is deliberately
 * left to complete rather than cancelled: the server has already created
 * the session row by the time `/start` responds, so abandoning the
 * continuation would leave that session orphaned (no client-side
 * `impersonation.start()` to adopt it) while the row itself lives on.
 */
@Component({
  selector: 'app-confirm-step',
  standalone: true,
  templateUrl: './confirm-step.component.html',
  styleUrl: './confirm-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmStepComponent {
  private readonly api = inject(ApiService);
  private readonly impersonation = inject(ImpersonationService);
  private readonly allModals = inject(AllModalsService);
  private readonly cache = inject(CacheService);
  private readonly actions = inject(ActionsService);
  private readonly websocket = inject(WebsocketService);
  private readonly router = inject(Router);

  readonly user = input.required<ImpersonationUserRow>();
  readonly back = output<void>();

  /** R-IMP-008: while the start call is in flight both buttons are disabled. */
  readonly pending = signal(false);
  readonly errorMessage = signal('');

  readonly targetName = computed(() => `${this.user().first_name} ${this.user().last_name}`.trim());
  readonly adminName = computed(() => {
    const admin = this.cache.dataCache().user;
    return `${admin?.first_name ?? ''} ${admin?.last_name ?? ''}`.trim();
  });
  readonly initials = computed(() => {
    const target = this.user();
    return `${target.first_name?.[0] ?? ''}${target.last_name?.[0] ?? ''}`.toUpperCase();
  });

  /** BUT (R-IMP-008 scenario "Confirm"): Cancel must never call `/start`. */
  cancel(): void {
    if (this.pending()) return;
    this.back.emit();
  }

  /**
   * Verification (tasks.md T-10, KZ-015 failing input): a double-click
   * during pending must still result in exactly one call — the guard below
   * is the seam the spec's mutation test removes to prove the fixture can
   * go red.
   */
  async start(): Promise<void> {
    if (this.pending()) return;
    this.pending.set(true);
    this.errorMessage.set('');

    const target = this.user();
    try {
      const res = await this.api.startImpersonation({ target_user_id: target.sec_user_id });

      if (res?.successfulRequest) {
        this.impersonation.start(res.data);
        this.allModals.closeModal('simulateProfile');
        this.websocket.configUser(target.first_name, target.sec_user_id);
        this.router.navigate(['/home']);
        this.actions.showToast({
          severity: 'success',
          summary: 'Simulation started',
          detail: `You are now viewing STAR as ${this.targetName()}.`
        });
        return;
      }

      // Repo pattern (bilateral.service.ts:137 / user-search-step.component.ts):
      // `ToPromiseService`'s `catchError` only ever populates `errorDetail.description`.
      this.errorMessage.set(res?.errorDetail?.description || res?.description || DEFAULT_START_ERROR);
    } finally {
      // Leader advisory: reset on the SUCCESS path too, not just on error —
      // otherwise a component that outlives the modal close for any reason
      // (e.g. the close is later made conditional) would stay permanently
      // non-reentrant. Harmless here since the modal closes on success, but
      // this keeps `pending` self-correcting regardless of what removes
      // this component from the DOM.
      this.pending.set(false);
    }
  }
}
