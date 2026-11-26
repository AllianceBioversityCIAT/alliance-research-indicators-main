import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// @akili-spec institutional-performance/strategy-framework T-23 — design §6.9, D-STF-39, R-STF-016.
// Both pages pass the circle, the title and the rows. The panel does not know which page it is.

export interface OdsEmptyRow {
  icon: string;
  label: string;
  description: string;
  accent: boolean;
  /** Set by the Framework page so each level keeps its data-depth. */
  depth?: number;
}

@Component({
  selector: 'app-ods-empty-panel',
  standalone: true,
  templateUrl: './ods-empty-panel.component.html',
  styleUrl: './ods-empty-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OdsEmptyPanelComponent {
  readonly circleIcon = input('pi pi-sitemap');
  readonly title = input('Explore the performance framework');
  readonly subtitle = input('Select an item from the hierarchy to see its details and actions.');
  readonly rows = input<readonly OdsEmptyRow[]>([]);
}
