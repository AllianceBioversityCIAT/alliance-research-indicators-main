// @akili-spec docs/specs/innovation-use/details-page (T-01 — contract layer)
import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { InnovationUseLevel } from '@shared/interfaces/get-innovation-use-levels.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInnovationUseLevelsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<InnovationUseLevel[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_InnovationUseLevels();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
