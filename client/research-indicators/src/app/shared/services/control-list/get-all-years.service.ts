import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class GetAllYearsService {
  api = inject(ApiService);
  list = signal<{ id: number; name: string }[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    this.list.set([
      { id: 2024, name: '2024' },
      { id: 2025, name: '2025' }
    ]);
    this.loading.set(false);
  }
}
