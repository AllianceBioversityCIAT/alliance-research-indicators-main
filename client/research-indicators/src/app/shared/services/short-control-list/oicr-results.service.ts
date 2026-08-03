import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { Oicr } from '@shared/interfaces/oicr-creation.interface';

@Injectable({
  providedIn: 'root'
})
export class OicrResultsService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<Oicr[]>([]);
  isOpenSearch = signal(false);

  resultsFilter = {};
  resultsConfig = {};

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_OicrResults();
      const data = Array.isArray(response?.data) ? response.data : [];

      const mappedData = data.map(item => ({
        ...item,
        select_label: this.generateSelectLabel(item)
      }));

      this.list.set(mappedData);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private generateSelectLabel(item: Oicr): string {
    const id = item.id !== undefined && item.id !== null ? item.id.toString() : '';
    const title = item.title || '';

    if (!id && !title) return '-';
    if (!id) return `- ${title}`;
    if (!title) return `${id} -`;

    return `${id} - ${title}`;
  }

  update(filter: Record<string, unknown>) {
    this.resultsFilter = filter;
  }
}
