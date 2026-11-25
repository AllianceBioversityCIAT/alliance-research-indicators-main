import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import {
  FrameworkContext,
  FrameworkContextPortfolio,
  FrameworkEditorElement,
  FrameworkEditorView
} from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { exportSheetsToXlsx } from '@shared/utils/xlsx-export.util';
import { OdsEmptyPanelComponent, OdsEmptyRow } from '../ods-empty-panel/ods-empty-panel.component';
import { SidePanelLayoutComponent } from '../side-panel-layout/side-panel-layout.component';
import { guardDiscard } from '../unsaved-changes.util';
import { FrameworkViewSlug, parseFrameworkUrl, serializeFrameworkUrl } from './url/framework-url.codec';
import { ElementPanelComponent } from './components/element-panel/element-panel.component';
import { FrameworkTreeComponent } from './components/framework-tree/framework-tree.component';
import { FrameworkTableCreate, FrameworkTablesComponent } from './components/framework-tables/framework-tables.component';
import { FrameworkDeleteHandler } from './framework-delete.handler';
import { frameworkErrorOf } from './utils/framework-error.util';
import { buildExportSheets, frameworkTreeNodes, levelCounts, summaryLine } from './utils/framework-view.util';

interface PortfolioOption extends FrameworkContextPortfolio {
  label: string;
}

