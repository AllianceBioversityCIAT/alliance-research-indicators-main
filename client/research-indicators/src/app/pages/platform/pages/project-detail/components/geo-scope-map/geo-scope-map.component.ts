import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input
} from '@angular/core';
import * as echarts from 'echarts/core';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { chartTokens } from '@shared/utils/chart-tokens.util';
import {
  GEO_ISO_EXCEPTIONS_MAP,
  buildGeoChoroplethSeriesData,
  buildGeoChoroplethTableModel,
  getGeoChoroplethMaxCount,
  getGeometryValidIsoSet
} from '@shared/utils/geo-choropleth.util';
import {
  EChartsOption,
  VizChartComponent,
  VizChartTableModel
} from '@shared/components/viz-chart/viz-chart.component';
import type { GeoScopeCountry } from '@interfaces/geo-scope.interface';
import worldCountriesGeoJson from './world-countries.geo.json';

// Idempotent map registration: register geometry once per application lifetime
function ensureWorldMapRegistered(): void {
  if (typeof echarts !== 'undefined' && typeof echarts.getMap === 'function' && !echarts.getMap('world')) {
    echarts.registerMap('world', worldCountriesGeoJson as never);
  }
}
ensureWorldMapRegistered();

const validGeometryIsoSet = getGeometryValidIsoSet(worldCountriesGeoJson);

@Component({
  selector: 'app-geo-scope-map',
  standalone: true,
  imports: [VizChartComponent],
  templateUrl: './geo-scope-map.component.html',
  styleUrl: './geo-scope-map.component.scss',
  host: {
    class: 'block h-full w-full'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeoScopeMapComponent {
  private readonly darkModeService = inject(DarkModeService);
  readonly tokens = chartTokens(this.darkModeService.darkMode());

  readonly countries = input<readonly GeoScopeCountry[] | null | undefined>([]);

  readonly safeCountries = computed(() => {
    const raw = this.countries();
    return Array.isArray(raw) ? raw : [];
  });

  readonly hasData = computed(() => this.safeCountries().length > 0);

  readonly tableModel = computed<VizChartTableModel | null>(() => {
    if (!this.hasData()) {
      return null;
    }
    return buildGeoChoroplethTableModel(this.safeCountries());
  });

  private readonly countryNameByIso = computed(() => {
    const map = new Map<string, string>();
    for (const c of this.safeCountries()) {
      if (c?.iso_alpha_2 && typeof c.iso_alpha_2 === 'string') {
        const code = c.iso_alpha_2.trim().toUpperCase();
        map.set(code, c.country_name);
        const mappedException = GEO_ISO_EXCEPTIONS_MAP[code];
        if (mappedException) {
          map.set(mappedException, c.country_name);
        }
      }
    }
    return map;
  });

  readonly options = computed<EChartsOption | null>(() => {
    if (!this.hasData()) {
      return null;
    }

    ensureWorldMapRegistered();

    const countries = this.safeCountries();
    const seriesData = buildGeoChoroplethSeriesData(countries, validGeometryIsoSet);
    const maxCount = getGeoChoroplethMaxCount(countries);
    const countryNames = this.countryNameByIso();
    const ramp = this.tokens().ramp;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const item = params as {
            name?: string;
            value?: number;
            data?: { name?: string; value?: number };
          };
          if (!item) return '';
          const code = item.name ?? item.data?.name ?? '';
          const countryName = countryNames.get(code) ?? code;
          const value = item.value ?? item.data?.value;
          if (value === undefined || value === null || isNaN(Number(value))) {
            return '';
          }
          return `<strong>${countryName}</strong>: ${value}`;
        }
      },
      visualMap: {
        type: 'continuous',
        min: 1,
        max: maxCount,
        inRange: {
          color: ramp
        },
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        text: ['High', 'Low'],
        textStyle: {
          color: 'var(--ac-grey-700)',
          fontFamily: 'Barlow',
          fontSize: 11
        },
        itemWidth: 12,
        itemHeight: 140
      },
      series: [
        {
          name: 'Geographic Reach',
          type: 'map',
          map: 'world',
          nameProperty: 'ISO_A2',
          roam: false,
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: 'var(--ac-primary-blue-400)',
              borderColor: 'var(--ac-white-1)'
            }
          },
          select: {
            disabled: true
          },
          itemStyle: {
            areaColor: 'var(--ac-grey-100)',
            borderColor: 'var(--ac-grey-300)',
            borderWidth: 0.5
          },
          data: seriesData
        }
      ]
    };
  });
}
