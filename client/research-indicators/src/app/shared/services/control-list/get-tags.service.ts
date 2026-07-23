import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetTags } from '@shared/interfaces/get-tags.interface';

@Injectable({
  providedIn: 'root'
})
export class GetTagsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<GetTags[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_Tags();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
