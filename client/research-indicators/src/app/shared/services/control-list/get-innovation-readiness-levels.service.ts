import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { InnovationLevel } from '@shared/interfaces/get-innovation.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInnovationReadinessLevelsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<InnovationLevel[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_InnovationReadinessLevels();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
