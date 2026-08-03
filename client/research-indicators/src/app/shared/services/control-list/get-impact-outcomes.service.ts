import { Injectable, inject, signal } from '@angular/core';
import { PortfolioConfigItem, PortfolioScopedParams } from '@shared/interfaces/portfolio-config.interface';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class GetImpactOutcomesService {
  private readonly api = inject(ApiService);

  readonly list = signal<PortfolioConfigItem[]>([]);
  readonly loading = signal(true);
  readonly isOpenSearch = signal(false);
  private readonly listsByParams = new Map<string, ReturnType<typeof signal<PortfolioConfigItem[]>>>();
  private readonly loadingByParams = new Map<string, ReturnType<typeof signal<boolean>>>();

  constructor() {
    this.main();
  }

  async main(params?: PortfolioScopedParams): Promise<void> {
    const listSignal = this.getList(params);
    const loadingSignal = this.getLoading(params);
    loadingSignal.set(true);
    try {
      const response = await this.api.GET_ImpactOutcomes(params);
      listSignal.set(Array.isArray(response?.data) ? response.data : []);
    } catch {
      listSignal.set([]);
    } finally {
      loadingSignal.set(false);
    }
  }

  getList(params?: PortfolioScopedParams) {
    if (!params) return this.list;
    const key = this.paramsKey(params);
    if (!this.listsByParams.has(key)) this.listsByParams.set(key, signal<PortfolioConfigItem[]>([]));
    return this.listsByParams.get(key) ?? this.list;
  }

  getLoading(params?: PortfolioScopedParams) {
    if (!params) return this.loading;
    const key = this.paramsKey(params);
    if (!this.loadingByParams.has(key)) this.loadingByParams.set(key, signal<boolean>(true));
    return this.loadingByParams.get(key) ?? this.loading;
  }

  private paramsKey(params: PortfolioScopedParams): string {
    return `${params.portfolioId ?? ''}:${params.reportYear ?? ''}`;
  }
}
