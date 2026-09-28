import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PolicyAmountStatusService {
  list = signal<{ name: string; id: string }[]>([]);
  loading = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    this.list.set([
      { id: 'Confirmed', name: 'Confirmed' },
      { id: 'Estimated', name: 'Estimated' },
      { id: 'Unknown', name: 'Unknown' }
    ]);
    this.loading.set(false);
  }
}
