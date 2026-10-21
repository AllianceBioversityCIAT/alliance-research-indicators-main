import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoComplete, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { OrgStaffOption, OrgUnitSaved, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import {
  MAX_DELEGATES,
  ORG_LEVEL_CODE_BY_ID,
  ORG_LEVEL_ID_BY_CODE,
  OrgFormState,
  appliesFromYears,
  buildCreatePayload,
  buildUpdatePayload,
  detectChanges,
  parentOptions,
  saveToast
} from '../../utils/org-form.util';

export interface OrgUnitFormPrefill {
  parentId: number | null;
  levelId: number | null;
}

interface LevelOption {
  id: number;
  label: string;
}

// @akili-spec institutional-performance/organizational-structure T-02 (client half) — design §2.1,
// §4 B3/B4/B9/B10, §6.5, D-ORG-8, D-ORG-15; requirements R-ORG-002..005, 013, 016, 017. Details tab of
// the right panel. The page recreates this component per entry (and after each save), so every field
// is initialised once, in `ngOnInit`, from the inputs.
@Component({
  selector: 'app-org-unit-form',
  standalone: true,
  imports: [FormsModule, AutoCompleteModule, ButtonModule, ChipModule, SelectModule, TooltipModule, InputComponent],
  templateUrl: './org-unit-form.component.html',
  styleUrl: './org-unit-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgUnitFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);

  /** The entry being edited (as of the viewed year); `null` creates a new one. */
  @Input() row: OrgYearViewRow | null = null;
  /** B1 rows of the viewed year: the parent candidates. */
  @Input({ required: true }) rows: OrgYearViewRow[] = [];
  @Input({ required: true }) range: OrgYearRange = { min: 0, max: 0, current: 0 };
  @Input() prefill: OrgUnitFormPrefill | null = null;
  @Output() saved = new EventEmitter<number | null>();
  @Output() cancelled = new EventEmitter<void>();

  readonly maxDelegates = MAX_DELEGATES;
  readonly fields = signal({ code: '', name: '', acronym: '' });
  readonly levels = signal<LevelOption[]>([]);
  readonly levelId = signal<number | null>(null);
  readonly parentId = signal<number | null>(null);
  readonly director = signal<OrgStaffOption | null>(null);
  readonly delegates = signal<OrgStaffOption[]>([]);
  readonly appliesFromYear = signal(0);
  readonly backdate = signal(false);
  readonly saving = signal(false);
  readonly directorSuggestions = signal<OrgStaffOption[]>([]);
  readonly delegateSuggestions = signal<OrgStaffOption[]>([]);
  readonly delegateLimitHit = signal(false);

  // Guards a slow search response that a newer keystroke has already superseded.
  private readonly staffToken = { director: 0, delegates: 0 };

  readonly isCreate = computed(() => this.row === null);
  readonly levelCode = computed(() => {
    const id = this.levelId();
    return id === null ? null : (ORG_LEVEL_CODE_BY_ID[id] ?? null);
  });
  readonly showParent = computed(() => this.levelCode() !== null && this.levelCode() !== 'L1');

  readonly state = computed<OrgFormState>(() => ({
    ...this.fields(),
    levelId: this.levelId(),
    parentId: this.parentId(),
    director: this.director(),
    delegates: this.delegates(),
    appliesFromYear: this.appliesFromYear(),
    backdate: this.backdate()
  }));
  readonly changes = computed(() => (this.row ? detectChanges(this.state(), this.row) : { code: false, versioned: true, delegates: false }));
  /** *Applies from year* shows once a versioned field changed; a code-only or delegates-only edit hides it (R-ORG-013). */
  readonly showAppliesFrom = computed(() => this.isCreate() || this.changes().versioned);
  readonly yearOptions = computed(() => appliesFromYears(this.range.min, this.range.max, this.range.current, this.backdate()));
  readonly parentChoices = computed(() => parentOptions(this.rows, this.levelId(), this.appliesFromYear(), this.row?.id ?? null));
  readonly showBackdateWarning = computed(() => this.backdate() && this.appliesFromYear() < this.range.current);

  readonly canSave = computed(() => {
    const s = this.state();
    if (this.saving() || !s.name.trim() || s.levelId === null || (this.showParent() && s.parentId === null)) return false;
    if (this.isCreate()) return true;
    const c = this.changes();
    return c.code || c.versioned || c.delegates;
  });

  async ngOnInit(): Promise<void> {
    const row = this.row;
    this.appliesFromYear.set(this.range.current);
    if (row) {
      const v = row.version;
      this.fields.set({ code: row.code, name: v.name, acronym: v.acronym ?? '' });
      this.levelId.set(v.levelId);
      this.parentId.set(v.parentId);
      this.director.set(v.director ? { ...v.director, name: v.director.name ?? v.director.carnet } : null);
      this.delegates.set(row.delegates.map(d => ({ ...d, name: d.name ?? d.carnet })));
    } else {
      // Empty module: nothing can be a parent yet, so the first entry is a Division (R-ORG-013).
      this.levelId.set(this.prefill?.levelId ?? (this.rows.length === 0 ? ORG_LEVEL_ID_BY_CODE.L1 : null));
      this.parentId.set(this.prefill?.parentId ?? null);
      void this.loadCodeProposal();
    }
    await this.loadLevels();
  }

  private async loadCodeProposal(): Promise<void> {
    try {
      const response = await this.api.GET_OrgStructureCodeProposal();
      if (response?.successfulRequest !== false && response?.data?.code && !this.fields().code) {
        this.fields.update(f => ({ ...f, code: response.data.code }));
      }
    } catch {
      // The code is optional on create: the server proposes one when it is left blank (design §4 B9).
    }
  }

  private async loadLevels(): Promise<void> {
    try {
      const response = await this.api.GET_ControlListValuesByKey('org.level', true);
      if (response?.successfulRequest === false) return;
      this.levels.set(
        (response?.data ?? [])
          .filter(value => ORG_LEVEL_CODE_BY_ID[value.id])
          .map(value => ({ id: value.id, label: `${ORG_LEVEL_CODE_BY_ID[value.id]} ${value.value}` }))
          .sort((a, b) => a.id - b.id)
      );
    } catch {
      this.levels.set([]);
    }
  }

  onLevelChange(levelId: number): void {
    this.levelId.set(levelId);
    this.dropInvalidParent();
  }

  onAppliesFromChange(year: number): void {
    this.appliesFromYear.set(year);
    this.dropInvalidParent();
  }

  // A parent the new level or year cannot use is dropped (R-ORG-003): the admin must pick again.
  private dropInvalidParent(): void {
    if (!this.parentChoices().some(option => option.id === this.parentId())) this.parentId.set(null);
  }

  onBackdateChange(checked: boolean): void {
    this.backdate.set(checked);
    if (!checked && this.appliesFromYear() < this.range.current) this.onAppliesFromChange(this.range.current);
  }

  async searchDirector(query: string): Promise<void> {
    const token = ++this.staffToken.director;
    const found = await this.search(query);
    if (token === this.staffToken.director) this.directorSuggestions.set(found);
  }

  async searchDelegates(query: string): Promise<void> {
    const token = ++this.staffToken.delegates;
    const found = await this.search(query);
    if (token !== this.staffToken.delegates) return;
    // The director cannot also be a delegate, and a chosen delegate is not offered twice (R-ORG-017).
    const taken = new Set([this.director()?.carnet, ...this.delegates().map(d => d.carnet)]);
    this.delegateSuggestions.set(found.filter(person => !taken.has(person.carnet)));
  }

  private async search(query: string): Promise<OrgStaffOption[]> {
    if (query.trim().length < 2) return [];
    try {
      const response = await this.api.GET_OrgStaff(query.trim());
      // B4 returns active staff only (P-14); a row flagged inactive is never offered either way.
      return response?.successfulRequest === false ? [] : (response?.data ?? []).filter(person => person.isActiveStaff !== false);
    } catch {
      return [];
    }
  }

  onDirectorChange(value: OrgStaffOption | string | null): void {
    // Typing free text without picking leaves the field as a string; only a picked person is a director.
    this.director.set(value && typeof value === 'object' ? value : null);
  }

  // D-ORG-22: the search is single-value; a pick is added to the chips below and the field clears itself.
  addDelegate(person: OrgStaffOption, search: AutoComplete): void {
    search.clear();
    this.delegateSuggestions.set([]);
    if (this.delegates().some(d => d.carnet === person.carnet)) return;
    // The 21st pick is refused with the limit message (R-ORG-017).
    if (this.delegates().length >= MAX_DELEGATES) {
      this.delegateLimitHit.set(true);
      return;
    }
    this.delegateLimitHit.set(false);
    this.delegates.update(list => [...list, person]);
  }

  removeDelegate(carnet: string): void {
    this.delegateLimitHit.set(false);
    this.delegates.update(list => list.filter(d => d.carnet !== carnet));
  }

  /** Accessible name of a chip: "name, email[, inactive staff]". */
  chipName(person: OrgStaffOption): string {
    return [person.name, person.email, person.isActiveStaff === false ? 'inactive staff' : null].filter(Boolean).join(', ');
  }

  cancel(): void {
    this.cancelled.emit();
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    const state = this.state();
    const row = this.row;
    const current = this.range.current;
    try {
      const response: MainResponse<OrgUnitSaved> = row
        ? await this.api.PATCH_OrgStructureUnit(row.id, buildUpdatePayload(state, row, this.changes(), current))
        : await this.api.POST_OrgStructureUnit(buildCreatePayload(state, current));
      if (response?.successfulRequest === false) {
        this.actions.showToast({ severity: 'error', summary: 'Error', detail: this.errorMessage(response) });
        return;
      }
      const toast = saveToast(response?.data?.outcome);
      this.actions.showToast({ severity: toast.severity, summary: 'Organizational Structure', detail: toast.detail });
      this.saved.emit(response?.data?.id ?? row?.id ?? null);
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not save the entry. Please try again.' });
    } finally {
      this.saving.set(false);
    }
  }

  // Shows the server's own message (it names the field: parent, level, director, delegates, code...).
  // Never reads `errorDetail.description` (the exception class name).
  private errorMessage(response: MainResponse<unknown>): string {
    const errors = response?.errorDetail?.errors as unknown;
    if (typeof errors === 'string' && errors.trim()) return errors.trim();
    if (Array.isArray(errors) && errors.length > 0) return errors.map(e => (typeof e === 'string' ? e : JSON.stringify(e))).join(' ');
    if (errors && typeof errors === 'object') {
      const message = (errors as { description?: unknown }).description;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
    return 'We could not save the entry. Please try again.';
  }
}
