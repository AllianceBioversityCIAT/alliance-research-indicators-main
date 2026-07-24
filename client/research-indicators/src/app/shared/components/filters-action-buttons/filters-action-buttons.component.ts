import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-filters-action-buttons',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './filters-action-buttons.component.html'
})
export class FiltersActionButtonsComponent {
  @Input() showExportButton = false;
  @Input() exportLabel = 'Export metadata results';
  @Input() isExportLoading = false;
  @Input() showViewToggleButtons = false;
  @Input() isTableView = false;

  @Input() showConfigButton = false;

  @Output() export = new EventEmitter<void>();
  @Output() tableView = new EventEmitter<void>();
  @Output() cardView = new EventEmitter<void>();
  @Output() config = new EventEmitter<void>();
}
