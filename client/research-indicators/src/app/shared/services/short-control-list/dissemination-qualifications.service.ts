import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';

@Injectable({
  providedIn: 'root'
})
export class DisseminationQualificationsService {
  api = inject(ApiService);
  list = signal<GenericList[]>([]);
  loading = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_DisseminationQualifications();
      this.list.set(response?.data ?? []);
    } catch (error) {
      console.error('Error loading dissemination qualifications:', error);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
