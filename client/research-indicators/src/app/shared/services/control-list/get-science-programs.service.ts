import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetSciencePrograms } from '@shared/interfaces/get-science-programs.interface';

@Injectable({
  providedIn: 'root'
})
export class GetScienceProgramsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<GetSciencePrograms[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_SciencePrograms();
      const data = Array.isArray(response?.data) ? response.data.filter(sp => sp?.is_active !== false) : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
