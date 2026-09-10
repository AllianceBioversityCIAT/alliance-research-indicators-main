import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { Result } from '../../interfaces/result/result.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInnoDevOutputService {
  api = inject(ApiService);
  list = signal<Result[]>([]);
  loading = signal(true);
  error = signal(false);
  isOpenSearch = signal(false);

  constructor() {
    this.initialize();
  }

  initialize() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    this.error.set(false);

    const response = await this.api.GET_Results({
      'indicator-codes': [2]
    });

    if (!response?.successfulRequest) {
      this.error.set(true);
    } else {
      this.list.set(response?.data?.results ?? []);
    }

    this.loading.set(false);
  }
}
