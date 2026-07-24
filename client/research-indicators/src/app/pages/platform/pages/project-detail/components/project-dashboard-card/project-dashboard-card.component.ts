import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import { projectDashboardBarColor } from '@shared/constants/project-dashboard-chart-colors.constants';
import {
  ProjectDashboardChartLayout,
  ProjectDashboardRankedListItem
} from '@interfaces/project-dashboard.interface';

@Component({
  selector: 'app-project-dashboard-card',
  standalone: true,
  imports: [NgTemplateOutlet, ButtonModule, CustomProgressBarComponent, TooltipModule, TruncatedTextTooltipDirective],
  templateUrl: './project-dashboard-card.component.html',
  host: {
    class: 'block h-full',
    '[class.flex]': "variant() === 'list'",
    '[class.h-full]': "variant() === 'list'",
    '[class.min-h-0]': "variant() === 'list'",
    '[class.w-full]': "variant() === 'list'",
    '[class.min-w-0]': "variant() === 'list'",
    '[class.flex-1]': "variant() === 'list'",
    '[class.flex-col]': "variant() === 'list'"
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDashboardCardComponent {
  readonly variant = input<'card' | 'list'>('card');
  readonly title = input('');
  readonly description = input('');
  readonly items = input<readonly ProjectDashboardRankedListItem[]>([]);
  readonly layout = input<ProjectDashboardChartLayout>('columns');
  readonly largeColumns = input(false);
  readonly barHeightClass = input('h-6');
  readonly itemHeightPx = input<number | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly compact = input(false);
  readonly errorMessage = input('We could not load this data. Please try again.');
  readonly emptyMessage = input('No data available for this project yet.');
  readonly iconClass = input('pi pi-chart-bar');
  readonly retry = output<void>();

  readonly maxCount = computed(() => {
    const items = this.items();
    if (!items.length) {
      return 0;
    }
    return Math.max(...items.map(item => item.count), 0);
  });

  readonly totalCount = computed(() => this.items().reduce((sum, item) => sum + item.count, 0));

  fillPercent(count: number): number {
    if (count <= 0) {
      return 0;
    }

    const layout = this.layout();
    if (layout === 'columns' || layout === 'rows-partners') {
      const max = this.maxCount();
      if (max <= 0) {
        return 0;
      }
      return Math.min(100, (count / max) * 100);
    }

    if (layout === 'rows' || layout === 'rows-stacked' || layout === 'rows-stacked-lever') {
      const total = this.totalCount();
      if (total <= 0) {
        return 0;
      }
      return Math.min(100, (count / total) * 100);
    }

    const max = this.maxCount();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (count / max) * 100);
  }

  linkedResultsLabel(count: number): string {
    return count === 1 ? '1 result' : `${count} results`;
  }

  barColor(index: number): string {
    return projectDashboardBarColor(index, this.items().length);
  }

  partnerBarWidthPercent(count: number): number {
    const max = this.maxCount();
    if (max <= 0 || count <= 0) {
      return 0;
    }
    const available = 94;
    return Math.min(available, (count / max) * available);
  }
}
