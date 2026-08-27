// @akili-spec changes/profile-simulation — T-09, R-IMP-007, design §2.2/§6, D-imp-9
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { UserSearchStepComponent } from './user-search-step/user-search-step.component';
import { ConfirmStepComponent } from './confirm-step/confirm-step.component';
import { ImpersonationUserRow } from '@interfaces/impersonation.interface';

export type SimulateProfileModalStep = 'search' | 'confirm';

/**
 * Content of the `simulateProfile` modal, rendered inside the shared
 * `app-modal` wrapper (no `p-dialog`, D-imp-9). Hosts the two-step flow:
 * `UserSearchStepComponent` (R-IMP-007) picks a target user, then
 * `ConfirmStepComponent` (R-IMP-008, T-10) confirms the start. `Cancel` on
 * the confirm step emits `back` (mirrors `userSelected`'s "child reports
 * intent, parent decides" shape) — per the mockup there is no third step to
 * return to, so `back` here just closes the whole modal.
 *
 * Focus trap is the wrapper's job (`modal.component.ts`'s `onKeydown`
 * handles `Tab`/`Shift+Tab` only — verified by reading the file, not
 * inferred). The wrapper does NOT implement Escape-to-close, so this
 * component owns it directly via `@HostListener('document:keydown.escape')`
 * (NFR-IMP-005; Reviewer Finding 2, attempt-1 rework). Left to the human
 * HITL check for real-browser contrast/tab-order per T-12.
 */
@Component({
  selector: 'app-simulate-profile-modal',
  standalone: true,
  imports: [UserSearchStepComponent, ConfirmStepComponent],
  templateUrl: './simulate-profile-modal.component.html',
  styleUrl: './simulate-profile-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimulateProfileModalComponent {
  readonly allModals = inject(AllModalsService);

  readonly step = signal<SimulateProfileModalStep>('search');
  readonly selectedUser = signal<ImpersonationUserRow | null>(null);

  /**
   * Advisory 1 (attempt-1 rework): reading `isModalOpen(...).isOpen` inside
   * a plain `effect()` makes the effect depend on the WHOLE `modalConfig`
   * signal (since `isModalOpen` reads `modalConfig()` before indexing), so
   * any write to an UNRELATED modal key — even one that leaves
   * `simulateProfile.isOpen` unchanged — re-runs the effect and bounces the
   * user back to the search step mid-flow. Wrapping the read in `computed()`
   * makes the DOWNSTREAM effect depend only on the resolved boolean, which
   * Angular only propagates as changed when the value itself differs.
   */
  private readonly isOpen = computed(() => this.allModals.isModalOpen('simulateProfile').isOpen);

  constructor() {
    // Reset to the search step only on the false -> true edge — the
    // wrapper keeps this component alive across open/close cycles (D-imp-9
    // hosts it statically in all-modals.component.html), so state from a
    // previous simulation attempt must not leak into the next one, but an
    // already-open modal must not be reset by unrelated re-evaluations.
    let wasOpen = false;
    effect(() => {
      const open = this.isOpen();
      if (open && !wasOpen) {
        this.step.set('search');
        this.selectedUser.set(null);
      }
      wasOpen = open;
    });
  }

  /**
   * Finding 2 (attempt-1 rework): the shared `app-modal` wrapper's
   * `onKeydown` only implements the Tab trap — it never handles Escape. Two
   * doc comments in this task previously claimed otherwise; both are
   * corrected. Bound to `document` (not the modal root) because this
   * component's host element persists across open/close cycles (D-imp-9),
   * so the guard below is what keeps the listener a no-op while closed.
   */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.allModals.isModalOpen('simulateProfile').isOpen) return;
    this.allModals.closeModal('simulateProfile');
  }

  onUserSelected(user: ImpersonationUserRow): void {
    this.selectedUser.set(user);
    this.step.set('confirm');
  }
}
