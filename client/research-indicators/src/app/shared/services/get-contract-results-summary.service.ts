import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractResultsSummary } from '@interfaces/contract-results-summary.interface';

@Injectable()
export class GetContractResultsSummaryService {
  apiService = inject(ApiService);

  contractId = '';

  list = signal<ContractResultsSummary | null>(null);
  loading = signal(false);
  loadError = signal(false);

  main(contractId: string) {
    this.contractId = contractId;
    void this.update();
  }

  update = async () => {
    if (!this.contractId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_ContractResultsSummary(this.contractId);
      if (response?.successfulRequest === false) {
        this.list.set(null);
        this.loadError.set(true);
        return;
      }
      const data = response?.data ?? null;
      this.list.set(data);
    } catch {
      this.list.set(null);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  };
}
