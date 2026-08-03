import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';

@Injectable({
  providedIn: 'root'
})
export class ApplicationOptionsService {
  api = inject(ApiService);
  list = signal<GenericList[]>([]);
  loading = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_ApplicationOptions();
      this.list.set(response.data);
    } catch (e) {
      console.error('Failed to fetch application options:', e);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
