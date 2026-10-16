// @akili-spec changes/profile-simulation — T-09, R-IMP-007, design §6
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, filter } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '@shared/services/api.service';
import { ImpersonationUserRow } from '@interfaces/impersonation.interface';

/** R-IMP-007: fewer than 3 chars never issues a request (AC.2). */
const MIN_QUERY_LENGTH = 3;
/** R-IMP-007 / verification: 300 ms debounce before a search request fires. */
const SEARCH_DEBOUNCE_MS = 300;
/** Results are capped for display at 20 matches (advisory, attempt-1 rework). */
const MATCHES_DISPLAY_CAP = 20;

export type UserSearchStepStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

const BLOCKED_REASON_LABEL: Record<NonNullable<ImpersonationUserRow['blocked_reason']>, string> = {
  system_admin: 'Other System Admins cannot be simulated.',
  inactive: 'Inactive accounts cannot be simulated.',
  self: 'You cannot simulate yourself.'
};

const DEFAULT_BLOCKED_REASON = 'This account cannot be simulated.';
const DEFAULT_SEARCH_ERROR = 'Could not load users. Try again.';

/**
 * R-IMP-007 — user search step of `SimulateProfileModalComponent`. Owns the
 * six UI states (idle / loading / results / blocked-rows / empty / error)
 * and emits the chosen row via `userSelected` for the parent to advance to
 * the confirm step (T-10). The shared `app-modal` wrapper supplies the Tab
 * trap only (`modal.component.ts`'s `onKeydown`); Escape-to-close is
 * handled by the parent `SimulateProfileModalComponent`, not here and not
 * by the wrapper (Reviewer Finding 2, attempt-1 rework corrected this doc
 * comment — the wrapper never implemented Escape) — this component still
 * owns no dialog chrome of its own.
 */
@Component({
  selector: 'app-user-search-step',
  standalone: true,
  imports: [SkeletonModule, TooltipModule],
  templateUrl: './user-search-step.component.html',
  styleUrl: './user-search-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSearchStepComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<void>();
  /** Advisory 3: monotonic token so a slow, superseded response can never overwrite a newer one. */
  private requestId = 0;

  readonly userSelected = output<ImpersonationUserRow>();

  readonly query = signal('');
  readonly status = signal<UserSearchStepStatus>('idle');
  readonly results = signal<ImpersonationUserRow[]>([]);
  readonly errorMessage = signal('');

  /** Advisory 4: results are capped for display — exactly 20+ rows renders "20+ matches". */
  readonly matchesLabel = computed(() => {
    const n = this.results().length;
    return n >= MATCHES_DISPLAY_CAP ? `${MATCHES_DISPLAY_CAP}+ matches` : `${n} matches`;
  });

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        // Advisory 2: re-check the CURRENT query at the moment the debounce
        // fires, not the value captured when the emission was scheduled —
        // backspacing below the 3-char threshold within the debounce
        // window must drop the pending emission instead of firing a stale
        // request for text the user no longer has typed.
        filter(() => this.query().trim().length >= MIN_QUERY_LENGTH),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        void this.runSearch(this.query().trim());
      });
  }

  onInput(value: string): void {
    this.query.set(value);
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      // AC.2: never issue a request under 3 chars — cancel any pending
      // debounced emission by simply not pushing to the subject. (The
      // `filter` above is the second line of defense for a debounce that
      // was already scheduled before this backspace.)
      this.status.set('idle');
      this.results.set([]);
      return;
    }
    this.searchSubject.next();
  }

  retry(): void {
    const trimmed = this.query().trim();
    if (trimmed.length >= MIN_QUERY_LENGTH) {
      void this.runSearch(trimmed);
    }
  }

  select(row: ImpersonationUserRow): void {
    if (!row.simulable) return;
    this.userSelected.emit(row);
  }

  initials(row: ImpersonationUserRow): string {
    return `${row.first_name?.[0] ?? ''}${row.last_name?.[0] ?? ''}`.toUpperCase();
  }

  blockedReason(row: ImpersonationUserRow): string {
    return row.blocked_reason ? (BLOCKED_REASON_LABEL[row.blocked_reason] ?? DEFAULT_BLOCKED_REASON) : DEFAULT_BLOCKED_REASON;
  }

  private async runSearch(term: string): Promise<void> {
    const id = ++this.requestId;
    this.status.set('loading');
    const res = await this.api.searchImpersonationUsers(term);
    // Advisory 3: a newer request (e.g. a double-clicked Retry) may have
    // started and even resolved while this one was still in flight — if
    // this response is no longer the latest, its result must be discarded.
    if (id !== this.requestId) return;
    if (res?.successfulRequest) {
      const rows = res.data ?? [];
      this.results.set(rows);
      this.status.set(rows.length === 0 ? 'empty' : 'results');
    } else {
      // Finding 1: the real pipeline (`ToPromiseService`'s `catchError`)
      // never populates the top-level `description` on failure — only
      // `errorDetail.description` (repo pattern: bilateral.service.ts:137).
      this.errorMessage.set(res?.errorDetail?.description || res?.description || DEFAULT_SEARCH_ERROR);
      this.status.set('error');
    }
  }
}
