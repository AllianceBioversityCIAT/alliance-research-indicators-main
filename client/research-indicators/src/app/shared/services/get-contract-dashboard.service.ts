import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractDashboardReport } from '@shared/interfaces/contract-dashboard.interface';

@Injectable({
  providedIn: 'root'
})
export class GetContractDashboardService {
  private readonly apiService = inject(ApiService);

  readonly data = signal<ContractDashboardReport | null>(null);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<boolean>(false);
  readonly loadedContractId = signal<string | null>(null);

  readonly summary = computed(() => this.data()?.summary ?? null);
  readonly tops = computed(() => this.data()?.tops ?? null);
  readonly topPartners = computed(() => this.tops()?.partners ?? []);
  readonly topPrimaryLevers = computed(() => this.tops()?.primary_levers ?? []);
  readonly topMainContactPersons = computed(() => this.tops()?.main_contacts ?? []);
  readonly topContributors = computed(() => this.tops()?.contributors ?? []);
  readonly geoScope = computed(() => this.data()?.geo_scope ?? null);
  readonly spAlignment = computed(() => this.data()?.sp_alignment ?? null);

  async load(contractId: string, options?: { force?: boolean }): Promise<void> {
    if (!options?.force && this.loadedContractId() === contractId && this.data()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_ContractDashboard(contractId);
      if (response?.successfulRequest === false) {
        this.data.set(null);
        this.loadError.set(true);
        return;
      }
      this.data.set(response?.data ?? null);
      this.loadedContractId.set(contractId);
    } catch {
      this.data.set(null);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async update(): Promise<void> {
    const contractId = this.loadedContractId();
    if (contractId) {
      await this.load(contractId, { force: true });
    }
  }
}
