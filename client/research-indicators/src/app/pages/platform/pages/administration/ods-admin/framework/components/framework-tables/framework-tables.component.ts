import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';
import { FrameworkDeleteHandler } from '../../framework-delete.handler';
import { FrameworkLevelCount, FrameworkTableRow, levelCounts, tableColumnsForLevel, tableRowsForLevel } from '../../utils/framework-view.util';

/** + <Level> opens an empty details panel. The parent field is required below depth 1 (§6.4, §6.5). */
export interface FrameworkTableCreate {
  depth: number;
  parentRequired: boolean;
}

interface LevelPanel {
  level: FrameworkLevelCount;
  columns: DataTableColumn<FrameworkTableRow>[];
  rows: FrameworkTableRow[];
  searchFields: (keyof FrameworkTableRow & string)[];
  exportFileName: string;
}

// @akili-spec institutional-performance/strategy-framework T-14 — design §6.4, D-STF-12, P-23.
// One shared DataTable per level. Rows are the flattened strings from T-12.
// Edit records the same selection the outline's details action does. Delete uses the shared §6.3 handler.
@Component({
  selector: 'app-framework-tables',
  standalone: true,
  imports: [ButtonModule, DataTableComponent],
  providers: [FrameworkDeleteHandler],
  templateUrl: './framework-tables.component.html',
  styleUrls: ['./framework-tables.component.scss', '../../../ods-table-wrap.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrameworkTablesComponent {
  private readonly api = inject(ApiService);
  private readonly deletes = inject(FrameworkDeleteHandler);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly view = input.required<FrameworkEditorView>();
  /** Depth from `?level=`. Null leaves the first level showing until a chip is chosen. */
  readonly level = input<number | null>(null);

  readonly levelSelected = output<number>();
  readonly editRequested = output<number>();
  readonly createRequested = output<FrameworkTableCreate>();
  readonly viewChange = output<FrameworkEditorView>();

  private readonly current = signal<FrameworkEditorView | null>(null);
  private readonly picked = signal<number | null>(null);
  /** Drops a refresh that resolved after a newer one (same guard as the outline editor). */
  private refreshToken = 0;

  readonly shown = computed(() => this.current() ?? this.view());
  readonly panels = computed(() => panelsOf(this.shown()));
  readonly activeDepth = computed(() => {
    const panels = this.panels();
    const selected = this.picked();
    if (selected !== null && panels.some(panel => panel.level.depth === selected)) return selected;
    return panels[0]?.level.depth ?? null;
  });

  constructor() {
    effect(() => {
      const incoming = this.view();
      untracked(() => this.current.set(incoming));
    });
    effect(() => {
      const incoming = this.level();
      untracked(() => this.picked.set(incoming));
    });
  }

  selectLevel(depth: number): void {
    this.picked.set(depth);
    this.levelSelected.emit(depth);
  }

  requestCreate(depth: number): void {
    this.createRequested.emit({ depth, parentRequired: depth > 1 });
  }

  requestEdit(id: number): void {
    this.editRequested.emit(id);
  }

  requestDelete(id: number, event: Event): void {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) return;
    const depth = this.shown().elements.find(element => element.id === id)?.depth ?? this.activeDepth() ?? 1;
    void this.deletes.request({
      id,
      returnFocus: button,
      resolveElement: () => {
        const element = this.element(id);
        if (!element) return null;
        return { element, levelName: this.levelName(element.depth) };
      },
      prepareFocus: () => this.focusAfterDelete(id, depth),
      onDeleted: () => this.refresh()
    });
  }

  isDeletable(id: number): boolean {
    return this.element(id)?.deletable === true;
  }

  blockerText(id: number): string {
    const blockers = this.element(id)?.blockers ?? [];
    return blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .filter(text => text.trim() !== '')
      .join(' ');
  }

  private element(id: number): FrameworkEditorElement | undefined {
    return this.shown().elements.find(item => item.id === id);
  }

  private levelName(depth: number): string {
    return this.shown().levels.find(level => level.depth === depth)?.name ?? 'Element';
  }

  /**
   * Same return order as the outline: the previous row's first control,
   * else this level's + button, else the page's + Add.
   */
  private focusAfterDelete(id: number, depth: number): () => HTMLElement | null {
    const rows = tableRowsForLevel(this.shown(), depth);
    const index = rows.findIndex(row => row.id === id);
    const previousId = index > 0 ? rows[index - 1].id : null;
    const host = this.host.nativeElement;
    return () => {
      const panel = host.querySelector(`[data-testid="level-table"][data-depth="${depth}"]`);
      if (previousId !== null && panel) {
        const edit = panel.querySelector(`[data-testid="edit-row"][data-element-id="${previousId}"]`);
        if (edit instanceof HTMLElement && edit.isConnected) return edit;
      }
      const add = panel?.querySelector('[data-testid="add-level"] button, [data-testid="add-level"]');
      if (add instanceof HTMLElement && add.isConnected) return add;
      const pageAdd = document.querySelector('[data-testid="add-root-button"] button, [data-testid="add-root-button"]');
      return pageAdd instanceof HTMLElement ? pageAdd : null;
    };
  }

  private async refresh(): Promise<void> {
    const token = ++this.refreshToken;
    const portfolioId = this.shown().portfolioId;
    const response = await this.api.GET_StrategyFrameworkEditor(portfolioId);
    if (token !== this.refreshToken) return;
    if (!response?.successfulRequest || !response.data) return;
    if (response.data.portfolioId !== portfolioId) return;
    this.current.set(response.data);
    this.viewChange.emit(response.data);
  }
}

function panelsOf(view: FrameworkEditorView): LevelPanel[] {
  const levels = [...view.levels].sort((left, right) => left.depth - right.depth);
  return levelCounts(view).map(level => {
    const source = levels.find(item => item.depth === level.depth) ?? asLevel(level);
    const columns = tableColumnsForLevel(source, levels).map(
      (column): DataTableColumn<FrameworkTableRow> => ({
        field: column.field,
        header: column.header,
        type: column.field === 'code' ? 'code' : 'text',
        sortable: true,
        width: column.field === 'code' ? '7rem' : undefined
      })
    );
    return {
      level,
      columns,
      rows: tableRowsForLevel(view, level.depth),
      searchFields: columns.map(column => column.field),
      exportFileName: exportFileName(level)
    };
  });
}

function asLevel(level: FrameworkLevelCount): FrameworkLevel {
  return {
    depth: level.depth,
    name: level.name,
    pluralName: level.pluralName,
    shortLabel: level.shortLabel,
    isIndicatorLevel: level.isIndicatorLevel
  };
}

function exportFileName(level: FrameworkLevelCount): string {
  const slug = level.pluralName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `strategy-framework_${slug || `level-${level.depth}`}.xlsx`;
}
