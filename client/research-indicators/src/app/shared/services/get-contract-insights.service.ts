import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractInsightsReport } from '@shared/interfaces/contract-insights.interface';

@Injectable({
  providedIn: 'root'
})
export class GetContractInsightsService {
  private readonly apiService = inject(ApiService);

  readonly data = signal<ContractInsightsReport | null>(null);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<boolean>(false);
  readonly loadedContractId = signal<string | null>(null);

  readonly reach = computed(() => this.data()?.reach ?? null);
  readonly sdgCoverage = computed(() => this.data()?.sdg_coverage ?? null);
  readonly evidence = computed(() => this.data()?.evidence ?? null);
  readonly reviewFlow = computed(() => this.data()?.review_flow ?? null);
  readonly contributingLevers = computed(() => this.data()?.contributing_levers ?? null);
  readonly keywords = computed(() => this.data()?.keywords ?? null);

  sectionFailed(sectionKey: keyof ContractInsightsReport): boolean {
    return this.data()?.[sectionKey] === null;
  }

  async load(contractId: string, options?: { force?: boolean }): Promise<void> {
    if (!options?.force && this.loadedContractId() === contractId && this.data()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_ContractInsights(contractId);
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
