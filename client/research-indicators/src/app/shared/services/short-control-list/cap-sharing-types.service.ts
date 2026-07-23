import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { SessionType } from '../../interfaces/get-cap-sharing.interface';

@Injectable({
  providedIn: 'root'
})
export class CapSharingTypesService {
  private api = inject(ApiService);
  list = signal<SessionType[]>([]);
  loading = signal<boolean>(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_SessionType();
      this.list.set(response?.data ?? []);
    } catch (error) {
      console.error('Error loading session types:', error);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
