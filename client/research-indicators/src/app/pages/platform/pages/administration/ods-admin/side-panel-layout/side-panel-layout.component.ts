import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// @akili-spec institutional-performance/strategy-framework T-19 — design §6.9, D-STF-31, R-STF-016.
// List and panel slots. The page column owns the viewport height (P-46).
// jsdom cannot judge whether the panel fits the viewport (KZ-017).
@Component({
  selector: 'app-side-panel-layout',
  standalone: true,
  templateUrl: './side-panel-layout.component.html',
  styleUrl: './side-panel-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidePanelLayoutComponent {
  readonly hasSelection = input(false);
  readonly creating = input(false);
  readonly emptyText = input('Select an entry to see its details.');
  readonly panelLabel = input('Element details');
}
