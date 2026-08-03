import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { GetAllResultStatus } from '../../interfaces/get-all-result-status.interface';

export interface ResultStatus {
  name: string;
  amount_results: number;
  result_status_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class GetAllResultStatusService {
  private apiService = inject(ApiService);
  list = signal<GetAllResultStatus[]>([]);
  loading = signal<boolean>(false);
  isOpenSearch = signal(false);
  data = signal<ResultStatus[]>([]);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_AllResultStatus();
      if (response?.data) {
        this.list.set(response.data);
      } else {
        this.list.set([]);
      }
    } catch (error) {
      console.error('Error loading result status:', error);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
