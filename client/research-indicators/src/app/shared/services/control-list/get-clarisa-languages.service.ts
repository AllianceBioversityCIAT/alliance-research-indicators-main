import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetLanguages } from '../../interfaces/get-get-languages.interface';

@Injectable({
  providedIn: 'root'
})
export class GetClarisaLanguagesService {
  api = inject(ApiService);
  list = signal<GetLanguages[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    const response = await this.api.GET_Languages();
    this.list.set(response.data);
    this.loading.set(false);
  }
}
