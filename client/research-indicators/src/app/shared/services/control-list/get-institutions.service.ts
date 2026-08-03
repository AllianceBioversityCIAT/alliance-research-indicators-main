import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetInstitution } from '../../interfaces/get-institutions.interface';

@Injectable({
  providedIn: 'root'
})
export class GetInstitutionsService {
  api = inject(ApiService);
  list = signal<GetInstitution[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    const response = await this.api.GET_Institutions();
    const data = response.data ?? [];
    data.forEach((institution: GetInstitution) => {
      institution.institution_id = institution.code;
      institution.region_id = institution.code;
      institution.html_full_name = institution.acronym
        ? `<strong>${institution.acronym}</strong> - ${institution.name} - ${institution.institution_locations?.[0]?.name}`
        : `${institution.name} - ${institution.institution_locations?.[0]?.name}`;
      institution.isoAlpha2 = institution.institution_locations?.[0]?.isoAlpha2;
      institution.institution_location_name = institution.institution_locations?.[0]?.name;
    });
    this.list.set(data);
    this.loading.set(false);
  }
}
