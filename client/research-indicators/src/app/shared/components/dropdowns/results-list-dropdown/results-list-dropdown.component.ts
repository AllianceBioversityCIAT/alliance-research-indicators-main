import { Component, inject, Input, signal } from '@angular/core';
import { GetResultsService } from '../../../services/control-list/get-results.service';
import { ActionsService } from '../../../services/actions.service';
import { FilterByTextWithAttrPipe } from '../../../pipes/filter-by-text-with-attr.pipe';

@Component({
  selector: 'app-results-list-dropdown',
  standalone: true,
  imports: [FilterByTextWithAttrPipe],
  templateUrl: './results-list-dropdown.component.html',
  styleUrl: './results-list-dropdown.component.scss'
})
export class ResultsListDropdownComponent {
  @Input() searchText = signal('');
  getResultsSE = inject(GetResultsService);
  actions = inject(ActionsService);
}
