import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetOsResult } from '@shared/interfaces/get-os-result.interface';

@Injectable({
  providedIn: 'root'
})
export class GetOsResultService {
  api = inject(ApiService);
  list = signal<GetOsResult[]>([]);
  loading = signal(false);
  isOpenSearch = signal(true);

  async update(search: string, sampleSize = 5) {
    this.loading.set(true);
    try {
      const response = await this.api.GET_OpenSearchResult(search, sampleSize);
      this.list.set(response.data);
    } catch (e) {
      console.error('Failed to fetch OS result:', e);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
