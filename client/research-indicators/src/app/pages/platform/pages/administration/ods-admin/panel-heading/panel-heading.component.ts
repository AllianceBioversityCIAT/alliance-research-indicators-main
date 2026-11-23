import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// @akili-spec institutional-performance/strategy-framework T-17 — mockup artboards 3 and 4.
// One header for both drawers: uppercase eyebrow, optional code pill, title.
@Component({
  selector: 'app-panel-heading',
  standalone: true,
  templateUrl: './panel-heading.component.html',
  styleUrl: './panel-heading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelHeadingComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  /** Empty hides the pill. Create mode stays pill-less until a code exists. */
  readonly code = input<string | null>(null);
}
