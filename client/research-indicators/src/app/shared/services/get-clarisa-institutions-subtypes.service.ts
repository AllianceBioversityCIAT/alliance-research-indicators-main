import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';

@Injectable({
  providedIn: 'root'
})
export class GetClarisaInstitutionsSubTypesService {
  api = inject(ApiService);
  private subTypesMap = new Map<number, ClarisaInstitutionsSubTypes[]>();
  loading = signal(false);
  isOpenSearch = signal(false);

  async getSubTypes(depthLevel: number, code?: number) {
    if (!code) return;

    this.loading.set(true);
    try {
      // clear previous list for this code
      this.subTypesMap.delete(code);

      const response = await this.api.GET_SubInstitutionTypes(depthLevel, code);
      this.subTypesMap.set(code, response.data);
    } catch (error) {
      console.error('Error fetching institution subtypes:', error);
      this.subTypesMap.set(code, []);
    } finally {
      this.loading.set(false);
    }
  }

  list(code?: number): ClarisaInstitutionsSubTypes[] {
    if (!code) return [];
    return this.subTypesMap.get(code) || [];
  }

  clearList(code?: number) {
    if (code) {
      this.subTypesMap.delete(code);
    } else {
      this.subTypesMap.clear();
    }
  }
}
