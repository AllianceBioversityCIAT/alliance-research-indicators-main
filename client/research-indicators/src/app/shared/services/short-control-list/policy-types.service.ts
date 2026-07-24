import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class PolicyTypesService {
  api = inject(ApiService);
  list = signal<{ name: string; id: number }[]>([]);
  loading = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    this.list.set([
      { id: 1, name: 'Policy or Strategy' },
      { id: 2, name: 'Legal instrument' },
      { id: 3, name: 'Program, Budget, or Investment' }
    ]);
    this.loading.set(false);
  }
}
