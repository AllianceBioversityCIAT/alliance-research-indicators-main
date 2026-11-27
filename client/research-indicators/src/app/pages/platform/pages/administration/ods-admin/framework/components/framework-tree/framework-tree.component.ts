import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked
} from '@angular/core';
import type { TreeNode } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { TreeTableModule, type TreeTableNodeCollapseEvent } from 'primeng/treetable';
import { FrameworkTreeRow } from '../../utils/framework-view.util';
import { matchesCodeOrName, normalizedTerm } from './tree-filter.util';

// @akili-spec institutional-performance/strategy-framework T-18 — design §6.3, D-STF-30, D-STF-34.
// Enter/Space select only when the row itself is the event target, so a key on **+** never selects.
// The listener is capture: **+** stops the Enter/Space bubble, and this still sees the key first.
// jsdom cannot judge the painted bar, the 28px step, outline geometry or real Tab order (KZ-017, T-22).

@Directive({
  selector: 'tr[appTreeRowKeys]',
  standalone: true
})
export class TreeRowKeysDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  readonly rowActivate = output<void>();

  constructor() {
    const el = this.host.nativeElement;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.code !== 'Space') return;
      if (event.target !== event.currentTarget) return;
      if (event.key === ' ' || event.code === 'Space') event.preventDefault();
      this.rowActivate.emit();
    };
    el.addEventListener('keydown', onKey, true);
    this.destroyRef.onDestroy(() => el.removeEventListener('keydown', onKey, true));
  }
}

@Component({
  selector: 'app-framework-tree',
  standalone: true,
  imports: [TreeTableModule, TooltipModule, TreeRowKeysDirective],
  templateUrl: './framework-tree.component.html',
  styleUrl: './framework-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--framework-tree-indent-step.px]': 'indentStep',
    '(keydown)': 'onTreeKeydown($event)'
  }
})
export class FrameworkTreeComponent {
  /** Pixels per PrimeNG level. Level is 0-based, so a depth-1 row has no indent. Tuned at HITL (T-22). */
  readonly indentStep = 28;
  readonly nodes = input.required<TreeNode<FrameworkTreeRow>[]>();
  readonly selectedId = input<number | null>(null);
  /** The page's find field. Null leaves the list unfiltered. */
  readonly queryOverride = input<string | null>(null);
  /** Element ids the page keeps collapsed. All expanded when the set is empty. */
  readonly collapsedIds = input<ReadonlySet<number>>(new Set());

  readonly elementSelected = output<number>();
  readonly childRequested = output<number>();
  readonly expansionChanged = output<ReadonlySet<number>>();

  readonly query = signal('');

  constructor() {
    effect(() => {
      const override = this.queryOverride();
      if (override === null) return;
      untracked(() => {
        if (override !== this.query()) this.setQuery(override);
      });
    });
  }
  /** Collapse set from before the current search. Clearing the search puts it back. */
  private collapseSnapshot: ReadonlySet<number> | null = null;
  private readonly collapsed = linkedSignal(() => this.collapsedIds());
  /**
   * Row whose **+** is in the tab order. Follows the selected row, then ArrowUp/Down
   * and a row click. Other **+** buttons stay at tabindex -1 (T-22 F-2).
   */
  private readonly rovingId = linkedSignal(() => this.selectedId());

  readonly trimmedQuery = computed(() => this.query().trim());
  readonly displayNodes = computed(() => projectTree(this.nodes(), this.query(), this.collapsed()));
  readonly noMatches = computed(() => this.trimmedQuery() !== '' && this.displayNodes().length === 0);
  private readonly visibleIds = computed(() => visibleRowIds(this.displayNodes()));
  readonly activeRowId = computed(() => {
    const visible = this.visibleIds();
    const roving = this.rovingId();
    if (roving !== null && visible.includes(roving)) return roving;
    return visible[0] ?? null;
  });

  /** Accent token of the depth-1 ancestor. Not this row's own level. */
  accentToken(row: FrameworkTreeRow): string {
    return `var(--ac-framework-accent-${(row.areaIndex % 4) + 1})`;
  }

  hasChildren(node: TreeNode<FrameworkTreeRow>): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  select(id: number): void {
    this.rovingId.set(id);
    this.elementSelected.emit(id);
  }

