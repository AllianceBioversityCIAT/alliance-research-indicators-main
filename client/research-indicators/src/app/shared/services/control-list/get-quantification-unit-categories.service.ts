import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { QuantificationUnitCategory } from '@shared/interfaces/oicr-catalogs.interface';

@Injectable({
  providedIn: 'root'
})
export class GetQuantificationUnitCategoriesService {
  apiService = inject(ApiService);
  loading = signal(false);
  list = signal<QuantificationUnitCategory[]>([]);
  private loaded = false;

  /** Loads the catalog once; only the OICR 2026 screen asks for it. */
  async main() {
    if (this.loaded) return;
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_QuantificationUnitCategories();
      this.list.set(Array.isArray(response?.data) ? response.data : []);
      this.loaded = true;
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
