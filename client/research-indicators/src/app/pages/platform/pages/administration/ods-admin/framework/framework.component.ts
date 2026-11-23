import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { FrameworkContext, FrameworkContextPortfolio, FrameworkEditorView } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';
import { exportSheetsToXlsx } from '@shared/utils/xlsx-export.util';
import { FrameworkViewSlug, parseFrameworkUrl, serializeFrameworkUrl } from './url/framework-url.codec';
import { ElementPanelComponent } from './components/element-panel/element-panel.component';
import { OutlineEditorComponent } from './components/outline-editor/outline-editor.component';
import { FrameworkTableCreate, FrameworkTablesComponent } from './components/framework-tables/framework-tables.component';
import { frameworkErrorOf } from './utils/framework-error.util';
import { buildExportSheets, summaryLine } from './utils/framework-view.util';

interface PortfolioOption extends FrameworkContextPortfolio {
  label: string;
}

// @akili-spec institutional-performance/strategy-framework T-12 — design §6.2, §6.4.
// Shell: header, selector, Editor/Table toggle, export, summary, banner, states.
// The details panel (T-15) opens from the outline and from the table. Focus returns to the opener.
// Errors stay inline through frameworkErrorOf. They are not sent to ActionsService.handleBadRequest (P-36).
@Component({
  selector: 'app-framework',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CustomProgressBarComponent,
    OutlineEditorComponent,
    FrameworkTablesComponent,
    ElementPanelComponent
  ],
  templateUrl: './framework.component.html',
  styleUrl: './framework.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class FrameworkComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly context = signal<FrameworkContext | null>(null);
  readonly portfolioId = signal<number | null>(null);
  readonly editor = signal<FrameworkEditorView | null>(null);
  readonly view = signal<FrameworkViewSlug>('editor');
  /** Depth from `?level=depth-<n>`. The table chips write it. */
  readonly level = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly exporting = signal(false);
  /**
   * The empty state's **+ Add** sets this. The outline editor turns it into a root draft.
   */
  readonly rootDraftRequested = signal(false);
  /** Details icon selection. T-15 opens the panel from this id. */
  readonly detailsElementId = signal<number | null>(null);
  /** + <Level> from the table. The panel opens empty; the parent is required when `parentRequired` is set. */
  readonly createRequest = signal<FrameworkTableCreate | null>(null);

  private loadToken = 0;
  /** The control that opened the panel. Focus returns here on Cancel, Escape and Save (P-33). */
  private opener: HTMLElement | null = null;

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

  readonly addRootLabel = computed(() => {
    const levels = [...(this.editor()?.levels ?? [])].sort((left, right) => left.depth - right.depth);
    const name = levels[0]?.name ?? 'Performance Area';
    return `+ Add ${name}`;
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const state = parseFrameworkUrl(params);
      this.view.set(state.view);
      this.level.set(state.level);
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

  applyEditor(view: FrameworkEditorView): void {
    if (view.portfolioId !== this.portfolioId()) return;
    this.editor.set(view);
  }

  onDetails(id: number): void {
    this.createRequest.set(null);
    this.detailsElementId.set(id);
  }

  onCreate(request: FrameworkTableCreate): void {
    this.detailsElementId.set(null);
    this.createRequest.set(request);
  }

  dismissRootDraft(): void {
    this.rootDraftRequested.set(false);
  }

  async onPortfolioChange(id: number | null): Promise<void> {
    if (id === null || id === this.portfolioId()) return;
    this.portfolioId.set(id);
    this.rootDraftRequested.set(false);
    this.detailsElementId.set(null);
    this.createRequest.set(null);
    const token = ++this.loadToken;
    this.loading.set(true);
    this.loadError.set(null);
    this.editor.set(null);
    await this.loadEditor(id, token);
  }

  setView(view: FrameworkViewSlug): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.persistUrl();
  }

  setLevel(depth: number): void {
    if (depth === this.level()) return;
    this.level.set(depth);
    this.persistUrl();
  }

  requestRootDraft(): void {
    this.rootDraftRequested.set(true);
  }

  /** Clicks that open the panel bubble here. The drawer itself is appended to the body. */
  rememberOpener(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const host = target.closest('[data-testid="details"], [data-testid="edit-row"], [data-testid="add-level"]');
    if (!(host instanceof HTMLElement)) return;
    const button = host.matches('button') ? host : host.querySelector('button');
    this.opener = button instanceof HTMLElement ? button : host;
  }

  finishPanel(restore: boolean): void {
    this.detailsElementId.set(null);
    this.createRequest.set(null);
    const opener = this.opener;
    this.opener = null;
    if (!restore) return;
    setTimeout(() => {
      if (opener?.isConnected) opener.focus();
    }, 0);
  }

  async onPanelSaved(): Promise<void> {
    this.finishPanel(true);
    await this.reloadEditor();
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

  /** Re-reads A1e without swapping the page for a skeleton, so the opener stays mounted. */
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
      queryParams: serializeFrameworkUrl({ view: this.view(), level: this.level() }),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
