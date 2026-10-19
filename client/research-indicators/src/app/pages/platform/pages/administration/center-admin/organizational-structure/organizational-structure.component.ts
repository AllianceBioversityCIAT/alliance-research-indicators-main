import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import { OrgTableRow, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { ApiService } from '@shared/services/api.service';
import { OrgTreeComponent } from './components/org-tree/org-tree.component';
import { OrgLifecycleDone } from './components/org-lifecycle-dialog/org-lifecycle-dialog.component';
import { OrgUnitFormPrefill } from './components/org-unit-form/org-unit-form.component';
import { OrgUnitPanelComponent } from './components/org-unit-panel/org-unit-panel.component';
import { nextLevelId } from './utils/org-form.util';
import { OrgLevelCounts, buildOrgTree, countByLevel, toTableRows, visibleRows } from './utils/org-tree.util';

type OrgView = 'tree' | 'table';

// @akili-spec institutional-performance/organizational-structure T-01 (client half)
// design §2.1, §4 (B1, B2, B5), §6.2–6.4, §6.8; requirements R-ORG-001, R-ORG-006, R-ORG-012,
// R-ORG-013, R-ORG-014. Read-only slice: header, year selector, Tree / Table toggle, filter, count
// chips, split layout with an empty right panel. No portfolio selector anywhere (R-ORG-001).
@Component({
  selector: 'app-organizational-structure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CustomProgressBarComponent,
    DataTableComponent,
    OrgTreeComponent,
    OrgUnitPanelComponent
  ],
  templateUrl: './organizational-structure.component.html',
  styleUrl: './organizational-structure.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class OrganizationalStructureComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly years = signal<OrgYearRange | null>(null);
  readonly year = signal<number | null>(null);
  readonly includeEnded = signal(false);
  readonly view = signal<OrgView>('tree');
  readonly rows = signal<OrgYearViewRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly selectedId = signal<number | null>(null);
  /** *+ New entry* (or a row **+**) opens the empty form in the right panel (T-02). */
  readonly creating = signal(false);
  /** Parent and level a row **+** pre-fills; `null` for the header button. */
  readonly prefill = signal<OrgUnitFormPrefill | null>(null);
  /** Bumped on every open and every save so the form is rebuilt from the freshly loaded rows. */
  readonly formVersion = signal(0);
  readonly formKey = computed(() => `${this.creating() ? 'new' : this.selectedId()}-${this.formVersion()}`);

  // Guards a slow response for a year the admin has already left (same technique as control-lists).
  private loadToken = 0;

  readonly yearOptions = computed<number[]>(() => {
    const range = this.years();
    if (!range) return [];
    const options: number[] = [];
    for (let y = range.min; y <= range.max; y++) options.push(y);
    return options;
  });

  readonly shownRows = computed(() => {
    const year = this.year();
    return year === null ? [] : visibleRows(this.rows(), year, this.includeEnded());
  });
  readonly treeNodes = computed(() => {
    const year = this.year();
    return year === null ? [] : buildOrgTree(this.rows(), year, this.includeEnded());
  });
  readonly tableRows = computed<OrgTableRow[]>(() => {
    const year = this.year();
    return year === null ? [] : toTableRows(this.rows(), year, this.includeEnded());
  });
  readonly counts = computed<OrgLevelCounts>(() => countByLevel(this.shownRows()));
  readonly selectedRow = computed(() => this.shownRows().find(row => row.id === this.selectedId()) ?? null);

  /** Module empty (no year with any version) vs. empty only in the chosen year (R-ORG-013 UI states). */
  readonly moduleEmpty = computed(() => {
    const range = this.years();
    return this.shownRows().length === 0 && range !== null && range.min === range.max;
  });
  readonly yearEmpty = computed(() => this.shownRows().length === 0 && !this.moduleEmpty());

  readonly tableExportFileName = computed(() => `organizational-structure_${this.year() ?? ''}.xlsx`);

  // Delegates are the CURRENT list whatever the year (R-ORG-017), so the header says so.
  readonly tableColumns: DataTableColumn<OrgTableRow>[] = [
    { field: 'id', header: 'ID', width: '70px' },
    { field: 'code', header: 'Code', type: 'code', width: '110px' },
    { field: 'level', header: 'Level', width: '130px' },
    { field: 'name', header: 'Name' },
    { field: 'acronym', header: 'Acronym', width: '100px' },
    { field: 'parent', header: 'Parent' },
    { field: 'director', header: 'Director' },
    { field: 'delegates', header: 'Delegates (current)' },
    { field: 'status', header: 'Status' },
    { field: 'since', header: 'Since', width: '80px' }
  ];
  readonly tableSearchFields: (keyof OrgTableRow & string)[] = ['code', 'name', 'acronym', 'director', 'delegates'];

  ngOnInit(): void {
    void this.load();
  }

  /** Loads the year range once (B2), then the year view (B1). *Retry* calls this again. */
  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      if (this.years() === null) {
        const response = await this.api.GET_OrgStructureYears();
        if (response?.successfulRequest === false || !response?.data) {
          this.fail();
          return;
        }
        this.years.set(response.data);
        this.year.set(response.data.current);
      }
      await this.loadUnits();
    } catch {
      this.fail();
    }
  }

  async onYearChange(year: number): Promise<void> {
    if (year === this.year()) return;
    this.year.set(year);
    await this.loadUnits();
  }

  async onIncludeEndedChange(checked: boolean): Promise<void> {
    this.includeEnded.set(checked);
    await this.loadUnits();
  }

  setView(view: OrgView): void {
    this.view.set(view);
  }

  selectUnit(id: number): void {
    this.creating.set(false);
    this.selectedId.set(id);
    this.formVersion.update(v => v + 1);
  }

  startCreate(prefill: OrgUnitFormPrefill | null = null): void {
    this.selectedId.set(null);
    this.prefill.set(prefill);
    this.creating.set(true);
    this.formVersion.update(v => v + 1);
  }

  startCreateChild(parent: OrgYearViewRow): void {
    this.startCreate({ parentId: parent.id, levelId: nextLevelId(parent.version.levelCode) });
  }

  closeForm(): void {
    this.creating.set(false);
    this.selectedId.set(null);
  }

  /**
   * After a save the selectable years can have grown (B2) and the year view has changed (B1): both
   * are reloaded, the viewed year is kept, and the saved entry is selected when it is still listed.
   */
  async onSaved(id: number | null): Promise<void> {
    try {
      const years = await this.api.GET_OrgStructureYears();
      if (years?.successfulRequest !== false && years?.data) this.years.set(years.data);
    } catch {
      // The year list keeps its previous range; the rows reload below.
    }
    await this.loadUnits();
    this.creating.set(false);
    this.selectedId.set(id !== null && this.rows().some(row => row.id === id) ? id : null);
    this.formVersion.update(v => v + 1);
  }

  /**
   * After inactivate / reactivate / delete the year view is reloaded exactly as after a save (B2, then B1).
   * A physical delete leaves nothing to reselect, so the selection is cleared (R-ORG-008).
   */
  async onLifecycleDone(done: OrgLifecycleDone): Promise<void> {
    await this.onSaved(done.mode === 'physical' ? null : done.id);
  }

  private async loadUnits(): Promise<void> {
    const year = this.year();
    if (year === null) return;
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const response = await this.api.GET_OrgStructureUnits(year, this.includeEnded());
      if (token !== this.loadToken) return;
      if (response?.successfulRequest === false) {
        this.fail();
        return;
      }
      this.rows.set(response?.data ?? []);
      this.loading.set(false);
    } catch {
      if (token === this.loadToken) this.fail();
    }
  }

  private fail(): void {
    this.rows.set([]);
    this.loadError.set(true);
    this.loading.set(false);
  }
}
