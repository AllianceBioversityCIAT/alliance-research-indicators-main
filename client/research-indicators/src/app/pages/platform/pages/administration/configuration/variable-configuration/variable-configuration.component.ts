import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { RolesService } from '@shared/services/cache/roles.service';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';
import { UNCategorized_FILTER, VariableConfigurationService } from '@shared/services/variable-configuration.service';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { TruncatedTextTooltipDirective } from '@shared/directives/truncated-text-tooltip.directive';
import {
  FacetOption,
  VARIABLE_CONFIG_TABLE_COLUMN_WIDTHS
} from '@shared/interfaces/variable-configuration.interface';

@Component({
  selector: 'app-variable-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    CustomProgressBarComponent,
    TruncatedTextTooltipDirective
  ],
  templateUrl: './variable-configuration.component.html',
  styleUrl: './variable-configuration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class VariableConfigurationComponent implements OnInit {
  readonly service = inject(VariableConfigurationService);
  readonly roles = inject(RolesService);

  readonly tableSearch = signal('');
  readonly rowSearchHaystacks = signal<Record<string, string>>({});

  readonly tableColSpan = computed(() => (this.roles.canEditAppConfiguration() ? 8 : 7));

  /** Column widths in px — edit {@link VARIABLE_CONFIG_TABLE_COLUMN_WIDTHS} to change layout. */
  readonly columnWidths = VARIABLE_CONFIG_TABLE_COLUMN_WIDTHS;

  readonly tableMinWidth = computed(() => {
    const w = this.columnWidths;
    let total = w.category + w.subcategory + w.variableName + w.descriptionMin + w.value + w.lastUpdated + w.updatedBy;
    if (this.roles.canEditAppConfiguration()) {
      total += w.actions;
    }
    return `${total}px`;
  });

  readonly tableStyle = computed(() => ({
    'min-width': this.tableMinWidth(),
    width: '100%',
    'table-layout': 'fixed'
  }));

  fixedColumnStyle(widthPx: number): Record<string, string> {
    return {
      width: `${widthPx}px`,
      minWidth: `${widthPx}px`,
      maxWidth: `${widthPx}px`
    };
  }

  descriptionColumnStyle(): Record<string, string> {
    return {
      minWidth: `${this.columnWidths.descriptionMin}px`,
      width: 'auto',
      maxWidth: 'none'
    };
  }

  readonly hasTableSearch = computed(() => this.tableSearch().trim().length > 0);

  readonly filteredItems = computed(() => {
    const query = this.tableSearch().trim().toLowerCase();
    const items = this.service.items();
    if (!query) return items;
    const haystacks = this.rowSearchHaystacks();
    return items.filter(row => haystacks[row.key]?.includes(query));
  });

  ngOnInit(): void {
    void this.loadPage();
  }

  private async loadPage(): Promise<void> {
    await this.service.reload();
    this.syncSearchHaystacks(this.service.items());
    this.service.syncJsonDrafts(this.service.items());
  }

  facetOptions(values: (string | null)[]): FacetOption[] {
    const opts: FacetOption[] = [{ label: 'All', value: null }];
    const seen = new Set<string>();
    for (const v of values) {
      if (v == null || v === '') {
        if (!seen.has(UNCategorized_FILTER)) {
          seen.add(UNCategorized_FILTER);
          opts.push({ label: 'Uncategorized', value: UNCategorized_FILTER });
        }
      } else if (!seen.has(v)) {
        seen.add(v);
        opts.push({ label: v, value: v });
      }
    }
    return opts;
  }

  displayValue(row: AppConfigListItem): string {
    if (this.service.isJsonConfig(row)) {
      return this.service.jsonSectionsLabel(row);
    }
    if (row.simple_value?.trim()) return row.simple_value;
    return '—';
  }

  formatUpdatedAt(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
      .format(date)
      .toLowerCase();
    return `${datePart} at ${timePart}`;
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.applyFilters();
    }
  }

  applyFilters(): void {
    void this.service.applyFilters().then(() => {
      this.syncSearchHaystacks(this.service.items());
      this.service.syncJsonDrafts(this.service.items());
    });
  }

  clearFilters(): void {
    this.service.resetFilters();
    void this.refreshList();
  }

  setTableSearch(value: string): void {
    this.tableSearch.set(value);
  }

  clearTableSearch(): void {
    this.setTableSearch('');
  }

  openEdit(row: AppConfigListItem): void {
    this.service.openEdit(row);
  }

  private async refreshList(): Promise<void> {
    await this.service.loadList();
    this.syncSearchHaystacks(this.service.items());
    this.service.syncJsonDrafts(this.service.items());
  }

  private syncSearchHaystacks(items: AppConfigListItem[]): void {
    const next: Record<string, string> = {};
    for (const row of items) {
      next[row.key] = this.service.buildRowSearchHaystack(row);
    }
    this.rowSearchHaystacks.set(next);
  }
}
