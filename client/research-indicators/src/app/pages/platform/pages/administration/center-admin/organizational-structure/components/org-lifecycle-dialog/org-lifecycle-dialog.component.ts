import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { OrgDeleteResult, OrgLifecycleAction, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { defaultLifecycleYear, deleteMode, lifecycleYears, serverMessage, successorOptions } from '../../utils/org-lifecycle.util';

/** What the panel hands back to the page after a successful action. */
export interface OrgLifecycleDone {
  action: OrgLifecycleAction;
  id: number;
  /** Delete only: what the server did. A physical delete clears the selection. */
  mode?: 'physical' | 'logical';
}

const TITLES: Record<OrgLifecycleAction, string> = { inactivate: 'Inactivate entry', reactivate: 'Reactivate entry', delete: 'Delete entry' };
const CONFIRM: Record<OrgLifecycleAction, string> = { inactivate: 'Inactivate', reactivate: 'Reactivate', delete: 'Delete' };

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §2.1, §4
// B11/B12/B13, §5.4, §5.5, §6.2 dialog row; requirements R-ORG-005, 007, 008, 013, NFR-ORG-005. Content
// of the `orgUnitLifecycle` modal. The panel creates it per action: it opens the modal on init and
// closes it on destroy, so every opening starts from a clean state. Focus is trapped by `app-modal`.
@Component({
  selector: 'app-org-lifecycle-dialog',
  standalone: true,
  imports: [FormsModule, ButtonModule, SelectModule, ModalComponent],
  templateUrl: './org-lifecycle-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgLifecycleDialogComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly modals = inject(AllModalsService);
  private readonly injector = inject(Injector);

  /** The dialog container (`tabindex="-1"`): holds focus while a request is in flight. */
  @ViewChild('dialogRoot') private dialogRoot?: ElementRef<HTMLElement>;

  @Input({ required: true }) action: OrgLifecycleAction = 'inactivate';
  @Input({ required: true }) row!: OrgYearViewRow;
  @Input({ required: true }) range: OrgYearRange = { min: 0, max: 0, current: 0 };
  @Output() done = new EventEmitter<OrgLifecycleDone>();
  @Output() closed = new EventEmitter<void>();

  readonly fromYear = signal(0);
  readonly backdate = signal(false);
  readonly successorId = signal<number | null>(null);
  readonly candidates = signal<OrgYearViewRow[]>([]);
  /** Start year of the entry's first version (B6); decides physical vs logical delete (§5.5). */
  readonly firstFrom = signal<number | null>(null);
  readonly modeLoading = signal(false);
  readonly submitting = signal(false);
  /** A 409 from the server: its description replaces the form and leaves a single *Close* (R-ORG-013). */
  readonly blocked = signal<string | null>(null);
  /** Any other rejection (400 successor / back-date): shown inline, the form stays usable. */
  readonly error = signal<string | null>(null);

  private candidateToken = 0;

  readonly mode = computed(() => (this.action === 'delete' ? deleteMode(this.firstFrom(), this.range.current) : null));
  /** A physical delete ignores the year and needs no back-date (design §4 B13). */
  /**
   * An already-inactive entry keeps its end year when deleted (design §5.5): the server ignores
   * *From year* and back-date, so the dialog does not offer them.
   */
  readonly keepsEndYear = computed(() => this.action === 'delete' && this.row.status === 'inactive');
  readonly showYear = computed(() => this.mode() !== 'physical' && !this.keepsEndYear());
  readonly yearOptions = computed(() => lifecycleYears(this.action, this.range, this.backdate(), this.row));
  readonly successorChoices = computed(() => successorOptions(this.candidates(), this.row, this.fromYear()));
  readonly showBackdateWarning = computed(() => this.showYear() && this.backdate() && this.fromYear() < this.range.current);
  readonly canConfirm = computed(() => !this.submitting() && !this.modeLoading());

  ngOnInit(): void {
    this.fromYear.set(defaultLifecycleYear(this.action, this.range.current, this.row));
    this.modals.modalConfig.update(modals => ({ ...modals, orgUnitLifecycle: { ...modals.orgUnitLifecycle, title: TITLES[this.action] } }));
    this.modals.openModal('orgUnitLifecycle');
    if (this.action === 'inactivate') void this.loadCandidates();
    if (this.action === 'delete') void this.loadFirstVersion();
  }

  ngOnDestroy(): void {
    this.modals.closeModal('orgUnitLifecycle', { instant: true });
  }

  title(): string {
    return TITLES[this.action];
  }

  confirmLabel(): string {
    return CONFIRM[this.action];
  }

  // The modal's own close icon calls this after toggling the modal.
  readonly clearModal = (): void => {
    this.closed.emit();
  };

  close(): void {
    this.modals.closeModal('orgUnitLifecycle');
    this.closed.emit();
  }

  onYearChange(year: number): void {
    this.fromYear.set(year);
    // The options follow the year: a successor must be active in *From year* (R-ORG-007 AC.3).
    if (this.action === 'inactivate') {
      this.successorId.set(null);
      void this.loadCandidates();
    }
  }

  onBackdateChange(checked: boolean): void {
    this.backdate.set(checked);
    if (!checked && this.fromYear() < this.range.current) this.onYearChange(defaultLifecycleYear(this.action, this.range.current, this.row));
  }

  private async loadCandidates(): Promise<void> {
    const token = ++this.candidateToken;
    try {
      const response = await this.api.GET_OrgStructureUnits(this.fromYear(), false);
      if (token !== this.candidateToken) return;
      this.candidates.set(response?.successfulRequest === false ? [] : (response?.data ?? []));
    } catch {
      if (token === this.candidateToken) this.candidates.set([]);
    }
  }

  private async loadFirstVersion(): Promise<void> {
    this.modeLoading.set(true);
    try {
      const response = await this.api.GET_OrgStructureHistory(this.row.id);
      const versions = response?.successfulRequest === false ? [] : (response?.data?.versions ?? []);
      this.firstFrom.set(versions.length > 0 ? Math.min(...versions.map(v => v.from)) : null);
    } catch {
      this.firstFrom.set(null);
    } finally {
      this.modeLoading.set(false);
    }
  }

  async confirm(): Promise<void> {
    if (!this.canConfirm()) return;
    // The Confirm button is about to be disabled and browsers drop focus from a disabled element, which would
    // leave the modal's keydown trap (on its container) deaf to the next Tab. Park focus on the container.
    this.dialogRoot?.nativeElement.focus();
    this.submitting.set(true);
    this.error.set(null);
    const id = this.row.id;
    const fromYear = this.fromYear();
    const backdate = this.showYear() && this.backdate() && fromYear < this.range.current;
    try {
      const response = await this.send(id, fromYear, backdate);
      if (response?.successfulRequest === false) {
        const message = serverMessage(response, 'We could not complete the action. Please try again.');
        if (response.status === 409) {
          this.blocked.set(message);
          this.focusWhenRendered('lifecycle-close');
        } else {
          this.error.set(message);
          this.focusWhenRendered('lifecycle-confirm');
        }
        return;
      }
      const served = response?.data as Partial<OrgDeleteResult> | undefined;
      const mode = this.action === 'delete' ? (served?.mode ?? this.mode() ?? 'logical') : undefined;
      // The year the SERVER applied wins; an inactive entry keeps its own end year (§5.5).
      const appliedYear = served?.fromYear ?? (this.keepsEndYear() ? (this.row.statusFromYear ?? fromYear) : fromYear);
      this.actions.showToast({ severity: 'success', summary: 'Organizational Structure', detail: this.successText(appliedYear, mode) });
      this.done.emit({ action: this.action, id, mode });
    } catch {
      this.error.set('We could not complete the action. Please try again.');
      this.focusWhenRendered('lifecycle-confirm');
    } finally {
      this.submitting.set(false);
    }
  }

  // After the next render: Confirm is re-enabled (after an error) and Close exists (after a 409) only then.
  private focusWhenRendered(testId: string): void {
    afterNextRender(() => (this.dialogRoot?.nativeElement.querySelector(`[data-testid="${testId}"] button`) as HTMLElement | null)?.focus(), {
      injector: this.injector
    });
  }

  private send(id: number, fromYear: number, backdate: boolean): Promise<MainResponse<unknown>> {
    if (this.action === 'delete')
      return this.api.DELETE_OrgStructureUnit(id, this.mode() === 'physical' || this.keepsEndYear() ? null : fromYear, backdate);
    const body = { fromYear, ...(backdate ? { backdate: true } : {}) };
    if (this.action === 'reactivate') return this.api.POST_OrgStructureReactivate(id, body);
    const successorId = this.successorId();
    return this.api.POST_OrgStructureInactivate(id, successorId === null ? body : { ...body, successorId });
  }

  private successText(fromYear: number, mode: 'physical' | 'logical' | undefined): string {
    if (this.action === 'inactivate') return `Entry inactivated from ${fromYear}`;
    if (this.action === 'reactivate') return `Entry reactivated from ${fromYear}`;
    return mode === 'physical' ? 'Entry deleted' : `Entry deleted from ${fromYear}`;
  }
}
