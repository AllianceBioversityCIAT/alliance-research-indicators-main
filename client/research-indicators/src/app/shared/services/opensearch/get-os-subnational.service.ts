import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetOsSubNationals, OpenSearchFilters } from '../../interfaces/get-os-subnational.interface';

@Injectable({
  providedIn: 'root'
})
export class GetOsSubnationalService {
  api = inject(ApiService);
  list = signal<GetOsSubNationals[]>([]);
  loading = signal(false);
  isOpenSearch = signal(true);

  async update(search: string) {
    this.loading.set(true);
    try {
      const response = await this.api.GET_OpenSearchSubNationals(search);
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  getInstance = async (query: string, openSearchFilters?: OpenSearchFilters): Promise<WritableSignal<GetOsSubNationals[]>> => {
    const newSignal = signal<GetOsSubNationals[]>([]);
    const response = await this.api.GET_OpenSearchSubNationals(query, openSearchFilters);
    const data = Array.isArray(response?.data) ? response.data : [];
    data.forEach(item => {
      item.sub_national_id = item.id;
    });
    newSignal.set(data);
    return newSignal;
  };
}
