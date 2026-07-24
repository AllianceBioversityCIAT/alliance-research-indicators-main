import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';

@Injectable({ providedIn: 'root' })
export class ImpactAreaScoresService {
  apiService = inject(ApiService);
  loading = signal(true);
  isOpenSearch = signal(false);

  list = signal<GenericList[]>([]);
  
  constructor() {
    this.loadData();
  }

  private async loadData() {
    await this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_ImpactAreaScores();
      const data = Array.isArray(response?.data) ? response.data : [];
      
      const formattedData = data.map(item => ({
        id: item.id,
        name: `<strong>${item.id - 1} -</strong> ${item.name}`,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        is_active: item.is_active ?? true
      }));
      
      this.list.set(formattedData);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
