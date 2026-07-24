import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetYear } from '@shared/interfaces/get-year.interface';
import { CacheService } from '../cache/cache.service';

@Injectable({
  providedIn: 'root'
})
export class GetYearsByCodeService {
  apiService = inject(ApiService);
  loading = signal(true);
  private readonly cache = inject(CacheService);

  list = signal<GetYear[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_Years(this.cache.getCurrentNumericResultId());
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
