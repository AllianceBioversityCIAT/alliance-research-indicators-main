import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { TopPrimaryLeverItem } from '@interfaces/project-dashboard.interface';

@Injectable()
export class GetTopPrimaryLeversService {
  apiService = inject(ApiService);

  contractId = '';
  limit = 0;

  list = signal<TopPrimaryLeverItem[]>([]);
  loading = signal(false);
  loadError = signal(false);

  main(contractId: string, limit: number) {
    this.contractId = contractId;
    this.limit = limit;
    void this.update();
  }

  update = async () => {
    if (!this.contractId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_TopPrimaryLevers(this.contractId, this.limit);
      const data = response?.data?.top_primary_levers;
      this.list.set(Array.isArray(data) ? data : []);
    } catch {
      this.list.set([]);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  };
}
