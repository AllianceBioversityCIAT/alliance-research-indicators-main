import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { Result, ResultConfig, ResultFilter } from '@shared/interfaces/result/result.interface';

@Injectable()
export abstract class BaseResultsService {
  apiService = inject(ApiService);
  loading = signal(true);
  list = signal<Result[]>([]);
  isOpenSearch = signal(false);

  protected abstract getIndicatorCodes(): number[];

  get resultsFilter(): ResultFilter {
    return {
      'indicator-codes': this.getIndicatorCodes(),
      'lever-codes': [],
      'create-user-codes': []
    };
  }

  get resultsConfig(): ResultConfig {
    return {
      indicators: true,
      'result-status': true,
      contracts: true,
      'primary-contract': true,
      'primary-lever': true,
      levers: true,
      'audit-data': true,
      'audit-data-object': true
    };
  }

  constructor() {
    this.main();
  }

  async main() {
    this.loading.set(true);
    try {
      const response = await this.apiService.GET_Results(this.resultsFilter, this.resultsConfig, { page: 1, limit: 10_000 });
      const data = response?.data?.results ?? [];
      const dataWithLabel = data.map((item: Result) => ({
        ...item,
        select_label: `${item.result_official_code || ''} - ${item.title || ''}`.trim()
      }));
      this.list.set(dataWithLabel);
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
