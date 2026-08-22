import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';

@Injectable()
export class GetContractSpAlignmentService {
  apiService = inject(ApiService);

  contractId = '';

  list = signal<ContractSpAlignmentReport | null>(null);
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
      const response = await this.apiService.GET_ContractSpAlignment(this.contractId);
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
