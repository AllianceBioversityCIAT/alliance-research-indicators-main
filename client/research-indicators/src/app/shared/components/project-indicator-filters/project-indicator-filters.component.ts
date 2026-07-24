import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, output } from '@angular/core';
import { GetContractsByUser, IndicatorElement } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetail, GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';

@Component({
  selector: 'app-project-indicator-filters',
  templateUrl: './project-indicator-filters.component.html'
})
export class ProjectIndicatorFiltersComponent implements OnInit, OnChanges {
  @Input() project: GetContractsByUser | GetProjectDetail | FindContracts = {};
  @Input() enableIndicatorFilter = false;
  @Input() isPoolFunding = false;
  @Input() enableFilter = false;

  indicatorClick = output<{ indicator_id: number; name: string }>();

  private readonly projectUtils = inject(ProjectUtilsService);
  private readonly resultsCenterService = inject(ResultsCenterService, { optional: true });

  filteredIndicatorIds = computed(() => {
    if (!this.resultsCenterService || !this.enableFilter) {
      return new Set<number>();
    }
    return new Set(this.resultsCenterService.tableFilters().indicators.map(ind => ind.indicator_id));
  });

  processedIndicators: (IndicatorElement | GetProjectDetailIndicator)[] = [];

  ngOnInit(): void {
    this.processIndicators();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) {
      this.processIndicators();
    }
  }

  private processIndicators(): void {
    if (this.project?.indicators && this.project.indicators.length > 0) {
      this.processedIndicators = this.projectUtils.sortIndicators([...this.project.indicators]);
    } else {
      this.processedIndicators = [];
    }
  }

  onIndicatorClick(indicator: IndicatorElement | GetProjectDetailIndicator, event: Event): void {
    if (!this.enableFilter) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const indicatorId = indicator.indicator_id || indicator.indicator?.indicator_id;
    const indicatorName = indicator.indicator?.name || '';
    if (indicatorId) {
      this.indicatorClick.emit({ indicator_id: indicatorId, name: indicatorName });
    }
  }

  isIndicatorFiltered(indicator: IndicatorElement | GetProjectDetailIndicator): boolean {
    if (!this.enableFilter || !this.resultsCenterService) {
      return false;
    }
    const indicatorId = indicator.indicator_id || indicator.indicator?.indicator_id;
    return indicatorId ? this.filteredIndicatorIds().has(indicatorId) : false;
  }

  formatIndicatorLabel(name: string | undefined): string {
    if (!name) return '';
    const max = 15;
    if (name.length <= max) return name;
    const body = name.slice(0, max - 1).trimEnd();
    return `${body}.`;
  }
}
