import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { GeoScopeCountry } from '@interfaces/geo-scope.interface';
import { PROJECT_DASHBOARD_DEFAULT_LIMIT } from '@shared/constants/country-centroids.constants';
import { GeoScopeSummary, ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';

@Injectable()
export class GetGeoScopeService {
  apiService = inject(ApiService);

  contractId = '';
  limit = PROJECT_DASHBOARD_DEFAULT_LIMIT;

  summary = signal<Partial<GeoScopeSummary>>({});
  topRegionsList = signal<ProjectDashboardRankedItem[]>([]);
  topCountries = signal<GeoScopeCountry[]>([]);
  loading = signal(false);
  loadError = signal(false);

  main(contractId: string, limit = PROJECT_DASHBOARD_DEFAULT_LIMIT) {
    this.contractId = contractId;
    this.limit = limit;
    void this.update();
  }

  update = async () => {
    if (!this.contractId) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.apiService.GET_GeoScope(this.contractId, this.limit);
      const data = response?.data;
      this.summary.set(data?.geo_scope_summary ?? {});
      this.topRegionsList.set(Array.isArray(data?.top_regions) ? data.top_regions : []);
      this.topCountries.set(Array.isArray(data?.top_countries) ? data.top_countries : []);
    } catch {
      this.summary.set({});
      this.topRegionsList.set([]);
      this.topCountries.set([]);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  };
};
