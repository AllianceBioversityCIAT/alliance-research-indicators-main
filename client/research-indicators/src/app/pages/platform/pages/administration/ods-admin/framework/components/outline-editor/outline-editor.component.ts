import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FrameworkEditorView } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';
import { FrameworkDeleteHandler } from '../../framework-delete.handler';
import { nodeShown } from '../../utils/outline-filter.util';
import { FrameworkOutlineNode, nestFramework } from '../../utils/framework-view.util';
import { OutlineAddChildEvent, OutlineCommittedEvent, OutlineDraft, OutlineNode, OutlineRemoveEvent } from '../outline-node.model';
import { OutlineRowComponent } from '../outline-row/outline-row.component';

// @akili-spec institutional-performance/strategy-framework T-13 — design §6.3, §5.4, D-STF-19, D-STF-26.
// Cards, drafts and refresh merge. The row owns the name field.
// Delete is the shared handler (T-14): the same alerts and the same focus return.
// Accent visibility and contrast are HITL (T-17); this file only references the tokens.
@Component({
  selector: 'app-outline-editor',
  standalone: true,
  imports: [CommonModule, OutlineRowComponent],
  providers: [FrameworkDeleteHandler],
  templateUrl: './outline-editor.component.html',
  styleUrl: './outline-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutlineEditorComponent {
  private readonly api = inject(ApiService);
  private readonly deletes = inject(FrameworkDeleteHandler);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly view = input.required<FrameworkEditorView>();
  /** The page's empty-state **+ Add** sets this; one root draft is created. */
  readonly requestRootDraft = input(false);

  readonly viewChange = output<FrameworkEditorView>();
  readonly detailsRequested = output<number>();
  readonly rootDraftDismissed = output<void>();

  private readonly current = signal<FrameworkEditorView | null>(null);
  private readonly drafts = signal<OutlineDraft[]>([]);
  /** Element ids the user collapsed. Keyed by id so a view refresh keeps it. */
  private readonly collapsedIds = signal<ReadonlySet<number>>(new Set());
  /** Row keys whose name is dirty, saving or in error. Drafts are pinned separately. */
  private readonly pinnedKeys = signal<ReadonlySet<string>>(new Set());
  readonly query = signal('');
  /** Collapse set from before the current search. Clearing the search puts it back. */
  private collapseSnapshot: ReadonlySet<number> | null = null;
  private portfolioSeen: number | null = null;
  private draftSequence = 0;
  private refreshToken = 0;

  readonly shownView = computed(() => this.current() ?? this.view());
  readonly roots = computed(() => buildOutline(this.shownView(), this.drafts()));
  readonly collapsed = this.collapsedIds.asReadonly();
  readonly pinned = this.pinnedKeys.asReadonly();
  readonly trimmedQuery = computed(() => this.query().trim());
  readonly noMatches = computed(() => {
    const term = this.trimmedQuery();
    if (term === '') return false;
    return !this.roots().some(node => nodeShown(node, term, this.pinnedKeys()));
  });
  readonly addRootLabel = computed(() => {
    const levels = [...this.shownView().levels].sort((left, right) => left.depth - right.depth);
    const name = levels[0]?.name ?? 'Performance Area';
    return `+ Add ${name}`;
  });

  constructor() {
    effect(() => {
      const incoming = this.view();
      untracked(() => this.absorb(incoming));
    });
    effect(() => {
      if (!this.requestRootDraft()) return;
      untracked(() => this.ensureRootDraft());
    });
  }

  addRoot(): void {
    this.addDraft(null, 1);
  }

  onAddChild(event: OutlineAddChildEvent): void {
    this.expand(event.parentId);
    this.addDraft(event.parentId, event.depth);
  }

  onToggle(id: number): void {
    this.collapsedIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  onPresence(event: { key: string; pinned: boolean }): void {
    this.pinnedKeys.update(current => {
      const has = current.has(event.key);
      if (event.pinned === has) return current;
      const next = new Set(current);
      if (event.pinned) next.add(event.key);
      else next.delete(event.key);
      return next;
    });
  }

  onSearchInput(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.setQuery(value);
  }

  clearSearch(): void {
    this.setQuery('');
  }

  rootHidden(node: OutlineNode, term: string, pinnedKeys: ReadonlySet<string>): boolean {
    return !nodeShown(node, term, pinnedKeys);
  }

  onCommitted(event: OutlineCommittedEvent): void {
    if (event.draftKey !== null) {
      this.drafts.update(list => list.filter(draft => draft.key !== event.draftKey));
    }
    void this.refresh();
  }

  discardDraft(key: string): void {
    this.drafts.update(list => list.filter(draft => draft.key !== key));
    const view = this.shownView();
    const rootDraft = this.drafts().some(draft => draft.parentId === null);
    if (view.elements.length === 0 && !rootDraft) this.rootDraftDismissed.emit();
  }

  async onRemove(event: OutlineRemoveEvent): Promise<void> {
    await this.deletes.request({
      id: event.id,
      returnFocus: event.button,
      resolveElement: () => {
        const element = this.shownView().elements.find(item => item.id === event.id);
        if (!element) return null;
        return { element, levelName: this.levelName(element.depth) };
      },
      prepareFocus: () => this.focusTargetAfter(event.id),
      onDeleted: () => this.refresh()
    });
  }

  private ensureRootDraft(): void {
    if (this.shownView().elements.length > 0) return;
    if (this.drafts().some(draft => draft.parentId === null)) return;
    this.addDraft(null, 1);
  }

  private setQuery(value: string): void {
    const was = this.query().trim();
    const now = value.trim();
    if (was === '' && now !== '') this.collapseSnapshot = new Set(this.collapsedIds());
    this.query.set(value);
    if (now === '' && was !== '' && this.collapseSnapshot) {
      this.collapsedIds.set(new Set(this.collapseSnapshot));
      this.collapseSnapshot = null;
    }
  }

  /** Adding a child opens its parent, including the snapshot a search would restore. */
  private expand(id: number): void {
    const open = (set: ReadonlySet<number>): ReadonlySet<number> => {
      if (!set.has(id)) return set;
      const next = new Set(set);
      next.delete(id);
      return next;
    };
    this.collapsedIds.update(open);
    if (this.collapseSnapshot) this.collapseSnapshot = open(this.collapseSnapshot);
  }

  private addDraft(parentId: number | null, depth: number): void {
    const key = `d${++this.draftSequence}`;
    this.drafts.update(list => [...list, { key, parentId, depth, autofocus: true }]);
  }

  private absorb(incoming: FrameworkEditorView): void {
    const portfolioChanged = this.portfolioSeen !== null && this.portfolioSeen !== incoming.portfolioId;
    this.portfolioSeen = incoming.portfolioId;
    if (portfolioChanged) {
      this.drafts.set([]);
      this.collapsedIds.set(new Set());
      this.pinnedKeys.set(new Set());
      this.query.set('');
      this.collapseSnapshot = null;
    } else this.pruneDrafts(incoming);
    this.current.set(incoming);
  }

  /** Drops drafts whose parent disappeared. Root drafts stay. Dirty rows live on the row. */
  private pruneDrafts(view: FrameworkEditorView): void {
    const ids = new Set(view.elements.map(element => element.id));
    this.drafts.update(list => list.filter(draft => draft.parentId === null || ids.has(draft.parentId)));
  }

  private async refresh(): Promise<void> {
    const token = ++this.refreshToken;
    const portfolioId = this.shownView().portfolioId;
    const response = await this.api.GET_StrategyFrameworkEditor(portfolioId);
    if (token !== this.refreshToken) return;
    if (!response?.successfulRequest || !response.data) return;
    if (response.data.portfolioId !== portfolioId) return;
    this.viewChange.emit(response.data);
    this.absorb(response.data);
  }

  private focusTargetAfter(id: number): () => HTMLElement | null {
    const flat = flatten(this.roots());
    const index = flat.findIndex(node => node.element?.id === id);
    const previous = index > 0 ? flat[index - 1] : null;
    const parentId = index >= 0 ? (flat[index]?.element?.parentId ?? null) : null;
    const host = this.host.nativeElement;
    return () => {
      if (previous && host.isConnected) {
        const controls = host.querySelector(`[data-row-key="${cssEscape(previous.key)}"] [data-testid="row-controls"]`);
        const control = firstEnabled(controls);
        if (control?.isConnected) return control;
      }
      if (parentId !== null && host.isConnected) {
        const add = host.querySelector(`[data-row-key="id:${parentId}"] [data-testid="add-child"]`);
        if (add instanceof HTMLElement && add.isConnected && !add.hasAttribute('disabled')) return add;
      }
      const rootAdd = host.isConnected ? host.querySelector('[data-testid="add-root"]') : null;
      if (rootAdd instanceof HTMLElement && rootAdd.isConnected) return rootAdd;
      const pageAdd = document.querySelector('[data-testid="add-root-button"] button, [data-testid="add-root-button"]');
      return pageAdd instanceof HTMLElement ? pageAdd : null;
    };
  }

  private levelName(depth: number): string {
    return this.shownView().levels.find(level => level.depth === depth)?.name ?? 'Element';
  }
}

function buildOutline(view: FrameworkEditorView, drafts: readonly OutlineDraft[]): OutlineNode[] {
  const draftNode = (draft: OutlineDraft): OutlineNode => ({
    key: `draft:${draft.key}`,
    element: null,
    draft,
    counts: {},
    children: []
  });
  const toNode = (node: FrameworkOutlineNode): OutlineNode => ({
    key: `id:${node.element.id}`,
    element: node.element,
    draft: null,
    counts: node.descendantCounts,
    children: [...node.children.map(toNode), ...drafts.filter(draft => draft.parentId === node.element.id).map(draftNode)]
  });
  const roots = nestFramework(view).map(toNode);
  for (const draft of drafts) {
    if (draft.parentId === null) roots.push(draftNode(draft));
  }
  return roots;
}

function flatten(nodes: readonly OutlineNode[]): OutlineNode[] {
  const out: OutlineNode[] = [];
  const walk = (node: OutlineNode): void => {
    out.push(node);
    for (const child of node.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return out;
}

function firstEnabled(container: ParentNode | null): HTMLElement | null {
  if (!container) return null;
  for (const el of Array.from(container.querySelectorAll<HTMLElement>('input, button'))) {
    if (el.getAttribute('data-testid') === 'toggle-children') continue;
    if (el.hasAttribute('disabled')) continue;
    if (el.getAttribute('aria-disabled') === 'true') continue;
    if (el instanceof HTMLInputElement && el.readOnly) continue;
    return el;
  }
  return null;
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(value) : value.replace(/"/g, '\\"');
}
