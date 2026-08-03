import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ContactPersonRow } from '@shared/interfaces/contact-person.interface';

@Component({
  selector: 'app-authors-contact-persons-table',
  standalone: true,
  imports: [TableModule, ButtonModule, TooltipModule],
  templateUrl: './authors-contact-persons-table.component.html'
})
export class AuthorsContactPersonsTableComponent{
  @Input() rows: ContactPersonRow[] = [];
  @Output() addClicked = new EventEmitter<void>();
  @Output() deleteClicked = new EventEmitter<ContactPersonRow>();
}


