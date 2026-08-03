import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInstitutionTypesService {
  private readonly apiService = inject(ApiService);
  loading = signal(true);
  list = signal<ClarisaInstitutionsSubTypes[]>([]);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    const response = await this.apiService.GET_SubInstitutionTypes(1);
    const data = Array.isArray(response?.data) ? response.data : [];
    this.list.set(data);
    this.loading.set(false);
  }
}
