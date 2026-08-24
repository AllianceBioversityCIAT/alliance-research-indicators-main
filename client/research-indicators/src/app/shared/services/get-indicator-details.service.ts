import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractIndicatorDetailsReport } from '@shared/interfaces/contract-indicator-details.interface';

@Injectable({
  providedIn: 'root'
})
export class GetIndicatorDetailsService {
  private readonly apiService = inject(ApiService);

  readonly data = signal<ContractIndicatorDetailsReport | null>(null);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<boolean>(false);
  readonly loadedContractId = signal<string | null>(null);

  readonly capacitySharing = computed(() => this.data()?.capacity_sharing ?? null);
  readonly innovationDev = computed(() => this.data()?.innovation_dev ?? null);
  readonly knowledgeProduct = computed(() => this.data()?.knowledge_product ?? null);
  readonly policyChange = computed(() => this.data()?.policy_change ?? null);
  readonly oicr = computed(() => this.data()?.oicr ?? null);
  readonly innovationUse = computed(() => this.data()?.innovation_use ?? null);
  readonly reportingVelocity = computed(() => this.data()?.reporting_velocity ?? null);

  sectionFailed(sectionKey: keyof ContractIndicatorDetailsReport): boolean {
    return this.data()?.[sectionKey] === null;
  }

  async load(contractId: string, options?: { force?: boolean }): Promise<void> {
    if (!options?.force && this.loadedContractId() === contractId && this.data()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_IndicatorDetails(contractId);
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
