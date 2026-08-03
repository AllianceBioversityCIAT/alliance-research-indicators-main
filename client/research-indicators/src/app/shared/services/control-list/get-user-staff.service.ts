import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { UserStaff } from '../../interfaces/get-user-staff.interface';

@Injectable({
  providedIn: 'root'
})
export class GetUserStaffService {
  api = inject(ApiService);
  list = signal<UserStaff[]>([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.main();
  }

  buildSearchField(...fields: string[]): string {
    const words = fields.join(' ').split(/\s+/).filter(w => w.length > 0).map(w => w.toLowerCase());
    const pairs: string[] = [];
    for (let i = 0; i < words.length; i++) {
      for (let j = 0; j < words.length; j++) {
        if (i !== j) pairs.push(`${words[i]} ${words[j]}`);
      }
    }
    return [...pairs, words.join(' ')].join(' | ');
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.api.GET_UserStaff();
      response.data.forEach(item => {
        item.full_name = `${item.last_name}, ${item.first_name}  - ${item.email}`;
        item.user_id = item.carnet;
        item._search = this.buildSearchField(item.first_name, item.last_name, item.email);
      });
      this.list.set(response.data);
    } finally {
      this.loading.set(false);
    }
  }
}
