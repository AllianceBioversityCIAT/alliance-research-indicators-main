import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';


@Injectable({ providedIn: 'root' })
export class NotableReferenceTypesService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<GenericList[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_ReferencesType();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

