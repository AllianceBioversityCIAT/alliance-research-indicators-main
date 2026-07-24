import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GetProjectStatusService {
  list = signal<{ name: string; value: string }[]>([
    { name: 'Ongoing', value: 'ONGOING' },
    { name: 'Completed', value: 'COMPLETED' },
    { name: 'Suspended', value: 'SUSPENDED' }
  ]);
  loading = signal(false);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  main() {
    this.loading.set(false);
  }
}
