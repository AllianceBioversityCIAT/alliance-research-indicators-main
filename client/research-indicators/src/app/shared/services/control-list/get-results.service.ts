import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from '@services/api.service';
import { GetResultsPaginationOptions, Result, ResultConfig, ResultFilter } from '@interfaces/result/result.interface';

@Injectable({
  providedIn: 'root'
})
export class GetResultsService {
  api = inject(ApiService);
  results: WritableSignal<Result[]> = signal([]);
  loading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.updateList();
  }

  updateList = async () => {
    this.loading.set(true);
    try {
      const response = await this.api.GET_Results({}, undefined, { page: 1, limit: 10_000 });
      this.results.set(response?.data?.results ?? []);
    } catch {
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  };

  fetchPaginated = async (
    resultFilter: ResultFilter,
    pagination: GetResultsPaginationOptions,
    resultConfig?: ResultConfig
  ): Promise<{ results: Result[]; total: number }> => {
    try {
      const response = await this.api.GET_Results(resultFilter, resultConfig, pagination);
      return {
        results: response?.data?.results ?? [],
        total: response?.data?.total ?? 0
      };
    } catch {
      return { results: [], total: 0 };
    }
  };
}
