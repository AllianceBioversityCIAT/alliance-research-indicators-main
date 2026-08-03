import { Component, Input } from '@angular/core';
import { STATUS_COLOR_MAP } from '@shared/constants/status-colors';
import { TooltipModule } from 'primeng/tooltip';

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

  getColors() {
    const status = String(this.statusId);
    return STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP[''];
  }
}
