// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-02)
//
// Single-source-of-truth feature service for the My PI Delegates page.
// All tabs and counters derive from ONE signals cache (R-UI-010 / KZ-002).
// After every write the state comes from a REFETCH — never an optimistic mutation.
//
// loadByUser() (added): fetches both caches in one call using the by-user endpoints
// (/pi-delegates/by-user/projects and /pi-delegates/by-user/people) for the logged-in
// user.  _reloadForUser() replaces _refetchByProject() in write finally-blocks so both
// caches stay fresh after every assign / revoke.

import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from '@services/api.service';
import type { DelegateProjects, ProjectDelegates } from '@interfaces/pi-delegates.interface';

@Injectable({
  providedIn: 'root'
})
export class PiDelegatesClientService {
  private readonly api = inject(ApiService);

  // ─── Current-user context (set by loadByUser; drives _reloadForUser) ─────────

  /** sec_user_id of the logged-in user when loadByUser() is the active loader. Null until set. */
  private _userId = signal<number | null>(null);

  // ─── Primary signals cache (R-UI-010: one cache, no divergent copy) ─────────

  /** All loaded by-project data. Components derive from this via computed. */
  readonly byProjectCache = signal<ProjectDelegates[]>([]);

  /** All loaded by-delegate data. Components derive from this via computed. */
  readonly byPersonCache = signal<DelegateProjects[]>([]);

  /** True while any async operation is in flight. */
  readonly loading = signal<boolean>(false);

  /** Non-null when the last operation failed; null/undefined otherwise (falsy by default). */
  readonly error = signal<string | null>(null);

  // ─── Derived example (proves a single cache feeds all consumers) ─────────────

  /** Total distinct projects in the by-project cache. Consumed by the summary header (R-UI-004). */
  readonly totalProjects = computed(() => this.byProjectCache().length);

  /** Distinct delegate count across all projects. Consumed by the summary header (R-UI-004). */
  readonly totalDistinctDelegates = computed(() => {
    const ids = new Set<number>();
    for (const project of this.byProjectCache()) {
      for (const delegate of project.delegates) {
        ids.add(delegate.delegate_user_id);
      }
    }
    return ids.size;
  });

  /** Projects that have no assigned delegate. Consumed by the summary header (R-UI-004). */
  readonly projectsWithoutDelegate = computed(() => this.byProjectCache().filter(p => p.delegates.length === 0));

  // ─── Load methods ─────────────────────────────────────────────────────────────

