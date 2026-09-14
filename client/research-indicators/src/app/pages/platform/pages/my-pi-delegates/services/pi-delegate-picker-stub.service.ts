// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-08)
// DD-UI-STUB / DD-UI-E — picker data sources for the Assign/Edit modal.
// No longer stubs — both services are now wired to real data sources.
//
// PEOPLE PICKER
// -------------
// Calls GET /api/users/active and maps the response to DelegateSummary shape.
// Client-side filtering via app-multiselect's virtual scroll (~591 users is fine).
//
// PROJECTS PICKER
// ---------------
// Derives its list from PiDelegatesClientService.byProjectCache() — the same
// signal that drives the page table — so the picker and the table are always
// in sync without a second network call.
//
// OPTION SHAPES
// -------------
// People options conform to `DelegateSummary` { delegate_user_id, name, email }.
//   - app-multiselect: optionValue="delegate_user_id", optionLabel="name"
//   - Self-exclusion hook: the modal (T-UI-07) applies optionFilter to drop the
//     current user (R-UI-005 AC.3). This service does not pre-exclude anyone.
//
// Projects options conform to `ProjectSummary` { project_code, project_name }.
//   - app-multiselect: optionValue="project_code", optionLabel="project_name"
//
// MULTISELECT CONTRACT
// --------------------
//   app-multiselect.loadData() calls service.main() when it is a function.
//   app-multiselect.bindServiceSignals() syncs service.list (signal) into optionsSig.
//   service.loading and service.isOpenSearch are also read as signals.
//
// REGISTRATION
// ------------
// Both services are registered in ServiceLocatorService under the keys
// 'piDelegatePeople' and 'piDelegateProjects' (ControlListServices).
// ServiceLocatorService is NOT touched here (KZ-002 blast-radius rule).

import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from '@services/api.service';
import { PiDelegatesClientService } from './pi-delegates.client.service';
import { DelegateSummary, ProjectSummary } from '@shared/interfaces/pi-delegates.interface';

/**
 * Live source for the **People** picker in the Assign/Edit modal.
 *
 * Calls GET /api/users/active and maps sec_user_id → delegate_user_id,
 * first_name + last_name → name (email fallback when both are absent).
 * Shape: `DelegateSummary` — optionValue="delegate_user_id", optionLabel="name".
 *
 * Self-exclusion (R-UI-005 AC.3) is applied by the modal via `optionFilter`.
 */
@Injectable({ providedIn: 'root' })
export class PiDelegatePeoplePickerStubService {
  private readonly api = inject(ApiService);

  /** People eligible for delegation. Populated by main(). */
  readonly list = signal<DelegateSummary[]>([]);
  readonly loading = signal(false);
  readonly isOpenSearch = signal(false);

  /** Called by app-multiselect loadData(). Fetches active users and maps to DelegateSummary. */
  async main(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.GET_ActiveUsers();
      if (res.successfulRequest) {
        this.list.set(
          (res.data ?? []).map(u => ({
            delegate_user_id: u.sec_user_id,
            name: (`${u.first_name ?? ''} ${u.last_name ?? ''}`).trim() || u.email,
            email: u.email
          }))
        );
      }
    } catch {
      // A failed fetch must not break the modal — leave the list as-is.
    } finally {
      this.loading.set(false);
    }
  }
}

/**
 * Live source for the **Projects** picker in the Assign/Edit modal.
 *
 * Derives its list from PiDelegatesClientService.byProjectCache() — the same
 * cache that drives the page table — so the picker always reflects the table
 * without a second network call.
 * Shape: `ProjectSummary` — optionValue="project_code", optionLabel="project_name".
 */
@Injectable({ providedIn: 'root' })
export class PiDelegateProjectsPickerStubService {
  private readonly piService = inject(PiDelegatesClientService);

  /** Projects available for delegation — kept in sync with the table cache. */
  readonly list = signal<ProjectSummary[]>([]);
  readonly loading = signal(false);
  readonly isOpenSearch = signal(false);

  constructor() {
    // Keep `list` in sync with byProjectCache whenever the cache updates.
    effect(() => {
      this.list.set(
        this.piService.byProjectCache().map(p => ({
          project_code: p.project_code,
          project_name: p.project_name
        }))
      );
    });
  }
}
