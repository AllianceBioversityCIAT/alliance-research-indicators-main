import { Component, Input } from '@angular/core';
import { STATUS_COLOR_MAP } from '@shared/constants/status-colors';
import { TooltipModule } from 'primeng/tooltip';

/** Every pool-funding tag reads the same, whatever label the caller passes. */
export const POOL_FUNDING_TAG_LABEL = 'Contributing to CGIAR Portfolio';
export const POOL_FUNDING_TAG_TOOLTIP = 'Contributing to CGIAR Portfolio (Science Programs and Accelerators)';

@Component({
  selector: 'app-custom-tag',
  imports: [TooltipModule],
  templateUrl: './custom-tag.component.html'
})
export class CustomTagComponent {
  @Input() statusId: string | number = '';
  @Input() statusName = '';
  @Input() statusColor?: string;
  @Input() statusBackground?: string;
  @Input() statusBorder?: string;
  @Input() tiny = false;
  @Input() icon = false;
  @Input() iconColor?: string;
  @Input() iconName?: string;
  @Input() tooltip?: string;
  @Input() textSizePx?: number | null;
  @Input() maxWidth?: string;
  @Input() multiline = false;

  isPoolFunding(): boolean {
    return String(this.statusId) === 'pool-funding';
  }

  displayName(): string {
    return this.isPoolFunding() ? POOL_FUNDING_TAG_LABEL : this.statusName;
  }

  /** Tooltip of the info icon; the pool-funding tag always shows its explanation there. */
  iconTooltip(): string | undefined {
    return this.isPoolFunding() ? POOL_FUNDING_TAG_TOOLTIP : this.tooltip;
  }

  getColors() {
    const status = String(this.statusId);
    return STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP[''];
  }
}
