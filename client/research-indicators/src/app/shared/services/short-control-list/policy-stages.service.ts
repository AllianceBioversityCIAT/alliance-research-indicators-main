import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class PolicyStagesService {
  api = inject(ApiService);
  list = signal<{ name: string; id: number }[]>([]);
  loading = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      this.list.set([
        { id: 1, name: 'Stage 1: Research taken up by next user, policy change not yet enacted' },
        { id: 2, name: 'Stage 2: Policy enacted' },
        { id: 3, name: 'Stage 3: Evidence of impact of policy' }
      ]);
    } finally {
      this.loading.set(false);
    }
  }
}
