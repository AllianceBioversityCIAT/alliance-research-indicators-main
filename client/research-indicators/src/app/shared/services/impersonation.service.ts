// @akili-spec changes/profile-simulation
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CacheService } from './cache/cache.service';
import { ApiService } from './api.service';
import { UserCache } from '../interfaces/cache.interface';
import {
  ImpersonationSessionInfo,
  ImpersonationStartResponse,
  ImpersonationStoredState,
  ImpersonationTargetProfile
} from '../interfaces/impersonation.interface';

const STORAGE_KEY = 'impersonation';
const END_CALL_TIMEOUT_MS = 3000;

export type ImpersonationEndReason = 'manual' | 'logout' | 'server-invalid';

/**
 * R-IMP-009/010, design §2.2/§5. Depends ONLY on `CacheService`, `ApiService`
 * and `Router` (D-imp-13) — no `ActionsService`, no `WebsocketService`, to
 * avoid a DI cycle. Callers (banner, navbar, `httpErrorInterceptor`,
 * `logOut()`) are responsible for toasts, `configUser()` and navigation;
 * this service owns only the state machine and the storage rule.
 *
 * `router` is currently unused by this service's own methods — it is kept
 * as a constructor dependency per D-imp-13's approved shape; navigation is
 * a caller responsibility (design §5 "Client start/end").
 */
@Injectable({
  providedIn: 'root'
})
export class ImpersonationService {
  private cache = inject(CacheService);
  private api = inject(ApiService);
  private router = inject(Router);

  active = signal(false);
  restoring = signal(false);
  session = signal<ImpersonationSessionInfo | null>(null);
  actor = signal<UserCache | null>(null);

  /** Session id for the currently active simulation, or `null`. Used by `jWtInterceptor` (T-08). */
  sessionId(): string | null {
    return this.session()?.session_id ?? null;
  }

  /**
   * Design §5 "Client start". Stores `{session, actor}` under
   * `localStorage['impersonation']` (the actor is a FULL snapshot of the
   * admin's current `dataCache().user`), swaps `dataCache().user` for the
   * target (with `roleName` computed via the preferred-role rule), and
   * persists the whole `dataCache` to `localStorage['data']`. Tokens are
   * never touched (R-IMP-010 `BUT`).
   */
  start(res: ImpersonationStartResponse): void {
    // JSON round-trip rather than `structuredClone` — plain JSON-shaped data
    // (no Date/Map/etc.) and `structuredClone` isn't available in every
    // supported test/runtime environment.
    const actorSnapshot: UserCache = JSON.parse(JSON.stringify(this.cache.dataCache().user));
    const target = this.buildTargetUser(res.user);

    const stored: ImpersonationStoredState = { session: res.session, actor: actorSnapshot };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    this.cache.dataCache.update(prev => ({ ...prev, user: target }));
    localStorage.setItem('data', JSON.stringify(this.cache.dataCache()));

    this.session.set(res.session);
    this.actor.set(actorSnapshot);
    this.active.set(true);
  }

  /**
   * Design §5 "Client end". Best-effort `api.endImpersonation()` under a
   * 3 s cap — `'server-invalid'` skips the API call entirely since the
   * server already rejected the session (`X-Impersonation-Error`). Restores
   * the actor into `dataCache` AND `localStorage['data']` even when the API
   * call rejects or times out, then clears `localStorage['impersonation']`
   * and the signals.
   */
  async end(reason: ImpersonationEndReason): Promise<{ actor: UserCache | null }> {
    const stored = this.readStoredState();
    const actorSnapshot = stored?.actor ?? this.actor();

    if (stored && reason !== 'server-invalid') {
      await this.callEndWithTimeout(stored.session.session_id, reason);
    }

    if (actorSnapshot) {
      this.cache.dataCache.update(prev => ({ ...prev, user: actorSnapshot }));
      localStorage.setItem('data', JSON.stringify(this.cache.dataCache()));
    }

    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.actor.set(null);
    this.active.set(false);

    return { actor: actorSnapshot };
  }

  /**
   * Design §5 "Client restore". No stored key → no-op. Stored key → calls
   * `/current` with the stored session id; `active:true` adopts the
   * returned target user (re-persisting `dataCache`/`data` and the session)
   * and keeps the already-stored full actor snapshot (the `/current`
   * response's `actor` is deliberately minimal — `ImpersonationActorSummary`
   * — and would lose `roleName`/`user_role_list` fidelity needed by `end()`
   * if it overwrote the stored snapshot). Any other outcome (including a
   * rejected/timed-out call) runs the local end path via `end('server-invalid')`.
   */
  async restore(): Promise<void> {
    const stored = this.readStoredState();
    if (!stored) return;

    this.restoring.set(true);
    try {
      const response = await this.api.currentImpersonation(stored.session.session_id);

      if (response.successfulRequest && response.data.active) {
        const target = this.buildTargetUser(response.data.user);
        this.cache.dataCache.update(prev => ({ ...prev, user: target }));
        localStorage.setItem('data', JSON.stringify(this.cache.dataCache()));

        const refreshed: ImpersonationStoredState = { session: response.data.session, actor: stored.actor };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));

        this.session.set(response.data.session);
        this.actor.set(stored.actor);
        this.active.set(true);
      } else {
        await this.end('server-invalid');
      }
    } catch {
      await this.end('server-invalid');
    } finally {
      this.restoring.set(false);
    }
  }

  private buildTargetUser(profile: ImpersonationTargetProfile): UserCache {
    const roles = profile.user_role_list ?? [];
    const preferredRole = roles.find(role => role.role_id === 1) || roles.find(role => role.role_id === 9) || roles[0];
    return { ...profile, roleName: preferredRole?.role?.name ?? '' };
  }

  private readStoredState(): ImpersonationStoredState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ImpersonationStoredState;
    } catch {
      return null;
    }
  }

  private async callEndWithTimeout(sessionId: string, reason: Extract<ImpersonationEndReason, 'manual' | 'logout'>): Promise<void> {
    try {
      await this.withTimeout(this.api.endImpersonation(sessionId, reason), END_CALL_TIMEOUT_MS);
    } catch (error) {
      console.error('impersonation.end: best-effort API call failed or timed out', error);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('impersonation end timeout')), ms);
      promise.then(
        value => {
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}
