import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetAllIndicators } from '../../interfaces/get-all-indicators.interface';
@Injectable({
  providedIn: 'root'
})
export class GetAllIndicatorsService {
  apiService = inject(ApiService);
  list = signal<GetAllIndicators[]>([]);
  loading = signal(true);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_AllIndicators();
      const data = Array.isArray(response?.data) ? response.data : [];
      this.list.set(data);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  getInstance = async (): Promise<WritableSignal<GetAllIndicators[]>> => {
    const newSignal = signal<GetAllIndicators[]>([]);
    try {
      const response = await this.apiService.GET_AllIndicators();
      const data = Array.isArray(response?.data) ? response.data : [];
      newSignal.set(data);
    } catch {
      newSignal.set([]);
    }
    return newSignal;
  };
}