// @akili-spec institutional-performance/strategy-framework T-19 — design §6.2, §6.4, §6.5, §6.9.
// The page owns selection, create, and the refresh token for both views.
// Every selection change goes through guardDiscard. Tree is the `editor` slug (D-STF-35).
// jsdom cannot judge viewport fit (KZ-017, P-46).
@Component({
  selector: 'app-framework',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CustomProgressBarComponent,
    SidePanelLayoutComponent,
    OdsEmptyPanelComponent,
    FrameworkTreeComponent,
    FrameworkTablesComponent,
    ElementPanelComponent
  ],
  providers: [FrameworkDeleteHandler],
  templateUrl: './framework.component.html',
  styleUrl: './framework.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class FrameworkComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly cache = inject(CacheService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deletes = inject(FrameworkDeleteHandler);
  private readonly panel = viewChild(ElementPanelComponent);

  readonly context = signal<FrameworkContext | null>(null);
  readonly portfolioId = signal<number | null>(null);
  readonly editor = signal<FrameworkEditorView | null>(null);
  readonly view = signal<FrameworkViewSlug>('editor');
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly createRequest = signal<FrameworkTableCreate | null>(null);
  readonly createToken = signal(0);
  readonly collapsedIds = signal<ReadonlySet<number>>(new Set());
  readonly formDirty = signal(false);

  /** Drops an editor read that resolved after a newer one. Covers the tree and the tables. */
  private loadToken = 0;
  private previousSelection: number | null = null;
  private createOpener: HTMLElement | null = null;
  /** One-way `[ngModel]` does not write a rejected value back. Only Keep editing calls `writeValue`. */
  private readonly portfolioSelect = viewChild(Select);

  /** Visible height below the fixed chrome (P-46). The stylesheet subtracts the 24px top gap and releases the height below 1024px. */
  readonly columnHeight = computed(() => `calc(100vh - ${this.cache.navbarHeight() + this.cache.headerHeight()}px)`);

  readonly portfolioOptions = computed<PortfolioOption[]>(() =>
    (this.context()?.portfolios ?? []).map(portfolio => ({
      ...portfolio,
      label: portfolio.configured
        ? `${portfolio.name} · ${portfolio.startYear}–${portfolio.endYear}`
        : `${portfolio.name} · ${portfolio.startYear}–${portfolio.endYear} (not configured)`
    }))
  );

  readonly selectedPortfolio = computed(() => this.portfolioOptions().find(portfolio => portfolio.id === this.portfolioId()) ?? null);

  /** Years, never the stored name (D-STF-23, P-28). */
  readonly title = computed(() => {
    const portfolio = this.selectedPortfolio();
    if (!portfolio) return 'Monitoring framework';
    return `Strategy ${portfolio.startYear}–${portfolio.endYear} – Monitoring framework`;
  });

  readonly summary = computed(() => {
    const editor = this.editor();
    return editor ? summaryLine(editor) : '';
  });

  readonly empty = computed(() => {
    const editor = this.editor();
    return editor !== null && editor.elements.length === 0;
  });

  /** Same counts as the chips and the summary line, one row per level, in depth order. */
  readonly emptyRows = computed<OdsEmptyRow[]>(() => {
    const editor = this.editor();
    if (!editor) return [];
    return levelCounts(editor).map(level => ({
      depth: level.depth,
      label: `${level.count} ${level.pluralName}`,
      description: emptyLevelDescription(level.depth),
      icon: emptyLevelIcon(level.depth),
      accent: level.depth === 1
    }));
  });

  readonly levelOneName = computed(() => {
    const levels = [...(this.editor()?.levels ?? [])].sort((left, right) => left.depth - right.depth);
    return levels[0]?.name ?? 'Performance Area';
  });

  readonly newLabel = computed(() => `New ${this.levelOneName()}`);

  readonly addRootLabel = computed(() => `+ Add ${this.levelOneName()}`);

  readonly treeNodes = computed(() => {
    const editor = this.editor();
    return editor ? frameworkTreeNodes(editor) : [];
  });

  /** Null during create, so no row stays highlighted (JW-8). */
  readonly selectedKey = computed(() => {
    if (this.createRequest() !== null) return null;
    const id = this.selectedId();
    return id === null ? null : String(id);
  });

  readonly highlightedId = computed(() => (this.createRequest() !== null ? null : this.selectedId()));

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const state = parseFrameworkUrl(params);
      this.view.set(state.view);
    });
    void this.load();
  }

  /** Loads A0, then A1e for the default (or already chosen) portfolio. *Retry* calls this again. */
  async load(): Promise<void> {
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
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
        this.editor.set(null);
        this.loading.set(false);
        return;
      }
      await this.loadEditor(nextId, token);
    } catch (error) {
      this.fail(token, error);
    }
  }

  onDirty(value: boolean): void {
    this.formDirty.set(value);
  }

  selectElement(id: number): void {
    if (this.createRequest() === null && this.selectedId() === id) return;
    this.discard(() => {
      this.createRequest.set(null);
      this.selectedId.set(id);
      this.formDirty.set(false);
      this.revealPanel();
    });
  }

  onChildRequested(parentId: number): void {
    const parent = this.editor()?.elements.find(item => item.id === parentId);
    if (!parent) return;
    const opener = this.host().querySelector(`[data-row-key="${parentId}"] [data-testid="framework-tree-add"]`);
    this.openCreate({ depth: parent.depth + 1, parentRequired: true, parentId }, opener instanceof HTMLElement ? opener : null);
  }

  onNew(event: Event): void {
    this.openCreate({ depth: this.shallowestDepth(), parentRequired: this.shallowestDepth() > 1 }, focusable(event.currentTarget));
  }

  onExpansion(ids: ReadonlySet<number>): void {
    this.collapsedIds.set(ids);
  }

  async onPortfolioChange(id: number | null): Promise<void> {
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

  setView(view: FrameworkViewSlug): void {
    if (view === this.view()) return;
    this.discard(() => {
      this.panel()?.revert();
      this.view.set(view);
      this.formDirty.set(false);
      this.persistUrl();
    });
  }

  onCancelled(kind: 'edit' | 'create'): void {
    if (kind === 'edit') {
      this.formDirty.set(false);
      this.focusRow(this.selectedId());
      return;
    }
    const previous = this.previousSelection;
    const opener = this.createOpener;
    this.createRequest.set(null);
    this.selectedId.set(previous);
    this.formDirty.set(false);
    if (previous !== null) this.focusRow(previous);
    else this.focusElement(opener);
  }

  async onSaved(id: number): Promise<void> {
    const parentId = this.createRequest()?.parentId;
    if (parentId !== undefined) this.expand(parentId);
    this.createRequest.set(null);
    this.selectedId.set(id);
    this.formDirty.set(false);
    await this.reloadEditor();
    this.focusRow(id);
  }

  async onDelete(): Promise<void> {
    const id = this.selectedId();
    const current = id === null ? undefined : this.elementById(id);
    if (id === null || !current || current.deletable !== true) return;
    await this.deletes.request({
      id,
      returnFocus: this.deleteButton(),
      resolveElement: () => {
        const element = this.elementById(id);
        if (!element) return null;
        return { element, levelName: this.levelName(element.depth) };
      },
      prepareFocus: () => this.focusAfterDelete(id),
      onDeleted: async () => {
        this.clearPanel();
        await this.reloadEditor();
      }
    });
  }

  async exportWorkbook(): Promise<void> {
    const editor = this.editor();
    if (!editor || this.exporting()) return;
    this.exporting.set(true);
    try {
      const portfolio = this.selectedPortfolio();
      const years = portfolio ? `${portfolio.startYear}-${portfolio.endYear}` : 'framework';
      await exportSheetsToXlsx({
        sheets: buildExportSheets(editor),
        fileName: `strategy-framework_${years}.xlsx`
      });
    } finally {
      this.exporting.set(false);
    }
  }

  private openCreate(request: FrameworkTableCreate, opener: HTMLElement | null): void {
    this.discard(() => {
      this.createOpener = opener;
      this.previousSelection = this.selectedId();
      this.selectedId.set(null);
      this.createRequest.set(request);
      this.createToken.update(value => value + 1);
      this.formDirty.set(false);
      this.revealPanel();
    });
  }

  private discard(next: () => void, onKeep?: () => void): void {
    const dirty = this.panel()?.isDirty() ?? this.formDirty();
    guardDiscard(this.actions, dirty, this.discardSubject(), next, onKeep);
  }

  private discardSubject(): string {
    if (this.createRequest() !== null) return 'the new element';
    const id = this.selectedId();
    const code = id === null ? '' : (this.elementById(id)?.code ?? '');
    return code.trim() === '' ? 'the new element' : code;
  }

  private async applyPortfolio(id: number): Promise<void> {
    this.portfolioId.set(id);
    this.clearPanel();
    this.collapsedIds.set(new Set());
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    this.editor.set(null);
    await this.loadEditor(id, token);
  }

  private clearPanel(): void {
    this.selectedId.set(null);
    this.createRequest.set(null);
    this.formDirty.set(false);
    this.previousSelection = null;
  }

  private shallowestDepth(): number {
    return [...(this.editor()?.levels ?? [])].sort((left, right) => left.depth - right.depth)[0]?.depth ?? 1;
  }

  private expand(id: number): void {
    this.collapsedIds.update(current => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  /** Re-reads A1e without a skeleton. A slower read than `loadToken` is dropped. */
  private async reloadEditor(): Promise<void> {
    const portfolioId = this.portfolioId();
    if (portfolioId === null) return;
    const token = ++this.loadToken;
    try {
      const response = await this.api.GET_StrategyFrameworkEditor(portfolioId);
      if (token !== this.loadToken) return;
      if (!response?.successfulRequest || !response.data) return;
      if (response.data.portfolioId !== portfolioId) return;
      this.editor.set(response.data);
      const selected = this.selectedId();
      if (selected !== null && !response.data.elements.some(item => item.id === selected)) this.selectedId.set(null);
    } catch {
      // The panel already showed the write error. A failed refresh leaves the current view.
    }
  }

  private async loadEditor(portfolioId: number, token: number): Promise<void> {
    try {
      const response = await this.api.GET_StrategyFrameworkEditor(portfolioId);
      if (token !== this.loadToken) return;
      if (!response?.successfulRequest || !response.data) {
        this.fail(token, response?.errorDetail);
        return;
      }
      this.editor.set(response.data);
      this.loading.set(false);
    } catch (error) {
      this.fail(token, error);
    }
  }

  private fail(token: number, errorDetail: unknown): void {
    if (token !== this.loadToken) return;
    this.editor.set(null);
    this.loadError.set(frameworkErrorOf(errorDetail));
    this.loading.set(false);
  }

  private persistUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: serializeFrameworkUrl({ view: this.view(), level: null }),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private elementById(id: number): FrameworkEditorElement | undefined {
    return this.editor()?.elements.find(item => item.id === id);
  }

  private levelName(depth: number): string {
    return this.editor()?.levels.find(level => level.depth === depth)?.name ?? 'Element';
  }

  private host(): ParentNode {
    return document;
  }

  /**
   * Next visible row, else the previous, else New <level-1>.
   * Captured before the row leaves the DOM; resolved after the refresh.
   */
  private focusAfterDelete(id: number): () => HTMLElement | null {
    if (this.view() === 'table') return this.focusTableAfter(id);
    return this.focusTreeAfter(id);
  }

  private focusTreeAfter(id: number): () => HTMLElement | null {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="framework-tree-row"]'));
    const index = rows.findIndex(row => row.getAttribute('data-row-key') === String(id));
    const nextKey = index >= 0 && index < rows.length - 1 ? rows[index + 1].getAttribute('data-row-key') : null;
    const previousKey = index > 0 ? rows[index - 1].getAttribute('data-row-key') : null;
    return () => this.rowByKey(nextKey) ?? this.rowByKey(previousKey) ?? this.newButton();
  }

  private focusTableAfter(id: number): () => HTMLElement | null {
    const table = document.querySelector('[data-testid="framework-tables"]');
    const rows = table ? Array.from(table.querySelectorAll<HTMLElement>('[data-testid="data-table-row"]')) : [];
    const index = rows.findIndex(row => row.getAttribute('data-row-key') === String(id));
    const nextKey = index >= 0 && index < rows.length - 1 ? rows[index + 1].getAttribute('data-row-key') : null;
    const previousKey = index > 0 ? rows[index - 1].getAttribute('data-row-key') : null;
    return () => {
      const current = document.querySelector('[data-testid="framework-tables"]');
      const find = (key: string | null): HTMLElement | null => {
        if (!key || !current) return null;
        const row = current.querySelector(`[data-row-key="${cssEscape(key)}"]`);
        return row instanceof HTMLElement && row.isConnected ? row : null;
      };
      return find(nextKey) ?? find(previousKey) ?? this.newButton();
    };
  }

  private rowByKey(key: string | null): HTMLElement | null {
    if (!key) return null;
    const row = document.querySelector(`[data-testid="framework-tree-row"][data-row-key="${cssEscape(key)}"]`);
    return row instanceof HTMLElement && row.isConnected ? row : null;
  }

  private focusRow(id: number | null): void {
    if (id === null) return;
    const key = String(id);
    setTimeout(() => {
      const row =
        this.view() === 'table'
          ? document.querySelector(`[data-testid="data-table-row"][data-row-key="${cssEscape(key)}"]`)
          : document.querySelector(`[data-testid="framework-tree-row"][data-row-key="${cssEscape(key)}"]`);
      if (row instanceof HTMLElement && row.isConnected) row.focus();
    }, 0);
  }

  private focusElement(target: HTMLElement | null): void {
    setTimeout(() => {
      if (target?.isConnected) target.focus();
    }, 0);
  }

  private newButton(): HTMLElement | null {
    const button = document.querySelector('[data-testid="new-element"] button, [data-testid="new-element"]');
    return button instanceof HTMLElement ? button : null;
  }

  private deleteButton(): HTMLElement | null {
    const button = document.querySelector('[data-testid="element-delete"] button');
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
}

function emptyLevelIcon(depth: number): string {
  if (depth === 1) return 'pi pi-th-large';
  if (depth === 2) return 'pi pi-sitemap';
  return 'pi pi-chart-bar';
}

function emptyLevelDescription(depth: number): string {
  if (depth === 1) return 'Strategic performance areas of the portfolio.';
  if (depth === 2) return 'Dimensions within each area.';
  if (depth === 3) return 'Indicators, their details and responsibles.';
  return 'Elements at this level.';
}

function focusable(current: EventTarget | null): HTMLElement | null {
  if (!(current instanceof HTMLElement)) return null;
  if (current.matches('button')) return current;
  const button = current.querySelector('button');
  return button instanceof HTMLElement ? button : current;
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
