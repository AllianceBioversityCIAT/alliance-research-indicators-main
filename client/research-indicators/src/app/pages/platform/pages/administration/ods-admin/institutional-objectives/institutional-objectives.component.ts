import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import {
  FrameworkContext,
  FrameworkContextPortfolio,
  FrameworkObjective,
  FrameworkView
} from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { frameworkErrorOf } from '../framework/utils/framework-error.util';
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

// @akili-spec institutional-performance/strategy-framework T-16 — design §6.6, R-STF-009, R-STF-010.
// Portfolio selector follows §6.2. Carry forward is refused in the last year and on an empty year.
// A 4xx (except 401) is shown inline; it is not sent to a toast or to handleBadRequest (D-STF-26, P-36).
@Component({
  selector: 'app-institutional-objectives',
  standalone: true,
  imports: [FormsModule, ButtonModule, SelectModule, TooltipModule, CustomProgressBarComponent, DataTableComponent, ObjectivePanelComponent],
  templateUrl: './institutional-objectives.component.html',
  styleUrls: ['./institutional-objectives.component.scss', '../ods-table-wrap.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class InstitutionalObjectivesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);

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
  readonly panelOpen = signal(false);
  readonly editing = signal<FrameworkObjective | null>(null);

  private loadToken = 0;
  private readonly carrying = signal(false);
  private opener: HTMLElement | null = null;

  readonly columns: DataTableColumn<ObjectiveTableRow>[] = [
    { field: 'code', header: 'Code', type: 'code', sortable: true, width: '120px' },
    { field: 'statement', header: 'Statement', type: 'text', sortable: true },
    { field: 'linkedIndicatorsText', header: 'Linked indicators', type: 'text', sortable: true }
  ];

  readonly searchFields: (keyof ObjectiveTableRow & string)[] = ['code', 'statement'];

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

  readonly exportFileName = computed(() => `institutional-objectives_${this.year() ?? 'year'}.xlsx`);

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

  async onPortfolioChange(id: number | null): Promise<void> {
    if (id === null || id === this.portfolioId()) return;
    this.closePanel();
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

  async onYearChange(year: number | null): Promise<void> {
    if (year === null || year === this.year()) return;
    const portfolioId = this.portfolioId();
    if (portfolioId === null) return;
    this.year.set(year);
    this.carryError.set(null);
    this.deleteError.set(null);
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    await this.loadObjectives(portfolioId, year, token);
  }

  requestCarryForward(): void {
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

  openCreate(event: Event): void {
    this.rememberOpener(event);
    this.editing.set(null);
    this.panelOpen.set(true);
  }

  openEdit(objective: FrameworkObjective, event: Event): void {
    this.rememberOpener(event);
    this.editing.set(objective);
    this.panelOpen.set(true);
  }

  closePanel(restoreFocus = true): void {
    this.panelOpen.set(false);
    const opener = this.opener;
    this.opener = null;
    setTimeout(() => {
      this.editing.set(null);
      if (restoreFocus && opener?.isConnected) opener.focus();
    }, 0);
  }

  /** Panel Delete uses the row's confirm, blocker text and request. */
  onPanelDelete(event: Event): void {
    const objective = this.editing();
    if (!objective) return;
    this.requestDelete(objective, event);
  }

  async onSaved(): Promise<void> {
    this.closePanel();
    const portfolioId = this.portfolioId();
    const year = this.year();
    if (portfolioId === null || year === null) return;
    const token = ++this.loadToken;
    this.loading.set(true);
    await this.reloadYears(portfolioId, token);
    if (token !== this.loadToken) return;
    await this.loadObjectives(portfolioId, year, token);
  }

  requestDelete(objective: FrameworkObjective, event: Event): void {
    const button = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
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

  objectiveById(id: number): FrameworkObjective | undefined {
    return this.objectives().find(objective => objective.id === id);
  }

  blockerText(objective: FrameworkObjective): string {
    return objective.blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .map(text => text.trim())
      .filter(text => text !== '')
      .join(' ');
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
      const token = ++this.loadToken;
      this.loading.set(true);
      await this.reloadYears(portfolioId, token);
      if (token !== this.loadToken) return;
      await this.loadObjectives(portfolioId, fromYear, token);
    } catch (error) {
      this.carryError.set(frameworkErrorOf(error));
    } finally {
      this.carrying.set(false);
    }
  }

  private async performDelete(objective: FrameworkObjective, button: HTMLElement | null): Promise<void> {
    const focus = this.focusAfterDelete(objective.id);
    const editingThis = this.editing()?.id === objective.id;
    this.deleteError.set(null);
    try {
      const response = await this.api.DELETE_StrategyFrameworkObjective(objective.id);
      if (!response?.successfulRequest) {
        if (response?.status !== 401) this.deleteError.set(frameworkErrorOf(response?.errorDetail));
        focusElement(button);
        return;
      }
      const portfolioId = this.portfolioId();
      const year = this.year();
      if (portfolioId === null || year === null) return;
      const token = ++this.loadToken;
      this.loading.set(true);
      await this.reloadYears(portfolioId, token);
      if (token !== this.loadToken) return;
      await this.loadObjectives(portfolioId, year, token);
      if (editingThis) this.closePanel(false);
      await waitForRender();
      const target = focus();
      if (target?.isConnected) target.focus();
    } catch (error) {
      this.deleteError.set(frameworkErrorOf(error));
      focusElement(button);
    }
  }

  private focusAfterDelete(id: number): () => HTMLElement | null {
    const rows = this.objectiveRows();
    const index = rows.findIndex(row => row.id === id);
    const previousId = index > 0 ? rows[index - 1].id : null;
    return () => {
      if (previousId !== null) {
        const edit = document.querySelector(`[data-testid="edit-objective"][data-objective-id="${previousId}"]`);
        if (edit instanceof HTMLElement && edit.isConnected) return edit;
      }
      const add = document.querySelector('[data-testid="add-objective"] button');
      return add instanceof HTMLElement ? add : null;
    };
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

  private async reloadYears(portfolioId: number, token: number): Promise<void> {
    const years = await this.api.GET_StrategyFrameworkObjectiveYears(portfolioId);
    if (token !== this.loadToken) return;
    if (!years?.successfulRequest || !years.data) return;
    this.years.set(years.data.years);
    this.defaultYear.set(years.data.defaultYear);
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

  private rememberOpener(event: Event): void {
    const current = event.currentTarget;
    if (!(current instanceof HTMLElement)) {
      this.opener = null;
      return;
    }
    const button = current.matches('button') ? current : current.querySelector('button');
    this.opener = button instanceof HTMLElement ? button : current;
  }
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

function focusElement(button: HTMLElement | null): void {
  if (button?.isConnected) button.focus();
}

function waitForRender(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
