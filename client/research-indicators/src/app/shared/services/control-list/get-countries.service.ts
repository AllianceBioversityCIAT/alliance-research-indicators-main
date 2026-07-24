import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetCountries } from '../../interfaces/get-countries.interface';

@Injectable({
  providedIn: 'root'
})
export class GetCountriesService {
  api = inject(ApiService);
  list = signal<GetCountries[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);

  constructor() {
    this.main();
  }

  async main(isSubNational = false) {
    this.loading.set(true);
    try {
      const response = await this.api.GET_Countries(isSubNational ? { 'is-sub-national': true } : { 'is-sub-national': false });
      this.list.set(response.data);
    } catch (e) {
      console.error('Failed to fetch countries:', e);
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
