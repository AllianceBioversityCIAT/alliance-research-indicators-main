import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ImpactArea } from '@shared/interfaces/impact-area.interface';

@Injectable({ providedIn: 'root' })
export class ImpactAreasService {
  apiService = inject(ApiService);
  loading = signal(true);
  isOpenSearch = signal(false);

  list = signal<ImpactArea[]>([]);
  
  constructor() {
    // Initialize data loading
    this.loadData();
  }

  private async loadData() {
    await this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_ImpactAreas();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
