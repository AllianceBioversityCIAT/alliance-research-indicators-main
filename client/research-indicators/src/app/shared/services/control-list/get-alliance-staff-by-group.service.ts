import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { UserStaff } from '../../interfaces/get-user-staff.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAllianceStaffByGroupService {
    apiService = inject(ApiService);
    list = signal<UserStaff[]>([]);
    loading = signal(true);
    isOpenSearch = signal(false);
    constructor() {
      this.main();
    }
  
    async main() {
      this.loading.set(true);
      try {
        const response = await this.apiService.GET_AllianceStaff(1);
        const raw = Array.isArray(response?.data) ? response.data : [];
        const toTitleCase = (text: string) =>
          (text || '')
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const normalized = raw.map((item: UserStaff) => {
          const user_id = item?.user_id ?? item?.carnet ?? '';
          const first = toTitleCase(item?.first_name ?? '');
          const last = toTitleCase(item?.last_name ?? '');
          const email = item?.email ?? '';
          const namePart = [first, last].filter(Boolean).join(' ').trim();
          const full_name = namePart + (email ? ` - ${email}` : '');
          return { ...item, user_id, full_name };
        });
        this.list.set(normalized);
      } catch {
        this.list.set([]);
      } finally {
        this.loading.set(false);
      }
    }
  
}


