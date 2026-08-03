import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { CacheService } from './cache/cache.service';
import { Router } from '@angular/router';
interface GetMetadataResponse {
  canOpen: boolean;
  result_official_code?: number;
  indicator_id?: number;
  status_id?: number;
  result_title?: string;
  result_contract_id?: string;
}
@Injectable({
  providedIn: 'root'
})
export class GetMetadataService {
  api = inject(ApiService);
  cache = inject(CacheService);
  router = inject(Router);

  async update(id: number, platform?: string | null): Promise<GetMetadataResponse> {
    const response = await this.api.GET_Metadata(id, platform || undefined);
    if (response?.status !== 200) {
      this.router.navigate(['/results-center']);
      return { canOpen: false };
    } else {
      this.cache.currentMetadata.set(response?.data);
      const { result_official_code, indicator_id, status_id, result_title, result_contract_id } = response?.data ?? {};
      return { canOpen: true, result_official_code, indicator_id, status_id, result_contract_id, result_title };
    }
  }

  formatText(input: string): string {
    const words = input.split(' ');
    if (words.length < 2) return '';
    const firstPart = words[0].slice(0, 3).charAt(0).toUpperCase() + words[0].slice(1, 3).toLowerCase();
    const lastWord = words[words.length - 1];
    const lastPart = lastWord.slice(0, 3).charAt(0).toUpperCase() + lastWord.slice(1, 3).toLowerCase();
    return firstPart + lastPart;
  }

  clearMetadata() {
    this.cache.currentMetadata?.set?.({});
    this.cache.currentResultId?.set?.(0);
  }
}
