import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { GetContracts } from '../../interfaces/get-contracts.interface';

@Injectable({
  providedIn: 'root'
})
export class GetContractsService {
  api = inject(ApiService);
  list = signal<GetContracts[]>([]);
  filteredList = signal<GetContracts[]>([]);
  aiAssistantList = signal<GetContracts[]>([]);
  loading = signal(true);
  filteredLoading = signal(false);
  aiAssistantLoading = signal(false);
  isOpenSearch = signal(false);
  constructor() {
    this.initialize();
  }

  initialize() {
    this.main();
  }

  async main(filters?: {
    'current-user'?: boolean;
    'contract-code'?: string;
    'project-name'?: string;
    'principal-investigator'?: string;
    lever?: string;
    status?: string;
    'start-date'?: string;
    'order-field'?: string;
    direction?: string;
    'end-date'?: string;
    query?: string;
    page?: string;
    limit?: string;
    project?: string;
    'exclude-pooled-funding'?: boolean;
    'with-indicators'?: boolean;
  }) {
    // Use filteredList if exclude-pooled-funding filter is present
    const useFilteredList = filters?.['exclude-pooled-funding'] !== undefined;
    const targetList = useFilteredList ? this.filteredList : this.list;
    const targetLoading = useFilteredList ? this.filteredLoading : this.loading;

    targetLoading.set(true);
    try {
      const response = await this.api.GET_FindContracts({
        ...filters,
        'with-indicators': false
      });

      if (response?.data?.data && Array.isArray(response.data.data)) {
        targetList.set(response.data.data as GetContracts[]);

        targetList.update(current =>
          current.map(item => ({
            ...item,
            select_label: item.agreement_id + ' - ' + item.description,
            contract_id: item.agreement_id
          }))
        );
      } else {
        targetList.set([]);
      }
    } catch (e) {
      console.error('Failed to fetch contracts:', e);
      targetList.set([]);
    } finally {
      targetLoading.set(false);
    }
  }

  getList(filters?: { 'exclude-pooled-funding'?: boolean }): typeof this.list {
    if (filters?.['exclude-pooled-funding'] !== undefined) {
      return this.filteredList;
    }
    return this.list;
  }

  getLoading(filters?: { 'exclude-pooled-funding'?: boolean }): typeof this.loading {
    if (filters?.['exclude-pooled-funding'] !== undefined) {
      return this.filteredLoading;
    }
    return this.loading;
  }

  // Method specifically for AI Assistant component - always uses exclude-pooled-funding filter
  async mainForAiAssistant() {
    this.aiAssistantLoading.set(true);
    try {
      const response = await this.api.GET_FindContracts({
        'exclude-pooled-funding': true,
        'with-indicators': false
      });

      if (response?.data?.data && Array.isArray(response.data.data)) {
        this.aiAssistantList.set(response.data.data as GetContracts[]);

        this.aiAssistantList.update(current =>
          current.map(item => ({
            ...item,
            select_label: item.agreement_id + ' - ' + item.description,
            contract_id: item.agreement_id
          }))
        );
      } else {
        this.aiAssistantList.set([]);
      }
    } catch (e) {
      console.error('Failed to fetch contracts for AI Assistant:', e);
      this.aiAssistantList.set([]);
    } finally {
      this.aiAssistantLoading.set(false);
    }
  }
}
