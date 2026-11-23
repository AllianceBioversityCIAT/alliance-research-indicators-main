import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { FocusTrapModule } from 'primeng/focustrap';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { FrameworkObjective, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';
import { OverlayEscapeGuardDirective } from '../../../overlay-escape-guard.directive';
import { PanelHeadingComponent } from '../../../panel-heading/panel-heading.component';
import { frameworkErrorOf } from '../../../framework/utils/framework-error.util';
import { indicatorGroups } from '../../objective-view.util';

const CODE_MAX = 30;

// @akili-spec institutional-performance/strategy-framework T-16 — design §6.6, §6.5, P-33, D-STF-26.
// Side form. No owner and no responsible (R-STF-009 AC.2). pFocusTrap on the content;
// the page returns focus to the opener. 4xx except 401 stays inline (frameworkErrorOf).
@Component({
  selector: 'app-objective-panel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DrawerModule,
    SelectModule,
    MultiSelectModule,
    FocusTrapModule,
    TooltipModule,
    OverlayEscapeGuardDirective,
    PanelHeadingComponent
  ],
  templateUrl: './objective-panel.component.html',
  styleUrl: './objective-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObjectivePanelComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly portfolioId = input(0);
  /** Every year of the portfolio range. The form's Year select. */
  readonly years = input<number[]>([]);
  /** Page year, used as the create default. */
  readonly selectedYear = input<number | null>(null);
  readonly objective = input<FrameworkObjective | null>(null);
  readonly framework = input<FrameworkView | null>(null);

  readonly closed = output<void>();
  readonly saved = output<void>();
  /** The page runs the same confirm and delete the row uses. */
  readonly deleteRequested = output<Event>();

  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  /** 420px, or the full drawer width under 1024px (design §6.6). jsdom does not apply this. */
  private readonly narrow = signal(false);

  readonly groups = computed(() => indicatorGroups(this.framework()));
  readonly yearOptions = computed(() => this.years().map(year => ({ year, label: String(year) })));
  readonly drawerStyle = computed(() => ({ width: this.narrow() ? '100%' : '420px' }));
  readonly eyebrow = computed(() => 'INSTITUTIONAL OBJECTIVE');

  readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(CODE_MAX)]),
    year: this.formBuilder.control<number | null>(null, Validators.required),
    statement: this.formBuilder.nonNullable.control('', Validators.required),
    elementIds: this.formBuilder.nonNullable.control<number[]>([])
  });

  private readonly codeValue = toSignal(this.form.controls.code.valueChanges, { initialValue: this.form.controls.code.value });
  private readonly yearValue = toSignal(this.form.controls.year.valueChanges, { initialValue: this.form.controls.year.value });

  readonly headerTitle = computed(() => {
    if (!this.objective()) return 'New institutional objective';
    const code = (this.codeValue() || this.objective()?.code || '').trim();
    const year = this.yearValue() ?? this.objective()?.year ?? '';
    return `${code} · ${year}`;
  });

  readonly blockerText = computed(() => {
    const objective = this.objective();
    if (!objective || objective.deletable) return '';
    return objective.blockers
      .map(blocker => blocker.wayOut || blocker.reason)
      .map(text => text.trim())
      .filter(text => text !== '')
      .join(' ');
  });

  private readonly codeField = viewChild<ElementRef<HTMLInputElement>>('codeField');
  private session = 0;
  private saveInFlight = false;
  /** Last code written by A3, so a typed code is not replaced when the year changes. */
  private proposed: string | null = null;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const objective = this.objective();
      const portfolioId = this.portfolioId();
      untracked(() => {
        if (!isOpen || portfolioId === 0) return;
        void this.prepare(objective, portfolioId);
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

  requestDelete(event: Event): void {
    if (!this.objective()) return;
    this.deleteRequested.emit(event);
  }

  async save(): Promise<void> {
    if (this.saveInFlight) return;
    this.formError.set(null);
    this.form.markAllAsTouched();
    const year = this.form.controls.year.value;
    const statement = this.form.controls.statement.value.trim();
    const code = this.form.controls.code.value.trim();
    if (this.form.invalid || year === null || statement === '' || code === '') return;

    this.saveInFlight = true;
    this.saving.set(true);
    const flight = this.session;
    try {
      const elementIds = this.form.controls.elementIds.value;
      const objective = this.objective();
      const response = objective
        ? await this.api.PATCH_StrategyFrameworkObjective(objective.id, { year, code, statement, elementIds })
        : await this.api.POST_StrategyFrameworkObjective({
            portfolioId: this.portfolioId(),
            year,
            code,
            statement,
            elementIds
          });
      if (flight !== this.session || !this.open()) return;
      if (!response?.successfulRequest || !response.data) {
        if (response?.status !== 401) this.formError.set(frameworkErrorOf(response?.errorDetail));
        return;
      }
      this.saved.emit();
    } catch (error) {
      if (flight !== this.session || !this.open()) return;
      this.formError.set(frameworkErrorOf(error));
    } finally {
      this.saveInFlight = false;
      this.saving.set(false);
    }
  }

  async onYearPicked(year: number | null): Promise<void> {
    if (this.objective() || year === null) return;
    await this.proposeCode(year, this.session, this.portfolioId());
  }

  private requestClose(): void {
    this.session += 1;
    this.saveInFlight = false;
    this.closed.emit();
  }

  private async prepare(objective: FrameworkObjective | null, portfolioId: number): Promise<void> {
    const session = ++this.session;
    this.formError.set(null);
    this.saving.set(false);
    this.saveInFlight = false;
    this.proposed = null;
    if (objective) {
      this.form.reset({
        code: objective.code,
        year: objective.year,
        statement: objective.statement,
        elementIds: objective.elements.map(element => element.id)
      });
      this.focusCode(session);
      return;
    }
    const year = this.selectedYear() ?? this.years()[0] ?? null;
    this.form.reset({ code: '', year, statement: '', elementIds: [] });
    this.focusCode(session);
    if (year === null) return;
    await this.proposeCode(year, session, portfolioId);
  }

  private async proposeCode(year: number, session: number, portfolioId: number): Promise<void> {
    try {
      const response = await this.api.GET_StrategyFrameworkCodeProposal({ portfolioId, year, kind: 'IOB' });
      if (session !== this.session || !this.open() || this.objective()) return;
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
