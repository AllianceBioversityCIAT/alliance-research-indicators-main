import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { InnovationType } from '@shared/interfaces/get-innovation.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInnovationTypesService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<InnovationType[]>([]);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    const response = await this.apiService.GET_InnovationTypes();
    const data = Array.isArray(response?.data) ? response.data : [];
    this.list.set(data);
    this.loading.set(false);
  }
}
