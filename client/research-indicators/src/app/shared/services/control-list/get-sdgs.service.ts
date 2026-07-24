import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetSdgs } from '../../interfaces/get-sdgs.interface';

@Injectable({
  providedIn: 'root'
})
export class GetSdgsService {
  api = inject(ApiService);
  list = signal<GetSdgs[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);

  constructor() {
    this.initialize();
  }

  initialize() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_SDGs();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(
        data.map(item => ({
          ...item,
          select_label: item.financial_code + ' - ' + item.short_name,
          sdg_id: item.id
        }))
      );
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
