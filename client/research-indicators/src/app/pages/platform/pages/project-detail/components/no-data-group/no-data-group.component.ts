import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface NoDataGroupItem {
  name: string;
  reason: string;
  iconClass?: string;
}

@Component({
  selector: 'app-no-data-group',
  standalone: true,
  templateUrl: './no-data-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoDataGroupComponent {
  readonly items = input<NoDataGroupItem[]>([]);
}
