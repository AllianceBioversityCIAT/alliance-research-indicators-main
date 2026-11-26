import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { OicrThematicKeywordOption } from '@shared/interfaces/oicr-catalogs.interface';

@Injectable({
  providedIn: 'root'
})
export class GetOicrThematicKeywordsService {
  apiService = inject(ApiService);
  loading = signal(true);
  list = signal<OicrThematicKeywordOption[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_OicrThematicKeywords();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data.map(item => ({ ...item, oicr_thematic_keyword_id: item.id })));
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
