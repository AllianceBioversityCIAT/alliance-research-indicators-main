import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetYear } from '@shared/interfaces/get-year.interface';

@Injectable({
  providedIn: 'root'
})
export class GetYearsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<GetYear[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_Years();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
