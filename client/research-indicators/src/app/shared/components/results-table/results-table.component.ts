import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { Result, ResultTable } from '../../interfaces/result.interface';

@Component({
  selector: 'app-results-table',
  standalone: true,
  imports: [TableModule, InputTextModule, TagModule, DropdownModule, MultiSelectModule, ProgressBarModule, ButtonModule, FormsModule, CardModule, TabViewModule],
  templateUrl: './results-table.component.html',
  styleUrl: './results-table.component.scss'
})
export class ResultsTableComponent implements OnInit {
  api = inject(ApiService);
  results: WritableSignal<Result[]> = signal([]);

  loading = signal(true);

  activityValues: number[] = [0, 100];

  searchValue: string | undefined;

  columns: ResultTable[] = [
    { attr: 'code', header: 'Code' },
    { attr: 'title', header: 'Title' },
    { attr: 'indicator', header: 'Indicator' },
    { attr: 'status', header: 'Status' },
    { attr: 'project', header: 'Project' },
    { attr: 'lever', header: 'Lever' },
    { attr: 'year', header: 'Year' },
    { attr: 'result_owner', header: 'Result Owner' },
    { attr: 'created_by', header: 'Created By' },
    { attr: 'creation_date', header: 'Creation Date' }
  ];

  GET_results = async () => this.results.set((await this.api.GET_results()).data);

  ngOnInit() {
    this.GET_results();
    setTimeout(() => {
      this.loading.set(false);
    }, 1000);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  getSeverity(status: string) {
    switch (status.toLowerCase()) {
      case 'unqualified':
        return 'danger';

      case 'qualified':
        return 'success';

      case 'new':
        return 'info';

      case 'negotiation':
        return 'warning';

      case 'renewal':
        return null;
    }
    return null;
  }
  // }
}