  /** Arrow keys move PrimeNG's tabbable row. The **+** of that row is the only one Tab reaches. */
  onTreeKeydown(event: KeyboardEvent): void {
    const code = event.code || event.key;
    if (code !== 'ArrowDown' && code !== 'ArrowUp' && code !== 'Home' && code !== 'End') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest('[data-testid="framework-tree-row"]');
    if (!(row instanceof HTMLElement)) return;
    const next = neighbourRow(row, code);
    if (!next) return;
    const id = Number(next.getAttribute('data-row-key'));
    if (Number.isNaN(id)) return;
    this.rovingId.set(id);
  }

  toggle(row: FrameworkTreeRow, event: Event): void {
    event.stopPropagation();
    this.writeCollapsed(row.id, !this.collapsed().has(row.id));
  }

  /**
   * PrimeNG ArrowLeft/ArrowRight mutate `node.expanded` and emit these.
   * The collapsed-id set is the only state that survives an A1e refresh.
   */
  onNodeToggle(event: TreeTableNodeCollapseEvent<FrameworkTreeRow>, collapsed: boolean): void {
    const id = event.node.data?.id;
    if (id === undefined) return;
    this.writeCollapsed(id, collapsed);
  }

  requestChild(event: Event, id: number): void {
    event.stopPropagation();
    this.childRequested.emit(id);
  }

  /** Enter/Space on **+** request a child and never continue to the row. */
  onAddKey(event: Event, id: number): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.code !== 'Space') return;
    event.stopPropagation();
    event.preventDefault();
    this.childRequested.emit(id);
  }

  private writeCollapsed(id: number, collapsed: boolean): void {
    const next = new Set(this.collapsed());
    if (collapsed) next.add(id);
    else next.delete(id);
    if (sameIds(next, this.collapsed())) return;
    this.collapsed.set(next);
    this.expansionChanged.emit(next);
  }

  private setQuery(value: string): void {
    const was = this.query().trim();
    const now = value.trim();
    if (was === '' && now !== '') this.collapseSnapshot = new Set(this.collapsed());
    this.query.set(value);
    if (now !== '' || was === '' || !this.collapseSnapshot) return;
    const saved = this.collapseSnapshot;
    this.collapseSnapshot = null;
    if (sameIds(saved, this.collapsed())) return;
    const restored = new Set(saved);
    this.collapsed.set(restored);
    this.expansionChanged.emit(restored);
  }
}

function visibleRowIds(nodes: readonly TreeNode<FrameworkTreeRow>[]): number[] {
  const ids: number[] = [];
  const walk = (list: readonly TreeNode<FrameworkTreeRow>[]): void => {
    for (const node of list) {
      if (node.data) ids.push(node.data.id);
      if (node.expanded && node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

function neighbourRow(row: HTMLElement, code: string): HTMLElement | null {
  if (code === 'ArrowDown') return elementRow(row.nextElementSibling);
  if (code === 'ArrowUp') return elementRow(row.previousElementSibling);
  const level = row.getAttribute('aria-level');
  const rows = Array.from(row.parentElement?.querySelectorAll(level ? `tr[aria-level="${level}"]` : 'tr') ?? []).filter(
    (candidate): candidate is HTMLElement => candidate instanceof HTMLElement && candidate.hasAttribute('data-row-key')
  );
  if (rows.length === 0) return null;
  return code === 'Home' ? rows[0] : rows[rows.length - 1];
}

function elementRow(node: Element | null): HTMLElement | null {
  return node instanceof HTMLElement && node.hasAttribute('data-row-key') ? node : null;
}

function sameIds(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  if (left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

/**
 * Rows the table shows. A search keeps matches and their ancestors and
 * forces those ancestors open. The saved collapse set is not rewritten.
 */
function projectTree(nodes: readonly TreeNode<FrameworkTreeRow>[], term: string, collapsed: ReadonlySet<number>): TreeNode<FrameworkTreeRow>[] {
  const filtering = normalizedTerm(term) !== '';
  const visit = (node: TreeNode<FrameworkTreeRow>): TreeNode<FrameworkTreeRow> | null => {
    const data = node.data;
    if (!data) return null;
    const children = (node.children ?? []).map(child => visit(child)).filter((child): child is TreeNode<FrameworkTreeRow> => child !== null);
    if (filtering && !matchesCodeOrName(data.code, data.name, term) && children.length === 0) return null;
    return {
      key: node.key,
      data,
      expanded: children.length > 0 && (filtering || !collapsed.has(data.id)),
      children
    };
  };
  return nodes.map(node => visit(node)).filter((node): node is TreeNode<FrameworkTreeRow> => node !== null);
}