  /**
   * Primary loader: fetches both by-project and by-person data for the logged-in
   * user in one parallel call.  Sets _userId so that _reloadForUser() can reuse it
   * after every write (R-UI-010: one reload keeps both caches fresh).
   */
  async loadByUser(userId: number): Promise<void> {
    this._userId.set(userId);
    this.loading.set(true);
    this.error.set(null);
    try {
      const [proj, people] = await Promise.all([
        this.api.GET_PIDelegatesByUserProjects(userId),
        this.api.GET_PIDelegatesByUserPeople(userId)
      ]);
      if (proj.successfulRequest) {
        this.byProjectCache.set(proj.data ?? []);
      } else {
        this.error.set('Failed to load by-project data');
      }
      if (people.successfulRequest) {
        this.byPersonCache.set(people.data ?? []);
      } else {
        this.error.set('Failed to load by-person data');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load PI delegates data');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetches enriched data for each projectId and aggregates the results into
   * byProjectCache.  Promise.all so all requests run concurrently.
   */
  async loadByProject(projectIds: string[]): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const responses = await Promise.all(projectIds.map(id => this.api.GET_PIDelegatesByProject(id)));
      const results: ProjectDelegates[] = [];
      for (const res of responses) {
        if (res.successfulRequest && res.data != null) {
          results.push(res.data);
        }
      }
      this.byProjectCache.set(results);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load by-project data');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Fetches enriched data for each delegateUserId and aggregates the results
   * into byPersonCache.  Promise.all so all requests run concurrently.
   */
  async loadByPerson(delegateUserIds: number[]): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const responses = await Promise.all(delegateUserIds.map(id => this.api.GET_PIDelegatesByDelegate(id)));
      const results: DelegateProjects[] = [];
      for (const res of responses) {
        if (res.successfulRequest && res.data != null) {
          results.push(res.data);
        }
      }
      this.byPersonCache.set(results);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load by-person data');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Write methods (POST/DELETE → refetch — no optimistic mutation) ──────────

  /**
   * POST new assignments then refetch the affected projects from the server so
   * the cache reflects true server state (R-UI-010 AC.1 / KZ-002).
   */
  async assign(
    assignments: {
      project_id: string;
      delegates: ({ delegate_user_id: number } | { email: string; first_name: string; last_name: string })[];
    }[]
  ): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.POST_PIDelegates({ assignments });
      if (!res.successfulRequest) {
        this.error.set('Failed to assign PI delegates');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to assign PI delegates');
    } finally {
      // Always reload so the UI reflects server state, even on error (R-UI-007 AC.3).
      // _reloadForUser keeps BOTH caches fresh when a userId is known.
      await this._reloadForUser();
      this.loading.set(false);
    }
  }

  /**
   * DELETE by (projectId, delegateUserId) pair then refetch the affected project.
   * The DELETE uses HttpClient directly (not TP) and may REJECT on HTTP error —
   * wrap in try/catch, set error, then refetch to reflect true server state
   * (R-UI-007 AC.3 — error shown, no partial success implied).
   */
  async revokePair(projectId: string, delegateUserId: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.api.DELETE_PIDelegates({ project_ids: [projectId], delegate_user_ids: [delegateUserId] });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to revoke delegate');
    } finally {
      // Always reload so the UI reflects server state, even on error (R-UI-007 AC.3).
      // _reloadForUser keeps BOTH caches fresh when a userId is known.
      await this._reloadForUser();
      this.loading.set(false);
    }
  }

  /**
   * DELETE by pi_delegate_ids then refetch ALL currently loaded projects.
   * Like revokePair, the DELETE may REJECT — always refetch after.
   */
  async revokeById(piDelegateIds: number[]): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.api.DELETE_PIDelegates({ pi_delegate_ids: piDelegateIds });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to revoke delegates by id');
    } finally {
      // Always reload so the UI reflects server state, even on error (R-UI-007 AC.3).
      // _reloadForUser keeps BOTH caches fresh when a userId is known.
      await this._reloadForUser();
      this.loading.set(false);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Post-write reload: if a userId is known (loadByUser was called) reloads both
   * caches via the by-user endpoints.  Falls back to _refetchByProject for the
   * legacy loadByProject path (safety net — keeps both callers correct).
   */
  private async _reloadForUser(): Promise<void> {
    const uid = this._userId();
    if (uid !== null) {
      await this.loadByUser(uid);
    } else {
      // Fallback: reload the by-project cache using what is currently known.
      const projectIds = this.byProjectCache().map(p => p.project_code);
      await this._refetchByProject(projectIds);
    }
  }

  /**
   * Re-fetches the given project IDs and merges updated entries into the cache,
   * preserving the order of currently cached projects (append new ones at end).
   * This is the ONLY place byProjectCache is written after a write operation —
   * ensuring there is never a second diverged copy (R-UI-010 / KZ-002).
   */
  private async _refetchByProject(projectIds: string[]): Promise<void> {
    if (projectIds.length === 0) return;
    try {
      const responses = await Promise.all(projectIds.map(id => this.api.GET_PIDelegatesByProject(id)));
      const updated = new Map<string, ProjectDelegates>();
      for (const res of responses) {
        if (res.successfulRequest && res.data != null) {
          updated.set(res.data.project_code, res.data);
        }
      }
      this.byProjectCache.update(current => {
        const merged = current.map(p => updated.get(p.project_code) ?? p);
        // Append any newly fetched projects not previously in the cache.
        for (const [code, proj] of updated) {
          if (!merged.some(p => p.project_code === code)) {
            merged.push(proj);
          }
        }
        return merged;
      });
    } catch {
      // Refetch failure is non-fatal — the error signal was already set by the caller.
    }
  }
}
