import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { InnovationCharacteristic } from '@shared/interfaces/get-innovation.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInnovationCharacteristicsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<InnovationCharacteristic[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_InnovationCharacteristics();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
