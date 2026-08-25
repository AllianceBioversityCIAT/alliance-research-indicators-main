import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ContractClarisaProject } from '../interfaces/contract-clarisa-project.interface';

/**
 * @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-02 / R-EOC-001, design.md §2.2
 *
 * Shared CLARISA-project fetch with per-navigation request dedupe keyed by
 * contract id, mirroring `GetProjectDetailService`'s pattern.
 *
 * `data: null` is a normal, cacheable outcome here (R-EOC-001 AC.2/AC.4:
 * unmapped contract, or a CLARISA cold-cache degrade reported via
 * `errors[]`) — unlike `GetProjectDetailService`, a successful response with
 * null data is still memoized so an unmapped contract doesn't re-fetch on
 * every dashboard re-entry (NFR-1). `loadError` is reserved for transport
 * failures (thrown error / `successfulRequest === false`), never for a null
 * payload (NFR-2).
 *
 * This is a per-navigation dedupe with explicit `invalidate(id)`, NOT a TTL
 * cache — the server-side 5-minute TTL (NFR-3) already governs freshness.
 *
 * The memo is keyed per contract id and stores the RESOLVED value
 * (`Map<string, ContractClarisaProject | null>`), not just a "was this id
 * loaded" flag: on a memo hit, `data` is set from the cached value before
 * returning. A `Set`-based memo with an early return on hit would leave the
 * single shared `data` signal holding whichever contract was loaded most
 * recently — wrong for a re-entered contract whenever Angular reuses the
 * route component (no `ngOnDestroy`) or when nothing invalidates this
 * root-scoped service on navigate-away (Reviewer-caught cross-contract
 * staleness, R-EOC-001 §3 / R-EOC-002 AC.2).
 */
@Injectable({ providedIn: 'root' })
export class GetClarisaProjectService {
  private readonly api = inject(ApiService);

  readonly data = signal<ContractClarisaProject | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private readonly inFlightByContractId = new Map<string, Promise<void>>();
  private readonly resolvedByContractId = new Map<string, ContractClarisaProject | null>();

  async load(contractId: string): Promise<void> {
    if (!contractId) {
      return;
    }

    const inFlight = this.inFlightByContractId.get(contractId);
    if (inFlight) {
      await inFlight;
      return;
    }

    if (this.resolvedByContractId.has(contractId)) {
      this.data.set(this.resolvedByContractId.get(contractId) ?? null);
      return;
    }

    const promise = this.fetchClarisaProject(contractId);
    this.inFlightByContractId.set(contractId, promise);

    try {
      await promise;
    } finally {
      this.inFlightByContractId.delete(contractId);
    }
  }

  invalidate(contractId?: string): void {
    if (contractId === undefined) {
      this.resolvedByContractId.clear();
      this.inFlightByContractId.clear();
    } else {
      this.resolvedByContractId.delete(contractId);
    }
  }

  private async fetchClarisaProject(contractId: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.api.GET_ContractClarisaProject(contractId);
      if (response?.successfulRequest === false) {
        this.data.set(null);
        this.loadError.set(true);
        return;
      }
      // R-EOC-001 AC.2/AC.4: data:null with a 200 (unmapped contract, or a
      // CLARISA cold-cache degrade) is a normal state, not an error — and is
      // memoized like any other successful response.
      const data = response?.data ?? null;
      this.data.set(data);
      this.resolvedByContractId.set(contractId, data);
    } catch (error) {
      this.data.set(null);
      this.loadError.set(true);
      console.error('Error loading CLARISA project:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
