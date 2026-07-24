import { Component, Input, computed, inject, output } from '@angular/core';
import { PLATFORM_COLOR_MAP } from '@shared/constants/platform-colors';
import { SOURCE_FILTER_OPTIONS } from '@shared/constants/source-filter-options.constants';
import { PlatformSourceFilter } from '@shared/interfaces/platform-source-filter.interface';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';

@Component({
  selector: 'app-project-platform-filters',
  templateUrl: './project-platform-filters.component.html'
})
export class ProjectPlatformFiltersComponent {
  @Input() enableFilter = false;

  platformClick = output<PlatformSourceFilter>();

  readonly platformOptions = SOURCE_FILTER_OPTIONS;

  private readonly resultsCenterService = inject(ResultsCenterService, { optional: true });

  filteredPlatformCodes = computed(() => {
    if (!this.resultsCenterService || !this.enableFilter) {
      return new Set<string>();
    }
    return new Set((this.resultsCenterService.tableFilters().sources ?? []).map(source => source.platform_code));
  });

  getPlatformColors(platformCode: string): { text: string; background: string } | undefined {
    return PLATFORM_COLOR_MAP[platformCode];
  }

  onPlatformClick(platform: PlatformSourceFilter, event: Event): void {
    if (!this.enableFilter) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.platformClick.emit(platform);
  }

  isPlatformFiltered(platform: PlatformSourceFilter): boolean {
    if (!this.enableFilter || !this.resultsCenterService) {
      return false;
    }
    return this.filteredPlatformCodes().has(platform.platform_code);
  }
}
