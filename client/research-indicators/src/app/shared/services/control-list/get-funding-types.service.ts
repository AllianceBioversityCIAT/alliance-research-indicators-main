import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { FundingType } from '@shared/interfaces/funding-type.interface';

@Injectable({
  providedIn: 'root'
})
export class GetFundingTypesService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<FundingType[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_FundingTypes();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
