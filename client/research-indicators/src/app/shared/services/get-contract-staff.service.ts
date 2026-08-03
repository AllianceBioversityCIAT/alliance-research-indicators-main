import { Injectable, inject, signal } from '@angular/core';
import { ContractStaffItem } from '@interfaces/project-dashboard.interface';
import { ApiService } from '@shared/services/api.service';

@Injectable()
export class GetContractStaffService {
  apiService = inject(ApiService);

  contractId = '';

  staff = signal<ContractStaffItem[]>([]);
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
      const response = await this.apiService.GET_ContractStaff(this.contractId);
      const data = response?.data?.staff;
      this.staff.set(Array.isArray(data) ? data : []);
    } catch {
      this.staff.set([]);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  };
}
