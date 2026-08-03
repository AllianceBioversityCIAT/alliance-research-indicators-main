import { DatePipe } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { GetContractsByUser, IndicatorElement } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetail, GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';
import { CustomTagComponent } from '../custom-tag/custom-tag.component';
import { ProjectType, ProjectUtilsService } from '@shared/services/project-utils.service';

type ProjectItemIndicator = IndicatorElement | GetProjectDetailIndicator;

@Component({
  selector: 'app-project-item',
  standalone: true,
  imports: [DatePipe, CustomTagComponent],
  templateUrl: './project-item.component.html',
  styleUrl: './project-item.component.scss'
})
export class ProjectItemComponent implements OnInit, OnChanges {
  private readonly projectUtils = inject(ProjectUtilsService);
  private readonly resultsCenterService = inject(ResultsCenterService, { optional: true });

  @Input() project: Partial<GetContractsByUser & GetProjectDetail> = {};
  @Input() isHeader = false;
  @Input() isPoolFunding = false;
  @Input() enableIndicatorFilter = false;

  @Output() indicatorClick = new EventEmitter<{ indicator_id: number; name: string }>();

  processedIndicators: ProjectItemIndicator[] = [];

  readonly filteredIndicatorIds = computed(() => {
    if (!this.enableIndicatorFilter || !this.resultsCenterService) return new Set<number>();

    const indicators = this.resultsCenterService.tableFilters().indicators ?? [];
    return new Set(indicators.map(indicator => indicator.indicator_id).filter((indicatorId): indicatorId is number => typeof indicatorId === 'number'));
  });

  ngOnInit(): void {
    this.processIndicators();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) {
      this.processIndicators();
    }
  }

  getStatusDisplay(): { statusId: number; statusName: string } {
    return this.projectUtils.getStatusDisplay(this.project as ProjectType);
  }

  getLeverName(): string {
    return this.projectUtils.getLeverName(this.project as ProjectType);
  }

  hasField(fieldName: string): boolean {
    return this.projectUtils.hasField(this.project as ProjectType, fieldName);
  }

  onIndicatorClick(indicator: ProjectItemIndicator, event: Event): void {
    if (!this.enableIndicatorFilter) return;

    event.preventDefault();
    event.stopPropagation();

    const indicatorId = this.getIndicatorId(indicator);
    if (indicatorId === null) return;

    this.indicatorClick.emit({
      indicator_id: indicatorId,
      name: indicator.indicator?.name ?? ''
    });
  }

  isIndicatorFiltered(indicator: ProjectItemIndicator): boolean {
    if (!this.enableIndicatorFilter || !this.resultsCenterService) return false;

    const indicatorId = this.getIndicatorId(indicator);
    return indicatorId !== null && this.filteredIndicatorIds().has(indicatorId);
  }

  formatIndicatorLabel(label?: string): string {
    if (!label) return '';
    if (label.length <= 21) return label;

    return `${label.slice(0, 20).replace(/\.+$/, '')}.`;
  }

  private processIndicators(): void {
    this.processedIndicators = this.project.indicators?.length ? this.projectUtils.sortIndicators(this.project.indicators as ProjectItemIndicator[]) : [];
  }

  private getIndicatorId(indicator: ProjectItemIndicator): number | null {
    return indicator.indicator_id ?? indicator.indicator?.indicator_id ?? null;
  }
}
