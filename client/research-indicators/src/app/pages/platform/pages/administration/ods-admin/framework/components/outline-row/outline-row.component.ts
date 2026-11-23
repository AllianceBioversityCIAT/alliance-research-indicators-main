import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { CreateFrameworkElementPayload, FrameworkLevel, UsageLabel } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';
import { hasPinnedDescendant, hasShownDescendant, nodeShown, normalizedTerm } from '../../utils/outline-filter.util';
import { descendantCountText } from '../../utils/framework-view.util';
import { frameworkErrorOf } from '../../utils/framework-error.util';
import { OutlineAddChildEvent, OutlineCommittedEvent, OutlineNode, OutlineRemoveEvent } from '../outline-node.model';

type RowPhase = 'idle' | 'dirty' | 'saving' | 'error';

const REQUIRED = 'Name is required';

// @akili-spec institutional-performance/strategy-framework T-13 — design §6.3, D-STF-17, NFR-STF-004.
// Recursive, OnPush, field state in signals. Enter sets `saving` and blurs; the blur handler
// returns while `saving`, so one edit sends one request. jsdom cannot measure indent or contrast (T-17).
@Component({
  selector: 'app-outline-row',
  standalone: true,
  imports: [CommonModule, TooltipModule, OutlineRowComponent],
  templateUrl: './outline-row.component.html',
  styleUrl: './outline-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'outline-row',
    '[attr.data-depth]': 'depth()',
    '[attr.data-row-key]': 'node().key',
    '[attr.data-testid]': '"outline-row"',
    '[hidden]': 'selfHidden()'
  }
})
export class OutlineRowComponent {
  private readonly api = inject(ApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly node = input.required<OutlineNode>();
  readonly levels = input.required<readonly FrameworkLevel[]>();
  readonly usageLabels = input.required<readonly UsageLabel[]>();
  readonly portfolioId = input.required<number>();
  readonly query = input('');
  readonly collapsedIds = input<ReadonlySet<number>>(new Set());
  readonly pinnedKeys = input<ReadonlySet<string>>(new Set());

  readonly committed = output<OutlineCommittedEvent>();
  readonly discardDraft = output<string>();
  readonly addChild = output<OutlineAddChildEvent>();
  readonly details = output<number>();
  readonly remove = output<OutlineRemoveEvent>();
  readonly toggleCollapsed = output<number>();
  readonly presence = output<{ key: string; pinned: boolean }>();

  /** Null means "show the stored name". A draft keeps the typed string here, including ''. */
  private readonly typed = signal<string | null>(null);
  readonly phase = signal<RowPhase>('idle');
  readonly errorText = signal<string | null>(null);

  private alive = true;

  readonly isDraft = computed(() => this.node().draft !== null);
  readonly depth = computed(() => this.node().element?.depth ?? this.node().draft?.depth ?? 1);
  readonly level = computed(() => this.levels().find(item => item.depth === this.depth()) ?? null);
  readonly nextLevel = computed(() => {
    if (this.isDraft()) return null;
    return this.levels().find(item => item.depth === this.depth() + 1) ?? null;
  });
  readonly isIndicator = computed(() => this.level()?.isIndicatorLevel === true);
  readonly levelName = computed(() => this.level()?.name ?? 'Element');
  readonly shortLabel = computed(() => this.level()?.shortLabel ?? '');
  readonly codeText = computed(() => this.node().element?.code ?? 'New');
  readonly nameLabel = computed(() => `${this.levelName()} ${this.codeText()} name`);
  readonly detailsLabel = computed(() => `Edit details of ${this.levelName()} ${this.codeText()}`);
  readonly deleteLabel = computed(() => `Delete ${this.levelName()} ${this.codeText()}`);
  readonly deletable = computed(() => this.node().element?.deletable === true);
  readonly deleteReady = computed(() => this.deletable() && this.phase() !== 'saving');
  readonly blockerText = computed(() => {
    const blockers = this.node().element?.blockers ?? [];
    return blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .filter(text => text.trim() !== '')
      .join(' ');
  });
  readonly blockerId = computed(() => {
    if (this.deletable() || this.isDraft() || this.blockerText() === '') return null;
    return `outline-blocker-${this.node().key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  });
  readonly countsText = computed(() => {
    if (this.isDraft()) return '';
    return descendantCountText(this.node().counts, this.levels(), this.node().element?.usage ?? {}, this.usageLabels());
  });
  /**
   * Idle rows follow the server name, so a refresh updates them.
   * Dirty, saving and error rows keep what was typed (the refresh merge rule).
   */
  readonly shownName = computed(() => {
    const typed = this.typed();
    if (typed !== null && this.phase() !== 'idle') return typed;
    return this.node().element?.name ?? '';
  });

  readonly hasChildren = computed(() => this.node().children.length > 0);
  readonly childrenDomId = computed(() => `outline-children-${this.node().key.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
  /**
   * Collapsed ids survive a refresh. A filter force-opens ancestors of a hit,
   * and a draft or unsaved descendant is never left inside a closed parent.
   */
  readonly expanded = computed(() => {
    const id = this.node().element?.id;
    const collapsed = id !== undefined && this.collapsedIds().has(id);
    if (normalizedTerm(this.query()) !== '' && hasShownDescendant(this.node(), this.query(), this.pinnedKeys())) return true;
    if (hasPinnedDescendant(this.node(), this.pinnedKeys())) return true;
    return !collapsed;
  });
  readonly toggleLabel = computed(() => `${this.expanded() ? 'Collapse' : 'Expand'} ${this.levelName()} ${this.codeText()}`);
  readonly selfHidden = computed(() => normalizedTerm(this.query()) !== '' && !nodeShown(this.node(), this.query(), this.pinnedKeys()));

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.alive = false;
    });
    afterNextRender(() => {
      // The row spec creates the component before setInput; that tick has no field yet.
      const input = this.host.nativeElement.querySelector('[data-testid="name-input"]');
      if (!(input instanceof HTMLInputElement) || this.node().draft?.autofocus !== true) return;
      input.focus();
    });
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // The field is read-only while saving, but a DOM write still lands in jsdom.
    // Put the in-flight value back so the keystrokes never stick.
    if (this.phase() === 'saving') {
      input.value = this.shownName();
      return;
    }
    const value = input.value;
    this.typed.set(value);
    this.errorText.set(null);
    const stored = this.node().element?.name ?? '';
    if (!this.isDraft() && value === stored) {
      this.typed.set(null);
      this.setPhase('idle');
      return;
    }
    this.setPhase('dirty');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.phase() === 'saving') return;
      event.preventDefault();
      event.stopPropagation();
      if (this.isDraft()) {
        const key = this.node().draft?.key;
        if (key) this.discardDraft.emit(key);
        return;
      }
      this.typed.set(null);
      this.setPhase('idle');
      this.errorText.set(null);
      return;
    }
    if (event.key !== 'Enter') return;
    if (this.phase() === 'saving') return;
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    this.startSave(input.value);
    input.blur();
  }

  onBlur(event: FocusEvent): void {
    // Enter already moved the field to `saving` and sent the request.
    // This return is what keeps the blur that follows from sending a second one.
    if (this.phase() === 'saving') return;
    const input = event.target as HTMLInputElement;
    this.startSave(input.value);
  }

  toggle(): void {
    const id = this.node().element?.id;
    if (id === undefined) return;
    this.toggleCollapsed.emit(id);
  }

  requestChild(): void {
    const next = this.nextLevel();
    const element = this.node().element;
    if (!next || !element) return;
    this.addChild.emit({ parentId: element.id, depth: next.depth });
  }

  openDetails(): void {
    const element = this.node().element;
    if (!element || this.phase() === 'saving') return;
    this.details.emit(element.id);
  }

  requestDelete(event: Event): void {
    const element = this.node().element;
    if (!element || this.phase() === 'saving') return;
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) return;
    this.remove.emit({ id: element.id, parentId: element.parentId, button });
  }

  /**
   * Moves a non-empty change to `saving` and sends it.
   * Does not look at `saving` — the blur handler is the guard against a second send.
   * Returns false when the field was rejected or matched the stored name.
   */
  private startSave(raw: string): boolean {
    const name = raw.trim();
    if (name === '') {
      this.typed.set(raw);
      this.setPhase('error');
      this.errorText.set(REQUIRED);
      return false;
    }
    if (!this.isDraft() && name === (this.node().element?.name ?? '')) {
      this.typed.set(null);
      this.setPhase('idle');
      this.errorText.set(null);
      return false;
    }
    this.typed.set(raw);
    this.setPhase('saving');
    this.errorText.set(null);
    void this.dispatchSave(name);
    return true;
  }

  private async dispatchSave(name: string): Promise<void> {
    const draft = this.node().draft;
    try {
      const response = draft
        ? await this.api.POST_StrategyFrameworkElement(this.createBody(name, draft.parentId))
        : await this.api.PATCH_StrategyFrameworkElement(this.node().element?.id ?? 0, { name });
      if (!this.alive) return;
      if (!response?.successfulRequest || !response.data) {
        this.fail(frameworkErrorOf(response?.errorDetail));
        return;
      }
      this.errorText.set(null);
      this.typed.set(null);
      this.setPhase('idle');
      this.committed.emit({ draftKey: draft?.key ?? null });
    } catch (error) {
      if (!this.alive) return;
      this.fail(frameworkErrorOf(error));
    }
  }

  private createBody(name: string, parentId: number | null): CreateFrameworkElementPayload {
    const body: CreateFrameworkElementPayload = {
      portfolioId: this.portfolioId(),
      name
    };
    if (parentId !== null) body.parentId = parentId;
    return body;
  }

  private fail(message: string): void {
    this.setPhase('error');
    this.errorText.set(message);
  }

  /** Unsaved phases stay visible under search and under a collapsed parent. */
  private setPhase(phase: RowPhase): void {
    this.phase.set(phase);
    this.presence.emit({ key: this.node().key, pinned: phase !== 'idle' });
  }
}
