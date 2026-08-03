import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { GeoScopeMapComponent } from '../geo-scope-map/geo-scope-map.component';
import { GetGeoScopeService } from '@services/get-geo-scope.service';
import {
  GeoScopeCountrySummary,
  GeoScopeMetric,
  GeoScopeSubNationalSummary
} from '@interfaces/geo-scope-card.interface';

@Component({
  selector: 'app-geo-scope-card',
  standalone: true,
  imports: [ProjectDashboardCardComponent, GeoScopeMapComponent],
  templateUrl: './geo-scope-card.component.html',
  host: {
    class: 'flex h-full w-full'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeoScopeCardComponent {
  readonly service = inject(GetGeoScopeService);

  readonly isEmpty = computed(() => {
    if (this.service.loading() || this.service.loadError()) {
      return false;
    }

    const summary = this.service.summary();
    const summaryTotal =
      Number(summary.global ?? 0) +
      Number(summary.regional ?? 0) +
      Number(summary.countries ?? 0) +
      Number(summary.sub_national ?? 0) +
      Number(summary.yet_to_be_determined ?? 0);

    return summaryTotal === 0 && this.service.topRegionsList().length === 0 && this.service.topCountries().length === 0;
  });

  readonly summaryMetrics = computed<GeoScopeMetric[]>(() => {
    const summary = this.service.summary();
    if (!Object.keys(summary).length) {
      return [];
    }

    return [
      { key: 'global', label: 'Global', value: Number(summary.global ?? 0) },
      { key: 'regional', label: 'Regional', value: Number(summary.regional ?? 0) },
      { key: 'countries', label: 'Countries', value: Number(summary.countries ?? 0) },
      { key: 'sub_national', label: 'Sub-national', value: Number(summary.sub_national ?? 0) },
      { key: 'yet_to_be_determined', label: 'Yet to be determined', value: Number(summary.yet_to_be_determined ?? 0) }
    ];
  });

  readonly visibleSummaryMetrics = computed(() => this.summaryMetrics().filter(metric => metric.value > 0));

  readonly topCountries = computed<GeoScopeCountrySummary[]>(() =>
    [...this.service.topCountries()]
      .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0))
      .map(country => ({
        id: country.iso_alpha_2 ?? country.country_name,
        label: country.country_name,
        count: Number(country.count ?? country.results_count ?? 0),
        subNationals: (country.top_sub_nationals ?? [])
          .slice()
          .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0))
          .slice(0, 3)
          .map(subNational => ({
            id: String(subNational.sub_national_id),
            label: subNational.sub_national_name,
            countryName: country.country_name,
            count: Number(subNational.count ?? 0)
          }))
      }))
  );

  readonly topSubNationals = computed<GeoScopeSubNationalSummary[]>(() =>
    this.topCountries()
      .flatMap(country => country.subNationals)
      .sort((first, second) => second.count - first.count)
      .slice(0, 6)
  );

  readonly topRegions = computed(() =>
    this.service.topRegionsList().map((item, index) => ({
      id: item.region_name ?? String(index),
      label: item.region_name ?? '—',
      count: Number(item.results_count ?? item.count ?? 0)
    }))
  );

  readonly topCountryItems = computed(() =>
    this.topCountries().map(country => ({
      id: country.id,
      label: country.label,
      count: country.count
    }))
  );

  readonly topSubNationalItems = computed(() =>
    this.topSubNationals().map(subNational => ({
      id: subNational.id,
      label: subNational.label,
      count: subNational.count
    }))
  );
}
