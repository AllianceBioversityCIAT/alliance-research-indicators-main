import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { MaturityLevel } from '@shared/interfaces/maturity-level.interface';

@Injectable({
  providedIn: 'root'
})
export class GetMaturityLevelsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<MaturityLevel[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_MaturityLevels();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
