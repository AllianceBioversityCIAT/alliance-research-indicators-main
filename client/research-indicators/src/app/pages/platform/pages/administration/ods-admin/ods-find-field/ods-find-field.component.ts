import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';

// @akili-spec institutional-performance/strategy-framework T-23 — design §6.3, §6.6, D-STF-40.
// The labelled find field. The parent owns the query and binds it back, so a re-created field shows the same term.

@Component({
  selector: 'app-ods-find-field',
  standalone: true,
  imports: [InputTextModule],
  templateUrl: './ods-find-field.component.html',
  styleUrl: './ods-find-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OdsFindFieldComponent {
  readonly label = input('Find by code or name');
  readonly placeholder = input('Find by code or name');
  readonly inputId = input('ods-find-field');
  readonly inputTestId = input('ods-find-field');
  readonly clearTestId = input('ods-find-clear');

  /** The parent's query. The clear button follows this, not a private copy. */
  readonly value = input('');

  readonly queryChange = output<string>();

  onInput(event: Event): void {
    const next = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.queryChange.emit(next);
  }

  clear(): void {
    this.queryChange.emit('');
  }
}
