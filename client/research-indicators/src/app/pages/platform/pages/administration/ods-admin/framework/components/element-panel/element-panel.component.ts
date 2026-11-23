import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { FocusTrapModule } from 'primeng/focustrap';
import { SelectModule } from 'primeng/select';
import {
  CreateFrameworkElementPayload,
  FrameworkCodeProposalQuery,
  FrameworkEditorElement,
  FrameworkEditorView,
  UpdateFrameworkElementPayload
} from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import type { FrameworkTableCreate } from '../framework-tables/framework-tables.component';
import { tableRowsForLevel } from '../../utils/framework-view.util';
import { frameworkErrorOf } from '../../utils/framework-error.util';
import { FrameworkDeleteHandler } from '../../framework-delete.handler';
import { OverlayEscapeGuardDirective } from '../../../overlay-escape-guard.directive';
import { PanelHeadingComponent } from '../../../panel-heading/panel-heading.component';
import { StaffPickerComponent, StaffPickerPerson } from '../staff-picker/staff-picker.component';

const CODE_MAX = 30;
const NAME_MAX = 255;

// @akili-spec institutional-performance/strategy-framework T-15 — design §6.5, §6.3, P-33, D-STF-14, D-STF-26.
// Details panel. pFocusTrap on the content; the page returns focus to the opener.
// Parent options are elements one level up only. Delete uses FrameworkDeleteHandler.
// 4xx except 401 stays inline (frameworkErrorOf). jsdom cannot prove the drawer width (KZ-017).
@Component({
  selector: 'app-element-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DrawerModule, SelectModule, FocusTrapModule, StaffPickerComponent, OverlayEscapeGuardDirective, PanelHeadingComponent],
  providers: [FrameworkDeleteHandler],
  templateUrl: './element-panel.component.html',
  styleUrl: './element-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElementPanelComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly deletes = inject(FrameworkDeleteHandler);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly portfolioId = input(0);
  readonly view = input<FrameworkEditorView | null>(null);
  readonly elementId = input<number | null>(null);
  readonly createRequest = input<FrameworkTableCreate | null>(null);
  /** Which view opened the panel. Delete focus follows that view's order. */
  readonly surface = input<'editor' | 'table'>('editor');

  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly removed = output<void>();
  readonly refreshed = output<FrameworkEditorView>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly responsibles = signal<StaffPickerPerson[]>([]);
  /** 420px, or the full drawer width under 1024px (design §6.5). jsdom does not apply this. */
  private readonly narrow = signal(false);

  readonly element = computed(() => {
    const id = this.elementId();
    if (id === null) return null;
    return this.view()?.elements.find(item => item.id === id) ?? null;
  });

  readonly depth = computed(() => this.element()?.depth ?? this.createRequest()?.depth ?? 1);

  readonly showParent = computed(() => this.depth() > 1);

  readonly levelName = computed(() => this.view()?.levels.find(level => level.depth === this.depth())?.name ?? 'Element');

  readonly parentLevelName = computed(() => {
    const depth = this.depth() - 1;
    return this.view()?.levels.find(level => level.depth === depth)?.name ?? 'Parent';
  });

  readonly eyebrow = computed(() => `${this.levelName().toUpperCase()} · LEVEL ${this.depth()}`);

  readonly indicatorLevel = computed(() => this.view()?.levels.find(level => level.depth === this.depth())?.isIndicatorLevel === true);

  /** Elements one level up only. Same-depth and deeper rows are not options (R-STF-003). */
  readonly parentOptions = computed(() => {
    const parentDepth = this.depth() - 1;
    if (parentDepth < 1) return [];
    return (this.view()?.elements ?? [])
      .filter(item => item.depth === parentDepth)
      .map(item => ({ id: item.id, label: `${item.code} · ${item.name}` }));
  });

  readonly drawerStyle = computed(() => ({ width: this.narrow() ? '100%' : '420px' }));

  readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(CODE_MAX)]),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(NAME_MAX)]),
    description: this.formBuilder.nonNullable.control(''),
    parentId: this.formBuilder.control<number | null>(null)
  });

  private readonly codeValue = toSignal(this.form.controls.code.valueChanges, { initialValue: this.form.controls.code.value });
  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: this.form.controls.name.value });
  private readonly parentValue = toSignal(this.form.controls.parentId.valueChanges, { initialValue: this.form.controls.parentId.value });

  /** No pill until a code exists. Create mode keeps the "New …" title either way. */
  readonly pillCode = computed(() => {
    const code = this.codeValue().trim();
    return code === '' ? null : code;
  });

  readonly headerTitle = computed(() => {
    if (!this.element()) return `New ${this.levelName()}`;
    const typed = this.nameValue().trim();
    return typed !== '' ? typed : (this.element()?.name ?? '');
  });

  readonly codeHint = computed(() =>
    this.element() ? 'Must be unique within the portfolio.' : 'Proposed automatically. Must be unique within the portfolio.'
  );

  /**
   * Ancestors above the selected parent, root first. Read from the view
   * already loaded; a parent change recomputes the chain. No request.
   */
  readonly derivedAncestors = computed(() => {
    const view = this.view();
    const parentId = this.parentValue();
    if (!view || parentId === null || this.depth() < 3) return [];
    const byId = new Map(view.elements.map(item => [item.id, item]));
    const parent = byId.get(parentId);
    if (!parent) return [];
    const parentLevel = view.levels.find(level => level.depth === parent.depth)?.name ?? 'parent';
    const chain: FrameworkEditorElement[] = [];
    const seen = new Set<number>();
    let current = parent.parentId === null ? undefined : byId.get(parent.parentId);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    chain.reverse();
    return chain.map(item => ({
      depth: item.depth,
      label: `${view.levels.find(level => level.depth === item.depth)?.name ?? 'Level'} (derived from the ${parentLevel})`,
      value: `${item.code} · ${item.name}`
    }));
  });

  private readonly codeField = viewChild<ElementRef<HTMLInputElement>>('codeField');
  private session = 0;
  private saveInFlight = false;
  /** Last code written by A3, so a typed code is not replaced when the parent changes. */
  private proposed: string | null = null;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const portfolioId = this.portfolioId();
      const elementId = this.elementId();
      const request = this.createRequest();
      const view = this.view();
      untracked(() => {
        if (!isOpen || portfolioId === 0 || !view) return;
        void this.prepare(elementId, request, portfolioId);
      });
    });
  }

  ngOnInit(): void {
    this.watchViewport();
  }

  onVisibleChange(visible: boolean): void {
    if (visible || !this.open()) return;
    this.requestClose();
  }

  cancel(): void {
    this.requestClose();
  }

  onParentPicked(parentId: number | null): void {
    this.form.controls.parentId.setValue(parentId);
    if (this.element()) return;
    void this.proposeCode(parentId, this.session, this.portfolioId());
  }

  onResponsibles(people: StaffPickerPerson[]): void {
    this.responsibles.set(people);
  }

  async save(): Promise<void> {
    if (this.saveInFlight) return;
    this.formError.set(null);
    this.form.markAllAsTouched();
    const code = this.form.controls.code.value.trim();
    const name = this.form.controls.name.value.trim();
    const parentId = this.form.controls.parentId.value;
    if (this.form.invalid || code === '' || name === '') return;
    if (this.showParent() && parentId === null) return;

    this.saveInFlight = true;
    this.saving.set(true);
    const flight = this.session;
    const element = this.element();
    try {
      const response = element
        ? await this.api.PATCH_StrategyFrameworkElement(element.id, this.updateBody(element, code, name, parentId))
        : await this.api.POST_StrategyFrameworkElement(this.createBody(code, name, parentId));
      if (flight !== this.session || !this.open()) return;
      if (!response?.successfulRequest || !response.data) {
        if (response?.status !== 401) this.formError.set(frameworkErrorOf(response?.errorDetail));
        return;
      }
      const savedCode = response.data.code || code;
      this.actions.showToast({ severity: 'success', summary: 'Saved', detail: `${savedCode} saved` });
      this.saved.emit();
    } catch (error) {
      if (flight !== this.session || !this.open()) return;
      this.formError.set(frameworkErrorOf(error));
    } finally {
      this.saveInFlight = false;
      this.saving.set(false);
    }
  }

  async remove(event: Event): Promise<void> {
    const element = this.element();
    if (!element || this.saving()) return;
    const button = focusable(event.currentTarget);
    await this.deletes.request({
      id: element.id,
      returnFocus: button,
      resolveElement: () => {
        const current = this.element();
        if (!current) return null;
        return { element: current, levelName: this.levelName() };
      },
      prepareFocus: () => this.focusAfter(element.id),
      onDeleted: async () => {
        const response = await this.api.GET_StrategyFrameworkEditor(this.portfolioId());
        if (response?.successfulRequest && response.data && response.data.portfolioId === this.portfolioId()) {
          this.refreshed.emit(response.data);
        }
        this.removed.emit();
      }
    });
  }

  private requestClose(): void {
    this.session += 1;
    this.saveInFlight = false;
    this.closed.emit();
  }

  private async prepare(elementId: number | null, request: FrameworkTableCreate | null, portfolioId: number): Promise<void> {
    const session = ++this.session;
    this.formError.set(null);
    this.saving.set(false);
    this.saveInFlight = false;
    this.proposed = null;
    const existing = elementId === null ? null : (this.view()?.elements.find(item => item.id === elementId) ?? null);
    const depth = existing?.depth ?? request?.depth ?? 1;
    const parent = this.form.controls.parentId;
    if (depth > 1) parent.setValidators(Validators.required);
    else parent.clearValidators();
    parent.updateValueAndValidity({ emitEvent: false });

    if (existing) {
      this.form.reset({
        code: existing.code,
        name: existing.name,
        description: existing.description ?? '',
        parentId: existing.parentId
      });
      this.responsibles.set((existing.responsibles ?? []).map(person => ({ ...person })));
      this.focusCode(session);
      return;
    }
    if (!request) return;
    this.responsibles.set([]);
    this.form.reset({ code: '', name: '', description: '', parentId: null });
    this.focusCode(session);
    if (request.depth > 1) return;
    await this.proposeCode(null, session, portfolioId);
  }

  private async proposeCode(parentId: number | null, session: number, portfolioId: number): Promise<void> {
    const query: FrameworkCodeProposalQuery = { portfolioId };
    if (parentId !== null) query.parentId = parentId;
    try {
      const response = await this.api.GET_StrategyFrameworkCodeProposal(query);
      if (session !== this.session || !this.open() || this.element()) return;
      const code = response?.successfulRequest ? (response.data?.code ?? '') : '';
      if (code === '') return;
      const current = this.form.controls.code.value.trim();
      if (current !== '' && current !== this.proposed) return;
      this.proposed = code;
      this.form.controls.code.setValue(code);
    } catch {
      // The code field stays as the user left it. A typed code is still required to save.
    }
  }

  private createBody(code: string, name: string, parentId: number | null): CreateFrameworkElementPayload {
    const body: CreateFrameworkElementPayload = {
      portfolioId: this.portfolioId(),
      code,
      name,
      description: blankToNull(this.form.controls.description.value)
    };
    if (parentId !== null) body.parentId = parentId;
    if (this.indicatorLevel()) body.responsibleCarnets = this.responsibles().map(person => person.carnet);
    return body;
  }

  private updateBody(element: FrameworkEditorElement, code: string, name: string, parentId: number | null): UpdateFrameworkElementPayload {
    const body: UpdateFrameworkElementPayload = {
      code,
      name,
      description: blankToNull(this.form.controls.description.value)
    };
    if (this.showParent() && parentId !== null && parentId !== element.parentId) body.parentId = parentId;
    if (this.indicatorLevel()) body.responsibleCarnets = this.responsibles().map(person => person.carnet);
    return body;
  }

  private focusAfter(id: number): () => HTMLElement | null {
    if (this.surface() === 'table') return this.focusTableAfter(id);
    return this.focusOutlineAfter(id);
  }

  private focusOutlineAfter(id: number): () => HTMLElement | null {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="outline-row"]'));
    const index = rows.findIndex(row => row.getAttribute('data-row-key') === `id:${id}`);
    const previousKey = index > 0 ? rows[index - 1].getAttribute('data-row-key') : null;
    const parentId = this.element()?.parentId ?? null;
    return () => {
      if (previousKey) {
        const controls = document.querySelector(`[data-row-key="${cssEscape(previousKey)}"] [data-testid="row-controls"]`);
        const control = firstEnabled(controls);
        if (control?.isConnected) return control;
      }
      if (parentId !== null) {
        const add = document.querySelector(`[data-row-key="id:${parentId}"] [data-testid="add-child"]`);
        if (add instanceof HTMLElement && add.isConnected && !add.hasAttribute('disabled')) return add;
      }
      const rootAdd = document.querySelector('[data-testid="add-root"]');
      if (rootAdd instanceof HTMLElement && rootAdd.isConnected) return rootAdd;
      const pageAdd = document.querySelector('[data-testid="add-root-button"] button, [data-testid="add-root-button"]');
      return pageAdd instanceof HTMLElement ? pageAdd : null;
    };
  }

  private focusTableAfter(id: number): () => HTMLElement | null {
    const depth = this.depth();
    const view = this.view();
    const rows = view ? tableRowsForLevel(view, depth) : [];
    const index = rows.findIndex(row => row.id === id);
    const previousId = index > 0 ? rows[index - 1].id : null;
    return () => {
      const panel = document.querySelector(`[data-testid="level-table"][data-depth="${depth}"]`);
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

  private focusCode(session: number): void {
    setTimeout(() => {
      if (session !== this.session || !this.open()) return;
      const field = this.codeField()?.nativeElement;
      if (field?.isConnected) field.focus();
    }, 0);
  }

  /** Viewport width for the drawer. matchMedia is absent in some test environments. */
  private watchViewport(): void {
    if (typeof window.matchMedia !== 'function') return;
    let media: MediaQueryList;
    try {
      media = window.matchMedia('(max-width: 1023px)');
    } catch {
      return;
    }
    this.narrow.set(media.matches);
    if (typeof media.addEventListener !== 'function') return;
    const onChange = (event: MediaQueryListEvent) => this.narrow.set(event.matches);
    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function focusable(current: EventTarget | null): HTMLElement | null {
  if (!(current instanceof HTMLElement)) return null;
  if (current.matches('button')) return current;
  const button = current.querySelector('button');
  return button instanceof HTMLElement ? button : current;
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
