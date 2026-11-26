import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { OicrAudienceOption } from '@shared/interfaces/oicr-catalogs.interface';

@Injectable({
  providedIn: 'root'
})
export class GetOicrAudiencesService {
  apiService = inject(ApiService);
  loading = signal(true);
  list = signal<OicrAudienceOption[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_OicrAudiences();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data.map(item => ({ ...item, oicr_audience_id: item.id })));
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
