import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { GetProjectDetail } from '../interfaces/get-project-detail.interface';

/**
 * Shared project-detail fetch with per-navigation request dedupe keyed by
 * contract id. Covers the three components / four production invocations of
 * `GET_ResultsCount` that previously fired independently (project-detail shell,
 * project-dashboard, and section-header's `loadProjectData` +
 * `loadProjectDataById`).
 *
 * Design D-PD-7 / D-PD-10: this is a per-navigation dedupe with explicit
 * `invalidate(id)`, NOT a TTL cache — four post-mutation flows navigate to
 * `/project-detail/:id` expecting fresh counts, and a TTL cache would serve
 * stale aggregates on exactly those flows (K-016 family). `invalidate(id)` is
 * per-id so different contract ids remain independent cache entries.
 *
 * Empty state standardizes on `null` (signal type `GetProjectDetail | null`).
 */
@Injectable({ providedIn: 'root' })
export class GetProjectDetailService {
  private readonly api = inject(ApiService);

  readonly project = signal<GetProjectDetail | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private readonly inFlightByContractId = new Map<string, Promise<void>>();
  private readonly loadedContractIds = new Set<string>();

  async load(contractId: string): Promise<void> {
    if (!contractId) {
      return;
    }

    const inFlight = this.inFlightByContractId.get(contractId);
    if (inFlight) {
      await inFlight;
      return;
    }

    if (this.loadedContractIds.has(contractId)) {
      return;
    }

    const promise = this.fetchProjectDetail(contractId);
    this.inFlightByContractId.set(contractId, promise);

    try {
      await promise;
    } finally {
      this.inFlightByContractId.delete(contractId);
    }
  }

  invalidate(contractId?: string): void {
    if (contractId === undefined) {
      this.loadedContractIds.clear();
      this.inFlightByContractId.clear();
    } else {
      this.loadedContractIds.delete(contractId);
    }
  }

  private async fetchProjectDetail(contractId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.api.GET_ResultsCount(contractId);
      if (response?.successfulRequest === false) {
        this.project.set(null);
        this.loadError.set(true);
        return;
      }
      const data = response?.data ?? null;
      this.project.set(data);
      if (data) {
        this.loadedContractIds.add(contractId);
      }
    } catch (error) {
      this.project.set(null);
      this.loadError.set(true);
      console.error('Error loading project detail:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
