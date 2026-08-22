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

    const isDark = this.darkModeService.darkMode()();
    const countries = this.safeCountries();
    const seriesData = buildGeoChoroplethSeriesData(countries, validGeometryIsoSet);
    const hasCountryData = seriesData.length > 0;
    const maxCount = getGeoChoroplethMaxCount(countries);
    const countryNames = this.countryNameByIso();
    const tokenRamp = this.tokens().ramp;
    const defaultLightRamp = ['#e1f0fa', '#90caf9', '#42a5f5', '#1976d2', '#0d47a1'];
    const defaultDarkRamp = ['#102a43', '#184a77', '#276ab3', '#42a5f5', '#90caf9'];
    const fallbackRamp = isDark ? defaultDarkRamp : defaultLightRamp;
    const validRamp = tokenRamp.filter(c => !!c && c.trim().length > 0).length === 5 ? tokenRamp : fallbackRamp;
    const neutralAreaColor = isDark ? '#2b2b2b' : '#f4f7f9';
    const neutralBorderColor = isDark ? '#4c4c4c' : '#d1d6da';

    const baseOptions: EChartsOption = {
      tooltip: {
        trigger: 'item',
        show: hasCountryData,
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
      series: [
        {
          name: 'Geographic Reach',
          type: 'map',
          map: 'world',
          nameProperty: 'ISO_A2',
          roam: false,
          top: 8,
          bottom: hasCountryData ? 38 : 8,
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: isDark ? '#2e3e51' : '#b0c4dd',
              borderColor: isDark ? '#e5e5e5' : '#ffffff'
            }
          },
          select: {
            disabled: true
          },
          itemStyle: {
            areaColor: neutralAreaColor,
            borderColor: neutralBorderColor,
            borderWidth: 0.5
          },
          data: seriesData
        }
      ]
    };

    if (hasCountryData) {
      baseOptions.visualMap = {
        type: 'continuous',
        min: 1,
        max: maxCount > 1 ? maxCount : 2,
        inRange: {
          color: validRamp
        },
        outOfRange: {
          color: [neutralAreaColor]
        },
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        text: ['High', 'Low'],
        textStyle: {
          color: isDark ? '#acacac' : '#777c83',
          fontFamily: 'Barlow',
          fontSize: 11
        },
        itemWidth: 12,
        itemHeight: 140
      };
    }

    return baseOptions;
  });
}
