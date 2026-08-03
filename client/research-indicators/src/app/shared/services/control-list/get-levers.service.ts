import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetLevers, GetLeversParams } from '@shared/interfaces/get-levers.interface';

@Injectable({
  providedIn: 'root'
})
export class GetLeversService {
  apiService = inject(ApiService);
  loading = signal(true);

  list = signal<GetLevers[]>([]);
  isOpenSearch = signal(false);
  private readonly listsByParams = new Map<string, ReturnType<typeof signal<GetLevers[]>>>();
  private readonly loadingByParams = new Map<string, ReturnType<typeof signal<boolean>>>();
  constructor() {
    this.main();
  }

  async main(params?: GetLeversParams) {
    const listSignal = this.getList(params);
    const loadingSignal = this.getLoading(params);
    loadingSignal.set(true);
    try {
      const response = await this.apiService.GET_Levers(params);
      const data = Array.isArray(response?.data) ? response.data.map((lever: GetLevers) => ({ ...lever, lever_id: lever?.id })) : [];
      listSignal.set(data);
    } catch {
      listSignal.set([]);
    } finally {
      loadingSignal.set(false);
    }
  }

  getList(params?: GetLeversParams) {
    if (!params) return this.list;
    const key = this.paramsKey(params);
    if (!this.listsByParams.has(key)) this.listsByParams.set(key, signal<GetLevers[]>([]));
    return this.listsByParams.get(key) ?? this.list;
  }

  getLoading(params?: GetLeversParams) {
    if (!params) return this.loading;
    const key = this.paramsKey(params);
    if (!this.loadingByParams.has(key)) this.loadingByParams.set(key, signal<boolean>(true));
    return this.loadingByParams.get(key) ?? this.loading;
  }

  private paramsKey(params: GetLeversParams): string {
    return `${params.portfolioId ?? ''}:${params.reportYear ?? ''}`;
  }
}
