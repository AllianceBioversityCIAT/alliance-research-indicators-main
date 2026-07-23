import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { SessionPurpose } from '../../interfaces/get-session-purpose.interface';

@Injectable({
  providedIn: 'root'
})
export class CapSharingSessionPurposeService {
  private api = inject(ApiService);
  list = signal<SessionPurpose[]>([]);
  loading = signal<boolean>(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_SessionPurpose();
      this.list.set(response.data ?? []);
    } catch (error) {
      console.error('Error loading session purpose:', error);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
