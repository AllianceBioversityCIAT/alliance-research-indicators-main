import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { SessionFormat } from '../../interfaces/get-cap-sharing.interface';

@Injectable({
  providedIn: 'root'
})
export class CapSharingFormatsService {
  api = inject(ApiService);
  list = signal<SessionFormat[]>([]);
  loading = signal(true);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_SessionFormat();
      this.list.set(response.data);
    } finally {
      this.loading.set(false);
    }
  }
}
