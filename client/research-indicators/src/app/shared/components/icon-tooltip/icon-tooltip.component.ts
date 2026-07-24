import { Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-icon-tooltip',
  imports: [TooltipModule],
  templateUrl: './icon-tooltip.component.html',
  styleUrl: './icon-tooltip.component.scss'
})
export class IconTooltipComponent {
  @Input() tooltip = '';
  @Input() iconName = 'pi-exclamation-circle';
  @Input() iconColor?: string;
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'right';
  @Input() rotate = true;
  @Input() iconClass = 'shrink-0 xl:!text-[12px] !text-[10px] pl-1.5';
}
