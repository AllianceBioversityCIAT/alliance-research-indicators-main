import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { CreateInstitutionalObjectivePayload, FrameworkObjective, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { PanelHeadingComponent } from '../../../panel-heading/panel-heading.component';
import { frameworkErrorOf } from '../../../framework/utils/framework-error.util';
import { indicatorGroups } from '../../objective-view.util';

const CODE_MAX = 30;

interface OpenedValues {
  code: string;
  year: number | null;
  statement: string;
  elementIds: string;
}

// @akili-spec institutional-performance/strategy-framework T-20 — design §6.6, §6.9, D-STF-29, D-STF-33.
// The page hosts this form in the side panel. No drawer, no focus trap.
// dirty compares the form with the values it was opened with. A save snapshots
// those values before the request; a later refresh must not re-open the form.
@Component({
  selector: 'app-objective-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, SelectModule, MultiSelectModule, TooltipModule, PanelHeadingComponent],
  templateUrl: './objective-panel.component.html',
  styleUrl: './objective-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObjectivePanelComponent {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly formBuilder = inject(FormBuilder);

  readonly portfolioId = input(0);
  readonly years = input<number[]>([]);
  /** Page year. Create mode starts here. */
  readonly selectedYear = input<number | null>(null);
  readonly objectiveId = input<number | null>(null);
  readonly creating = input(false);
  /** Minted by the page each time a create opens. A late A3 for an older token is ignored. */
  readonly createToken = input(0);
  readonly objectives = input<FrameworkObjective[]>([]);
  readonly framework = input<FrameworkView | null>(null);

  readonly saved = output<number>();
  readonly cancelled = output<'edit' | 'create'>();
  readonly deleteRequested = output<void>();
  readonly dirty = output<boolean>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly objective = computed(() => {
    if (this.creating()) return null;
    const id = this.objectiveId();
    if (id === null) return null;
    return this.objectives().find(item => item.id === id) ?? null;
  });

  readonly groups = computed(() => indicatorGroups(this.framework()));
  readonly yearOptions = computed(() => this.years().map(year => ({ year, label: String(year) })));
  readonly eyebrow = computed(() => 'INSTITUTIONAL OBJECTIVE');

  readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(CODE_MAX)]),
    year: this.formBuilder.control<number | null>(null, Validators.required),
    statement: this.formBuilder.nonNullable.control('', Validators.required),
    elementIds: this.formBuilder.nonNullable.control<number[]>([])
  });

  private readonly formTick = signal(0);
  private readonly opened = signal<OpenedValues | null>(null);

  readonly headerTitle = computed(() => {
    this.formTick();
    if (this.creating() || !this.objective()) return 'New institutional objective';
    const code = this.form.controls.code.value.trim() || this.objective()?.code || '';
    const year = this.form.controls.year.value ?? this.objective()?.year ?? '';
    return `${code} · ${year}`;
  });

  private readonly codeField = viewChild<ElementRef<HTMLInputElement>>('codeField');
  private generation = 0;
  private preparedKey = '';
  private saveInFlight = false;
  /** The id just saved. The list catching up must not reload the form over a newer keystroke. */
  private holdFormFor: number | null = null;
  /** Last code written by A3, so a typed code is not replaced when the year changes. */
  private proposed: string | null = null;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.formTick.update(value => value + 1));
    effect(() => {
      const isDirty = this.dirtyNow();
      untracked(() => this.dirty.emit(isDirty));
    });
    effect(() => {
      const portfolioId = this.portfolioId();
      const objectiveId = this.objectiveId();
      const creating = this.creating();
      const token = this.createToken();
      const objectives = this.objectives();
      untracked(() => {
        if (portfolioId === 0) return;
        if (!creating && objectiveId === null) return;
        // Save re-baselines from the values it sent. A refresh must not re-open the form,
        // or keystrokes typed while the request was in flight would be discarded.
        const key = `${portfolioId}:${creating ? 'new' : objectiveId}:${token}`;
        if (key === this.preparedKey) return;
        this.preparedKey = key;
        void this.prepare(creating, objectiveId, portfolioId, token, objectives);
      });
    });
  }

  /** The baseline becomes what was sent, with the server's code when it normalised one. */
  private adoptSaved(snapshot: OpenedValues, savedCode: string): void {
    const baseline: OpenedValues = { ...snapshot, code: savedCode };
    if (this.form.controls.code.value === snapshot.code && savedCode !== snapshot.code) {
      this.form.controls.code.setValue(savedCode);
    }
    this.opened.set(baseline);
  }

  isDirty(): boolean {
    return this.dirtyNow();
  }

  cancel(): void {
    if (!this.creating() && this.objectiveId() !== null) {
      this.restoreOpened();
      this.cancelled.emit('edit');
      return;
    }
    this.generation += 1;
    this.cancelled.emit('create');
  }

  async onYearPicked(year: number | null): Promise<void> {
    if (!this.creating() || year === null) return;
    await this.proposeCode(year, this.generation, this.portfolioId(), this.createToken(), this.objectiveId());
  }

  async save(): Promise<void> {
    if (this.saveInFlight) return;
    this.formError.set(null);
    this.form.markAllAsTouched();
    const year = this.form.controls.year.value;
    const statement = this.form.controls.statement.value.trim();
    const code = this.form.controls.code.value.trim();
    if (this.form.invalid || year === null || statement === '' || code === '') return;

    const snapshot = this.readForm();
    this.saveInFlight = true;
    this.saving.set(true);
    const generation = this.generation;
    const objectiveId = this.objectiveId();
    const token = this.createToken();
    const creating = this.creating();
    const elementIds = [...this.form.controls.elementIds.value];
    try {
      const response =
        !creating && objectiveId !== null
          ? await this.api.PATCH_StrategyFrameworkObjective(objectiveId, { year, code, statement, elementIds })
          : await this.api.POST_StrategyFrameworkObjective(this.createBody(year, code, statement, elementIds));
      if (!this.accept(generation, objectiveId, token, creating)) return;
      if (!response?.successfulRequest || !response.data) {
        if (response?.status !== 401) this.formError.set(frameworkErrorOf(response?.errorDetail));
        return;
      }
      const savedCode = response.data.code || code;
      this.adoptSaved(snapshot, savedCode);
      this.holdFormFor = response.data.id;
      this.actions.showToast({ severity: 'success', summary: 'Saved', detail: `${savedCode} saved` });
      this.saved.emit(response.data.id);
    } catch (error) {
      if (!this.accept(generation, objectiveId, token, creating)) return;
      this.formError.set(frameworkErrorOf(error));
    } finally {
      this.saveInFlight = false;
      this.saving.set(false);
    }
  }

  /** The page runs the existing confirm. A blocked objective still asks; the reason is the tooltip. */
  remove(): void {
    if (this.saving() || this.objectiveId() === null || this.creating()) return;
    this.deleteRequested.emit();
  }

  blockerText(current: FrameworkObjective): string {
    return current.blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .map(text => text.trim())
      .filter(text => text !== '')
      .join(' ');
  }

  private dirtyNow(): boolean {
    this.formTick();
    const opened = this.opened();
    if (!opened) return false;
    return !sameOpened(opened, this.readForm());
  }

  private readForm(): OpenedValues {
    return {
      code: this.form.controls.code.value,
      year: this.form.controls.year.value,
      statement: this.form.controls.statement.value,
      elementIds: [...this.form.controls.elementIds.value].sort((left, right) => left - right).join(',')
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
      year: opened.year,
      statement: opened.statement,
      elementIds: opened.elementIds === '' ? [] : opened.elementIds.split(',').map(Number)
    });
    this.formError.set(null);
  }

  /**
   * True only for the open target that started this request.
   * A later selection or create token makes the response stale.
   */
  private accept(generation: number, objectiveId: number | null, token: number, creating: boolean): boolean {
    return generation === this.generation && this.objectiveId() === objectiveId && this.createToken() === token && this.creating() === creating;
  }

  private async prepare(
    creating: boolean,
    objectiveId: number | null,
    portfolioId: number,
    token: number,
    objectives: readonly FrameworkObjective[]
  ): Promise<void> {
    if (!creating && this.holdFormFor === objectiveId) {
      this.holdFormFor = null;
      return;
    }
    this.holdFormFor = null;
    const generation = ++this.generation;
    this.formError.set(null);
    this.saving.set(false);
    this.saveInFlight = false;
    this.proposed = null;
    if (!creating && objectiveId !== null) {
      const existing = objectives.find(item => item.id === objectiveId);
      // The id was just saved and the list has not caught up. Leave the typed form.
      if (!existing) return;
      this.form.reset({
        code: existing.code,
        year: existing.year,
        statement: existing.statement,
        elementIds: existing.elements.map(element => element.id)
      });
      this.captureOpened();
      return;
    }
    if (!creating) return;
    const year = this.selectedYear() ?? this.years()[0] ?? null;
    this.form.reset({ code: '', year, statement: '', elementIds: [] });
    this.captureOpened();
    this.focusFirstField(generation);
    if (year === null) return;
    await this.proposeCode(year, generation, portfolioId, token, objectiveId);
  }

  private async proposeCode(year: number, generation: number, portfolioId: number, token: number, objectiveId: number | null): Promise<void> {
    try {
      const response = await this.api.GET_StrategyFrameworkCodeProposal({ portfolioId, year, kind: 'IOB' });
      if (!this.accept(generation, objectiveId, token, true) || !this.creating()) return;
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

  private createBody(year: number, code: string, statement: string, elementIds: number[]): CreateInstitutionalObjectivePayload {
    return { portfolioId: this.portfolioId(), year, code, statement, elementIds };
  }

  /** Create mode only. Selecting a row leaves focus on that row (NFR-STF-004). */
  private focusFirstField(generation: number): void {
    setTimeout(() => {
      if (generation !== this.generation || !this.creating()) return;
      const field = this.codeField()?.nativeElement;
      if (field?.isConnected) field.focus();
    }, 0);
  }
}

function sameOpened(left: OpenedValues, right: OpenedValues): boolean {
  return left.code === right.code && left.year === right.year && left.statement === right.statement && left.elementIds === right.elementIds;
}
