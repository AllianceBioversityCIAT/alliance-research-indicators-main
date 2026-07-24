import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { GetClarisaInstitutionsTypes } from '@shared/interfaces/get-clarisa-institutions-types.interface';

@Injectable({
  providedIn: 'root'
})
export class GetClarisaInstitutionsTypesService {
  api = inject(ApiService);
  list = signal<GetClarisaInstitutionsTypes[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    const response = await this.api.GET_InstitutionsTypes();
    this.list.set(response.data ?? []);
    this.loading.set(false);
  }
}
