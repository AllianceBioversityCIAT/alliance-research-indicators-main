import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import { FrameworkContext, FrameworkContextPortfolio, FrameworkObjective, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { naturalCompare } from '@shared/utils/natural-compare.util';
import { exportRowsToXlsx } from '@shared/utils/xlsx-export.util';
import { frameworkErrorOf } from '../framework/utils/framework-error.util';
import { OdsEmptyPanelComponent, OdsEmptyRow } from '../ods-empty-panel/ods-empty-panel.component';
import { OdsFindFieldComponent } from '../ods-find-field/ods-find-field.component';
import { SidePanelLayoutComponent } from '../side-panel-layout/side-panel-layout.component';
import { guardDiscard } from '../unsaved-changes.util';
import { ObjectivePanelComponent } from './components/objective-panel/objective-panel.component';
import { carryForwardMessage, linkedIndicatorsText, objectiveYearLabel } from './objective-view.util';

interface PortfolioOption extends FrameworkContextPortfolio {
  label: string;
}

interface ObjectiveTableRow {
  id: number;
  code: string;
  statement: string;
  linkedIndicatorsText: string;
}

// @akili-spec institutional-performance/strategy-framework T-20 — design §6.6, §6.9, D-STF-29, D-STF-32.
// The page owns selection, create, and the in-place refresh. Every selection change
// goes through guardDiscard. Save, delete and carry forward do not swap in the skeleton.
// jsdom cannot judge viewport fit (KZ-017, P-46).
@Component({
  selector: 'app-institutional-objectives',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    CustomProgressBarComponent,
    DataTableComponent,
    SidePanelLayoutComponent,
    OdsEmptyPanelComponent,
    OdsFindFieldComponent,
    ObjectivePanelComponent
  ],
  templateUrl: './institutional-objectives.component.html',
  styleUrls: ['./institutional-objectives.component.scss', '../ods-table-wrap.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class InstitutionalObjectivesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly cache = inject(CacheService);
  private readonly panel = viewChild(ObjectivePanelComponent);
  /** One-way `[ngModel]` does not write a rejected value back. Only Keep editing calls `writeValue`. */
  private readonly portfolioSelect = viewChild<Select>('portfolioSelect');
  private readonly yearSelect = viewChild<Select>('yearSelect');

  readonly context = signal<FrameworkContext | null>(null);
  readonly portfolioId = signal<number | null>(null);
  readonly years = signal<{ year: number; count: number }[]>([]);
  readonly defaultYear = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly objectives = signal<FrameworkObjective[]>([]);
  readonly framework = signal<FrameworkView | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly carryError = signal<string | null>(null);
  readonly deleteError = signal<string | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly creating = signal(false);
  readonly createToken = signal(0);
  readonly formDirty = signal(false);

  private loadToken = 0;
  private readonly carrying = signal(false);
  private previousSelection: number | null = null;
  private createOpener: HTMLElement | null = null;

  readonly columns: DataTableColumn<ObjectiveTableRow>[] = [
    { field: 'code', header: 'Code', type: 'code', sortable: true, width: '120px' },
    { field: 'statement', header: 'Statement', type: 'text', sortable: true },
    { field: 'linkedIndicatorsText', header: 'Linked indicators', type: 'text', sortable: true }
  ];

  readonly query = signal('');
  readonly exporting = signal(false);

  /** Visible height below the fixed chrome (P-46). The stylesheet subtracts the 24px top gap and releases the height below 1024px. */
  readonly columnHeight = computed(() => `calc(100vh - ${this.cache.navbarHeight() + this.cache.headerHeight()}px)`);

  readonly portfolioOptions = computed<PortfolioOption[]>(() =>
    (this.context()?.portfolios ?? []).map(portfolio => ({ ...portfolio, label: portfolioLabel(portfolio) }))
  );

  readonly selectedPortfolio = computed(() => this.portfolioOptions().find(portfolio => portfolio.id === this.portfolioId()) ?? null);

  readonly yearOptions = computed(() => this.years().map(row => ({ year: row.year, label: objectiveYearLabel(row.year, row.count) })));

  readonly yearNumbers = computed(() => this.years().map(row => row.year));

  readonly objectiveRows = computed<ObjectiveTableRow[]>(() =>
    this.objectives().map(objective => ({
      id: objective.id,
      code: objective.code,
      statement: objective.statement,
      linkedIndicatorsText: linkedIndicatorsText(objective.elements)
    }))
  );

  readonly trimmedQuery = computed(() => this.query().trim());
  readonly visibleRows = computed(() => filterObjectives(this.objectiveRows(), this.query()));
  /** A search over a year that has objectives and hits nothing is not the true-empty state (R-CTL-008). */
  readonly noMatches = computed(
    () => this.trimmedQuery() !== '' && this.objectiveRows().length > 0 && this.visibleRows().length === 0
  );

  /** Null during create, so no row stays highlighted. */
  readonly selectedKey = computed(() => {
    if (this.creating()) return null;
    const id = this.selectedId();
    return id === null ? null : String(id);
  });

  readonly exportFileName = computed(() => `institutional-objectives_${this.year() ?? 'year'}.xlsx`);

  /**
   * Counts shared by the empty panel and the summary line. `objectives` is the
   * selected year's count, the same number the year select shows. `linkedIndicators`
   * is distinct linked indicator ids.
   */
  readonly objectiveCounts = computed(() => {
    const year = this.year();
    const linked = new Set<number>();
    for (const objective of this.objectives()) {
      for (const element of objective.elements) linked.add(element.id);
    }
    return {
      objectives: this.years().find(row => row.year === year)?.count ?? 0,
      linkedIndicators: linked.size,
      year
    };
  });

  readonly objectiveSummary = computed(() => {
    const counts = this.objectiveCounts();
    return `${counts.objectives} objectives · ${counts.linkedIndicators} linked indicators`;
  });

  /** Informational rows for the empty panel. The counts are `objectiveCounts`. */
  readonly emptyRows = computed<OdsEmptyRow[]>(() => {
    const { objectives, linkedIndicators, year } = this.objectiveCounts();
    const next = year === null ? '' : String(year + 1);
    return [
      {
        icon: 'pi pi-flag',
        label: `${objectives} Objectives · ${year ?? ''}`,
        description: 'Institutional objectives for the selected year.',
        accent: false
      },
      {
        icon: 'pi pi-chart-bar',
        label: `${linkedIndicators} Linked indicators`,
        description: "Framework indicators linked to this year's objectives.",
        accent: false
      },
      {
        icon: 'pi pi-copy',
        label: `Carry forward to ${next}`,
        description: "Copy this year's objectives into the next year.",
        accent: false
      }
    ];
  });

  readonly carryLabel = computed(() => {
    const year = this.year();
    return year === null ? 'Carry forward' : `Carry forward to ${year + 1}`;
  });

  /**
   * Unavailable in the portfolio's last year and when the year has no objectives (R-STF-010).
   * The last-year check is what keeps 2030 from being clickable.
   */
  readonly canCarryForward = computed(() => {
    if (this.loading() || this.carrying()) return false;
    const year = this.year();
    const portfolio = this.selectedPortfolio();
    const row = this.years().find(item => item.year === year);
    if (year === null || !portfolio || !row) return false;
    if (year >= portfolio.endYear) return false;
    return row.count > 0;
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    this.carryError.set(null);
    this.deleteError.set(null);
    try {
      const context = await this.api.GET_StrategyFrameworkContext();
      if (token !== this.loadToken) return;
      if (!context?.successfulRequest || !context.data) {
        this.fail(token, context?.errorDetail);
        return;
      }
      this.context.set(context.data);
      const current = this.portfolioId();
      const known = current !== null && context.data.portfolios.some(portfolio => portfolio.id === current);
      const nextId = known ? current : (context.data.defaultPortfolioId ?? context.data.portfolios[0]?.id ?? null);
      this.portfolioId.set(nextId);
      if (nextId === null) {
        this.loading.set(false);
        return;
      }
      await this.loadPortfolio(nextId, token, true);
    } catch (error) {
      this.fail(token, error);
    }
  }

  onDirty(value: boolean): void {
    this.formDirty.set(value);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  onRowSelected(row: ObjectiveTableRow): void {
    this.selectObjective(row.id);
  }

  /** Every row of the selected year, code-sorted. A find-field filter does not narrow the workbook. */
  async exportObjectives(): Promise<void> {
    if (this.loading() || this.exporting() || this.objectiveRows().length === 0) return;
    const rows = [...this.objectiveRows()].sort((left, right) => naturalCompare(left.code, right.code));
    this.exporting.set(true);
    try {
      await exportRowsToXlsx({
        columns: this.columns,
        rows,
        fileName: this.exportFileName()
      });
    } finally {
      this.exporting.set(false);
    }
  }

  selectObjective(id: number): void {
    if (!this.creating() && this.selectedId() === id) return;
    this.discard(() => {
      this.creating.set(false);
      this.selectedId.set(id);
      this.formDirty.set(false);
      this.revealPanel();
    });
  }

  openCreate(event: Event): void {
    const opener = focusable(event.currentTarget);
    this.discard(() => {
      this.createOpener = opener;
      this.previousSelection = this.selectedId();
      this.selectedId.set(null);
      this.creating.set(true);
      this.createToken.update(value => value + 1);
      this.formDirty.set(false);
      this.revealPanel();
    });
  }

  onPortfolioChange(id: number | null): void {
    if (id === null || id === this.portfolioId()) return;
    const nextId = id;
    const current = this.portfolioId();
    this.discard(
      () => {
        void this.applyPortfolio(nextId);
      },
      () => this.portfolioSelect()?.writeValue(current)
    );
  }

  onYearChange(year: number | null): void {
    if (year === null || year === this.year()) return;
    const nextYear = year;
    const current = this.year();
    this.discard(
      () => {
        void this.applyYear(nextYear);
      },
      () => this.yearSelect()?.writeValue(current)
    );
  }

  requestCarryForward(): void {
    if (!this.canCarryForward()) return;
    this.discard(() => this.confirmCarryForward());
  }

  onCancelled(kind: 'edit' | 'create'): void {
    if (kind === 'edit') {
      this.formDirty.set(false);
      this.focusRow(this.selectedId());
      return;
    }
    const previous = this.previousSelection;
    const opener = this.createOpener;
    this.creating.set(false);
    this.selectedId.set(previous);
    this.formDirty.set(false);
    this.previousSelection = null;
    if (previous !== null) this.focusRow(previous);
    else this.focusElement(opener);
  }

  async onSaved(id: number): Promise<void> {
    this.creating.set(false);
    this.selectedId.set(id);
    this.formDirty.set(false);
    await this.reloadInPlace();
    this.focusRow(this.selectedId());
  }

  onDelete(): void {
    const objective = this.objectiveById(this.selectedId());
    if (!objective) return;
    this.requestDelete(objective, this.deleteButton());
  }

  /** Panel Delete uses the same confirm, blocker text and request the row used to. */
  requestDelete(objective: FrameworkObjective, button: HTMLElement | null): void {
    if (!objective.deletable) {
      this.actions.showGlobalAlert({
        severity: 'error',
        summary: 'Cannot delete',
        detail: blockerDetail(objective),
        hasNoCancelButton: true,
        hideCloseButton: true,
        confirmCallback: {
          label: 'Close',
          event: () => focusElement(button)
        }
      });
      return;
    }
    this.actions.showGlobalAlert({
      severity: 'delete',
      summary: 'Delete',
      detail: `Delete Institutional objective ${escapeHtml(objective.code)}?`,
      hideCloseButton: true,
      confirmCallback: {
        label: 'Delete',
        event: () => void this.performDelete(objective, button)
      },
      cancelCallback: {
        label: 'Cancel',
        event: () => focusElement(button)
      }
    });
  }

  private confirmCarryForward(): void {
    if (!this.canCarryForward()) return;
    const fromYear = this.year();
    const portfolio = this.selectedPortfolio();
    if (fromYear === null || !portfolio) return;
    const count = this.years().find(row => row.year === fromYear)?.count ?? 0;
    const noun = count === 1 ? 'objective' : 'objectives';
    this.actions.showGlobalAlert({
      severity: 'confirm',
      summary: 'Carry forward',
      detail: `Copy ${count} ${noun} from ${fromYear} to ${fromYear + 1}? ${fromYear} is unchanged.`,
      hideCloseButton: true,
      confirmCallback: {
        label: 'Carry forward',
        event: () => void this.performCarryForward()
      },
      cancelCallback: { label: 'Cancel' }
    });
  }

  private discard(next: () => void, onKeep?: () => void): void {
    const dirty = this.panel()?.isDirty() ?? this.formDirty();
    guardDiscard(this.actions, dirty, this.discardSubject(), next, onKeep);
  }

  private discardSubject(): string {
    if (this.creating()) return 'the new element';
    const id = this.selectedId();
    const code = id === null ? '' : (this.objectiveById(id)?.code ?? '');
    return code.trim() === '' ? 'the new element' : code;
  }

  private async applyPortfolio(id: number): Promise<void> {
    this.clearPanel();
    this.portfolioId.set(id);
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    this.carryError.set(null);
    this.deleteError.set(null);
    this.objectives.set([]);
    this.framework.set(null);
    await this.loadPortfolio(id, token, true);
  }

  private async applyYear(year: number): Promise<void> {
    const portfolioId = this.portfolioId();
    if (portfolioId === null) return;
    this.year.set(year);
    this.clearPanel();
    this.carryError.set(null);
    this.deleteError.set(null);
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    await this.loadObjectives(portfolioId, year, token);
  }

  private clearPanel(): void {
    this.selectedId.set(null);
    this.creating.set(false);
    this.formDirty.set(false);
    this.previousSelection = null;
  }

  /** Re-reads years and the open year without a skeleton. A slower read than `loadToken` is dropped. */
  private async reloadInPlace(): Promise<void> {
    const portfolioId = this.portfolioId();
    const year = this.year();
    if (portfolioId === null || year === null) return;
    const token = ++this.loadToken;
    try {
      const [years, objectives] = await Promise.all([
        this.api.GET_StrategyFrameworkObjectiveYears(portfolioId),
        this.api.GET_StrategyFrameworkObjectives(portfolioId, year)
      ]);
      if (token !== this.loadToken) return;
      if (years?.successfulRequest && years.data) {
        this.years.set(years.data.years);
        this.defaultYear.set(years.data.defaultYear);
      }
      if (!objectives?.successfulRequest || !objectives.data) return;
      this.objectives.set(objectives.data);
      const selected = this.selectedId();
      if (selected !== null && !objectives.data.some(item => item.id === selected)) {
        this.selectedId.set(null);
        this.creating.set(false);
        this.formDirty.set(false);
      }
    } catch {
      // The panel already showed the write error. A failed refresh leaves the current list.
    }
  }

  private async performCarryForward(): Promise<void> {
    if (!this.canCarryForward()) return;
    const portfolioId = this.portfolioId();
    const fromYear = this.year();
    if (portfolioId === null || fromYear === null) return;
    this.carrying.set(true);
    this.carryError.set(null);
    try {
      const response = await this.api.POST_StrategyFrameworkCarryForward({ portfolioId, fromYear });
      if (!response?.successfulRequest || !response.data) {
        if (response?.status !== 401) this.carryError.set(frameworkErrorOf(response?.errorDetail));
        return;
      }
      this.actions.showToast({
        severity: 'success',
        summary: 'Carry forward',
        detail: carryForwardMessage(response.data)
      });
      await this.reloadInPlace();
    } catch (error) {
      this.carryError.set(frameworkErrorOf(error));
    } finally {
      this.carrying.set(false);
    }
  }

  private async performDelete(objective: FrameworkObjective, button: HTMLElement | null): Promise<void> {
    const focus = this.focusAfterDelete(objective.id);
    this.deleteError.set(null);
    try {
      const response = await this.api.DELETE_StrategyFrameworkObjective(objective.id);
      if (!response?.successfulRequest) {
        if (response?.status !== 401) this.deleteError.set(frameworkErrorOf(response?.errorDetail));
        focusElement(button);
        return;
      }
      this.clearPanel();
      await this.reloadInPlace();
      await waitForRender();
      const target = focus();
      if (target?.isConnected) target.focus();
    } catch (error) {
      this.deleteError.set(frameworkErrorOf(error));
      focusElement(button);
    }
  }

  /**
   * Next row on the current page, else the previous, else the Add objective button.
   * Captured before the row leaves the DOM; resolved by `data-row-key` after the refresh.
   * A key that is no longer rendered (another page) falls through.
   */
  private focusAfterDelete(id: number): () => HTMLElement | null {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="data-table-row"]'));
    const index = rows.findIndex(row => row.getAttribute('data-row-key') === String(id));
    const nextKey = index >= 0 && index < rows.length - 1 ? rows[index + 1].getAttribute('data-row-key') : null;
    const previousKey = index > 0 ? rows[index - 1].getAttribute('data-row-key') : null;
    return () => this.rowByKey(nextKey) ?? this.rowByKey(previousKey) ?? this.addButton();
  }

  private rowByKey(key: string | null): HTMLElement | null {
    if (!key) return null;
    const row = document.querySelector(`[data-testid="data-table-row"][data-row-key="${cssEscape(key)}"]`);
    return row instanceof HTMLElement && row.isConnected ? row : null;
  }

  private focusRow(id: number | null): void {
    if (id === null) return;
    const key = String(id);
    setTimeout(() => {
      const row = this.rowByKey(key);
      if (row) row.focus();
    }, 0);
  }

  private focusElement(target: HTMLElement | null): void {
    setTimeout(() => {
      if (target?.isConnected) target.focus();
    }, 0);
  }

  private addButton(): HTMLElement | null {
    const button = document.querySelector('[data-testid="add-objective"] button');
    return button instanceof HTMLElement ? button : null;
  }

  private deleteButton(): HTMLElement | null {
    const button = document.querySelector('[data-testid="objective-panel-delete"] button');
    return button instanceof HTMLElement ? button : null;
  }

  /** Below 1024px the panel stacks under the list, so a selection brings it into view. */
  private revealPanel(): void {
    if (typeof window.matchMedia !== 'function') return;
    let narrow = false;
    try {
      narrow = window.matchMedia('(max-width: 1023px)').matches;
    } catch {
      return;
    }
    if (!narrow) return;
    setTimeout(() => {
      const panel = document.querySelector('[data-testid="side-panel"]');
      if (panel instanceof HTMLElement && typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  private async loadPortfolio(portfolioId: number, token: number, useDefaultYear: boolean): Promise<void> {
    try {
      const [years, framework] = await Promise.all([
        this.api.GET_StrategyFrameworkObjectiveYears(portfolioId),
        this.api.GET_StrategyFramework(portfolioId)
      ]);
      if (token !== this.loadToken) return;
      if (!years?.successfulRequest || !years.data) {
        this.fail(token, years?.errorDetail);
        return;
      }
      if (!framework?.successfulRequest || !framework.data) {
        this.fail(token, framework?.errorDetail);
        return;
      }
      const yearRows = years.data.years;
      const serverDefault = years.data.defaultYear;
      this.years.set(yearRows);
      this.defaultYear.set(serverDefault);
      this.framework.set(framework.data);
      const preferred = useDefaultYear ? serverDefault : this.year();
      const listed = (candidate: number | null) => candidate !== null && yearRows.some(row => row.year === candidate);
      const nextYear = listed(preferred) ? preferred : listed(serverDefault) ? serverDefault : (yearRows[0]?.year ?? null);
      this.year.set(nextYear);
      if (nextYear === null) {
        this.objectives.set([]);
        this.loading.set(false);
        return;
      }
      await this.loadObjectives(portfolioId, nextYear, token);
    } catch (error) {
      this.fail(token, error);
    }
  }

  private async loadObjectives(portfolioId: number, year: number, token: number): Promise<void> {
    try {
      const response = await this.api.GET_StrategyFrameworkObjectives(portfolioId, year);
      if (token !== this.loadToken) return;
      if (!response?.successfulRequest || !response.data) {
        this.fail(token, response?.errorDetail);
        return;
      }
      this.objectives.set(response.data);
      this.loading.set(false);
    } catch (error) {
      this.fail(token, error);
    }
  }

  private fail(token: number, errorDetail: unknown): void {
    if (token !== this.loadToken) return;
    this.objectives.set([]);
    this.loadError.set(frameworkErrorOf(errorDetail));
    this.loading.set(false);
  }

  private objectiveById(id: number | null): FrameworkObjective | undefined {
    if (id === null) return undefined;
    return this.objectives().find(objective => objective.id === id);
  }
}

function filterObjectives(rows: ObjectiveTableRow[], query: string): ObjectiveTableRow[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(row => row.code.toLowerCase().includes(term) || row.statement.toLowerCase().includes(term));
}

function portfolioLabel(portfolio: FrameworkContextPortfolio): string {
  const range = `${portfolio.name} · ${portfolio.startYear}–${portfolio.endYear}`;
  return portfolio.configured ? range : `${range} (not configured)`;
}

function blockerDetail(objective: FrameworkObjective): string {
  const lines = objective.blockers
    .map(blocker => blocker.wayOut || `${blocker.count} ${blocker.reason}`)
    .map(line => line.trim())
    .filter(line => line !== '');
  if (lines.length === 0) return 'This objective cannot be deleted.';
  return lines.map(escapeHtml).join('<br>');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function focusable(current: EventTarget | null): HTMLElement | null {
  if (!(current instanceof HTMLElement)) return null;
  if (current.matches('button')) return current;
  const button = current.querySelector('button');
  return button instanceof HTMLElement ? button : current;
}

function focusElement(button: HTMLElement | null): void {
  if (button?.isConnected) button.focus();
}

function waitForRender(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
