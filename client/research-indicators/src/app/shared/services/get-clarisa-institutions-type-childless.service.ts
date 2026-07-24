import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { GetClarisaInstitutionsTypes } from '@shared/interfaces/get-clarisa-institutions-types.interface';

@Injectable({
  providedIn: 'root'
})
export class GetClarisaInstitutionsTypesChildlessService {
  private api = inject(ApiService);
  list = signal<GetClarisaInstitutionsTypes[]>([]);
  loading = signal<boolean>(false);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_InstitutionsTypesChildless();
      this.list.set(response.data ?? []);
    } catch (error) {
      console.error('Error loading institutions types childless:', error);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
