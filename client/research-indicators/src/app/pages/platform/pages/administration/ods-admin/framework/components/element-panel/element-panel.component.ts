import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
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
import { frameworkErrorOf } from '../../utils/framework-error.util';
import { PanelHeadingComponent } from '../../../panel-heading/panel-heading.component';
import { StaffPickerComponent, StaffPickerPerson } from '../staff-picker/staff-picker.component';

const CODE_MAX = 30;
const NAME_MAX = 255;

interface OpenedValues {
  code: string;
  name: string;
  description: string;
  parentId: number | null;
  carnets: string;
  people: StaffPickerPerson[];
}

// @akili-spec institutional-performance/strategy-framework T-19 — design §6.5, D-STF-29, D-STF-33.
// The page hosts this form in the side panel. No drawer, no focus trap.
// dirty compares the form with the values it was opened with (JW-8).
// A response whose generation is no longer current is ignored.
@Component({
  selector: 'app-element-panel',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, TextareaModule, TooltipModule, StaffPickerComponent, PanelHeadingComponent],
  templateUrl: './element-panel.component.html',
  styleUrl: './element-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElementPanelComponent {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly formBuilder = inject(FormBuilder);

  readonly portfolioId = input(0);
  readonly view = input<FrameworkEditorView | null>(null);
  readonly elementId = input<number | null>(null);
  readonly createRequest = input<FrameworkTableCreate | null>(null);
  /** Minted by the page each time a create opens. A late A3 for an older token is ignored. */
  readonly createToken = input(0);

  readonly saved = output<number>();
  readonly cancelled = output<'edit' | 'create'>();
  readonly deleteRequested = output<void>();
  readonly dirty = output<boolean>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly responsibles = signal<StaffPickerPerson[]>([]);

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

  readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(CODE_MAX)]),
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(NAME_MAX)]),
    description: this.formBuilder.nonNullable.control(''),
    parentId: this.formBuilder.control<number | null>(null)
  });

  private readonly formTick = signal(0);
  private readonly opened = signal<OpenedValues | null>(null);

  readonly pillCode = computed(() => {
    this.formTick();
    const code = this.form.controls.code.value.trim();
    return code === '' ? null : code;
  });

  readonly headerTitle = computed(() => {
    this.formTick();
    if (!this.element()) return `New ${this.levelName()}`;
    const typed = this.form.controls.name.value.trim();
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
    this.formTick();
    const view = this.view();
    const parentId = this.form.controls.parentId.value;
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
  /** Bumped each time the open target changes, so a late response cannot land on the next one. */
  private generation = 0;
  private preparedKey = '';
  private saveInFlight = false;
  /** Last code written by A3, so a typed code is not replaced when the parent changes. */
  private proposed: string | null = null;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.formTick.update(value => value + 1));
    effect(() => {
      const isDirty = this.dirtyNow();
      untracked(() => this.dirty.emit(isDirty));
    });
    effect(() => {
      const portfolioId = this.portfolioId();
      const elementId = this.elementId();
      const request = this.createRequest();
      const token = this.createToken();
      const view = this.view();
      untracked(() => {
        if (portfolioId === 0 || !view) return;
        // Save re-baselines from the values it sent. A refresh must not re-open the form,
        // or keystrokes typed while the request was in flight would be discarded.
        const key = `${portfolioId}:${elementId ?? ''}:${token}:${request?.depth ?? ''}:${request?.parentId ?? ''}`;
        if (key === this.preparedKey) return;
        this.preparedKey = key;
        void this.prepare(elementId, request, portfolioId, token);
      });
    });
  }

  /** The baseline becomes what was sent, with the server's code when it normalised one. */
  private adoptSaved(snapshot: OpenedValues, savedCode: string): void {
    const baseline = { ...snapshot, code: savedCode };
    if (this.form.controls.code.value === snapshot.code && savedCode !== snapshot.code) {
      this.form.controls.code.setValue(savedCode);
    }
    this.opened.set(baseline);
  }

  /** Compared with the values the form was opened with, including a prefilled A3 code. */
  isDirty(): boolean {
    return this.dirtyNow();
  }

  /** Edit Cancel puts the opened values back. The selection stays. */
  revert(): void {
    this.restoreOpened();
  }

  cancel(): void {
    if (this.element()) {
      this.restoreOpened();
      this.cancelled.emit('edit');
      return;
    }
    this.generation += 1;
    this.cancelled.emit('create');
  }

  onParentPicked(parentId: number | null): void {
    this.form.controls.parentId.setValue(parentId);
    if (this.element()) return;
    void this.proposeCode(parentId, this.generation, this.portfolioId(), this.createToken(), this.elementId());
  }

  onResponsibles(people: StaffPickerPerson[]): void {
    this.responsibles.set(people);
    this.formTick.update(value => value + 1);
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

    const snapshot = this.readForm();
    this.saveInFlight = true;
    this.saving.set(true);
    const generation = this.generation;
    const elementId = this.element()?.id ?? null;
    const token = this.createToken();
    const element = this.element();
    try {
      const response = element
        ? await this.api.PATCH_StrategyFrameworkElement(element.id, this.updateBody(element, code, name, parentId))
        : await this.api.POST_StrategyFrameworkElement(this.createBody(code, name, parentId));
      if (!this.accept(generation, elementId, token)) return;
      if (!response?.successfulRequest || !response.data) {
        if (response?.status !== 401) this.formError.set(frameworkErrorOf(response?.errorDetail));
        return;
      }
      const savedCode = response.data.code || code;
      this.adoptSaved(snapshot, savedCode);
      this.actions.showToast({ severity: 'success', summary: 'Saved', detail: `${savedCode} saved` });
      this.saved.emit(response.data.id);
    } catch (error) {
      if (!this.accept(generation, elementId, token)) return;
      this.formError.set(frameworkErrorOf(error));
    } finally {
      this.saveInFlight = false;
      this.saving.set(false);
    }
  }

  remove(): void {
    const current = this.element();
    if (!current || current.deletable !== true || this.saving()) return;
    this.deleteRequested.emit();
  }

  blockerText(current: FrameworkEditorElement): string {
    return current.blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .filter(text => text.trim() !== '')
      .join(' ');
  }

  private dirtyNow(): boolean {
    this.formTick();
    this.responsibles();
    const opened = this.opened();
    if (!opened) return false;
    return !sameOpened(opened, this.readForm());
  }

  private readForm(): OpenedValues {
    const people = this.responsibles().map(person => ({ ...person }));
    return {
      code: this.form.controls.code.value,
      name: this.form.controls.name.value,
      description: this.form.controls.description.value,
      parentId: this.form.controls.parentId.value,
      carnets: people.map(person => person.carnet).join('\n'),
      people
    };
  }

  private captureOpened(): void {
    this.opened.set(this.readForm());
  }

  private restoreOpened(): void {
    const opened = this.opened();
    if (!opened) return;
    this.form.reset({
      code: opened.code,
      name: opened.name,
      description: opened.description,
      parentId: opened.parentId
    });
    this.responsibles.set(opened.people.map(person => ({ ...person })));
    this.formError.set(null);
  }

  /**
   * True only for the open target that started this request.
   * A later selection or create token makes the response stale.
   */
  private accept(generation: number, elementId: number | null, token: number): boolean {
    if (generation !== this.generation) return false;
    if (this.elementId() !== elementId) return false;
    if (this.createToken() !== token) return false;
    return true;
  }

  private async prepare(elementId: number | null, request: FrameworkTableCreate | null, portfolioId: number, token: number): Promise<void> {
    const generation = ++this.generation;
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
      this.captureOpened();
      return;
    }
    if (!request) return;
    const parentId = request.parentId ?? null;
    this.responsibles.set([]);
    this.form.reset({ code: '', name: '', description: '', parentId });
    this.captureOpened();
    this.focusFirstField(generation);
    if (request.depth > 1 && parentId === null) return;
    await this.proposeCode(parentId, generation, portfolioId, token, elementId);
  }

  private async proposeCode(
    parentId: number | null,
    generation: number,
    portfolioId: number,
    token: number,
    elementId: number | null
  ): Promise<void> {
    const query: FrameworkCodeProposalQuery = { portfolioId };
    if (parentId !== null) query.parentId = parentId;
    try {
      const response = await this.api.GET_StrategyFrameworkCodeProposal(query);
      if (!this.accept(generation, elementId, token) || this.element()) return;
      const code = response?.successfulRequest ? (response.data?.code ?? '') : '';
      if (code === '') return;
      const current = this.form.controls.code.value.trim();
      if (current !== '' && current !== this.proposed) return;
      const before = this.readForm();
      const opened = this.opened();
      const untouched = opened !== null && sameOpened(opened, before);
      this.proposed = code;
      this.form.controls.code.setValue(code);
      if (untouched) this.captureOpened();
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

  /** Create mode only. Selecting a row leaves focus on that row (NFR-STF-004). */
  private focusFirstField(generation: number): void {
    setTimeout(() => {
      if (generation !== this.generation || this.element()) return;
      const field = this.codeField()?.nativeElement;
      if (field?.isConnected) field.focus();
    }, 0);
  }
}

function sameOpened(left: OpenedValues, right: OpenedValues): boolean {
  return (
    left.code === right.code &&
    left.name === right.name &&
    left.description === right.description &&
    left.parentId === right.parentId &&
    left.carnets === right.carnets
  );
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
