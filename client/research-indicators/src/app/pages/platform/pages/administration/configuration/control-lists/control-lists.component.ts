import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';
import { DataTableColumn, DataTableComponent } from '@shared/components/data-table/data-table.component';
import {
  ControlList,
  ControlListCategory,
  ControlListSummary,
  ControlListValue
} from '@shared/interfaces/control-lists.interface';
import { Portfolio } from '@shared/interfaces/portfolio.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ActionsService } from '@shared/services/actions.service';

interface CategoryFormValue {
  name: string;
  description: string;
}

/** design §6.2 Modal row, list mode. `listKey` and `codePrefix` are both disabled (not removed)
 * in edit mode — `codePrefix` pre-filled from the list's real prefix so the admin can see it —
 * and neither value held here is ever sent on PATCH (design §5 rule 3) — see `saveList()`. */
interface ListFormValue {
  listKey: string;
  name: string;
  description: string;
  codePrefix: string;
}

/** The modal's current record type (design §6.2: "One modal with three modes: category / list /
 * value"). T-02 added `list`; T-03 adds `value`. */
type ControlListModalMode = 'category' | 'list' | 'value';

/** design §6.2 Modal row, value mode. `id` is NEVER part of this (D-CTL-14 / falsifier 2/3) —
 * the permanent ID is tracked separately (`editingValueId`) and rendered as read-only text, with
 * no form control bound to it. */
interface ValueFormValue {
  code: string;
  value: string;
  description: string;
  // `number | null`: `<app-input type="number">` (`p-inputNumber`) emits `null` when the field is
  // cleared (reviewer finding, T-03 rework) — a plain `number` here would hide that at the type
  // level while still letting it happen at runtime. `saveValue()` normalises it before sending.
  displayOrder: number | null;
  isActive: boolean;
  /** R-CLG-009 Applies to: the ticked portfolio ids; `[]` (none ticked) = all portfolios. */
  portfolioIds: number[];
}

/** A values-table row: the A9 value plus the text of its Applies to column (also what the export writes). */
interface ControlListValueRow extends ControlListValue {
  appliesToLabel: string;
}

/** One entry of the *Show values for* filter. `0` is the *All portfolios* sentinel (no real portfolio has id 0). */
interface PortfolioFilterOption {
  label: string;
  value: number;
}

const ALL_PORTFOLIOS_FILTER = 0;
const PORTFOLIOS_UNAVAILABLE_NOTE =
  'Portfolios could not be loaded, so Applies to cannot be edited and values cannot be filtered by portfolio. Reload the page to try again.';

/**
 * A resolved client-side error: `message` is always display-safe text (never the exception
 * class name); `field` is present only for a field-named 409/400 (design §6.2 Modal row).
 */
interface ControlListFieldError {
  message: string;
  field?: string;
}

// @akili-spec institutional-performance/control-lists T-01 (client half)
// design §2.1, §4 (A1–A5), §6.1/§6.2; requirements R-CTL-001, R-CTL-002, R-CTL-007, R-CTL-008.
// @akili-spec changes/control-lists-global-scope T-01 (client half): lists are global and read by
// key — no selector, no list-level scope on any payload (design §2.1, §6; R-CLG-001, 005).
// @akili-spec changes/control-lists-global-scope T-02 (client half): values can be restricted to
// portfolios — Applies to column + filter + modal checkbox group (design §4 A9–A11, A13, §6; R-CLG-009).
// Scope: header + category navigator + category-mode modal + delete confirm.
@Component({
  selector: 'app-control-lists',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToggleSwitchModule,
    SelectModule,
    ModalComponent,
    InputComponent,
    TextareaComponent,
    CustomProgressBarComponent,
    DataTableComponent
  ],
  templateUrl: './control-lists.component.html',
  styleUrl: './control-lists.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ControlListsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly modals = inject(AllModalsService);
  private readonly actions = inject(ActionsService);

  readonly categories = signal<ControlListCategory[]>([]);

  // R-CLG-009 / design §6 Load: the ACTIVE portfolios, loaded with A1 and used only for Applies to
  // (the column labels, the filter, the modal checkboxes). A failure degrades those three, never the page (S-4).
  readonly portfolios = signal<Portfolio[]>([]);
  readonly portfoliosLoadFailed = signal(false);
  readonly portfoliosUnavailableNote = PORTFOLIOS_UNAVAILABLE_NOTE;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly editingCategoryId = signal<number | null>(null);
  readonly form = signal<CategoryFormValue>({ name: '', description: '' });
  // Design §6.2 Modal row: a field-named 409/400 on `name` is shown inline under the input,
  // never as a toast (reviewer finding 1). `null` = no inline error to show.
  readonly nameFieldError = signal<string | null>(null);

  readonly isEditing = computed(() => this.editingCategoryId() !== null);
  readonly modalTitle = computed(() => (this.isEditing() ? 'Edit category' : 'New category'));
  readonly formInvalid = computed(() => !this.form().name.trim());
  readonly hasCategories = computed(() => this.categories().length > 0);

  // ─── T-02: lists (design §4 A6–A8, §6.2 navigator + list header) ──────────────
  readonly modalMode = signal<ControlListModalMode>('category');
  readonly selectedListId = signal<number | null>(null);
  readonly savingList = signal(false);
  readonly deletingListId = signal<number | null>(null);
  readonly editingListId = signal<number | null>(null);
  // Context for a create: which category the new list belongs to (not an editable field —
  // it comes from the "add list" icon the admin clicked, design §6.2 navigator row).
  private readonly createListCategoryId = signal<number | null>(null);
  readonly listForm = signal<ListFormValue>({ listKey: '', name: '', description: '', codePrefix: '' });
  // Design §6.2 Modal row: the field-named 409 for a duplicate key (unique module-wide, R-CLG-003)
  // (`field: 'listKey'`, pinned by the Leader's error contract) is shown inline under the key input.
  readonly listKeyFieldError = signal<string | null>(null);

  readonly isEditingList = computed(() => this.editingListId() !== null);
  readonly listModalTitle = computed(() => (this.isEditingList() ? 'Edit list' : 'New list'));
  // §5 rule 3: listKey is required and immutable on create; create-only (ignored — disabled —
  // once editing, since the field itself cannot change after creation).
  readonly listFormInvalid = computed(() => {
    const value = this.listForm();
    if (!value.name.trim()) return true;
    if (!this.isEditingList() && !/^[a-z0-9_.]{2,100}$/.test(value.listKey.trim())) return true;
    return false;
  });

  // The category that contains the selected list, and the list itself (design §6.2 list header).
  readonly selectedCategory = computed<ControlListCategory | undefined>(() => {
    const listId = this.selectedListId();
    if (listId === null) return undefined;
    return this.categories().find(category => category.lists.some(list => list.id === listId));
  });
  readonly selectedList = computed<ControlListSummary | undefined>(() => {
    const listId = this.selectedListId();
    if (listId === null) return undefined;
    for (const category of this.categories()) {
      const found = category.lists.find(list => list.id === listId);
      if (found) return found;
    }
    return undefined;
  });

  // T-04 (design §4 A1 "usedBy: string[]", §5 rule 5, R-CTL-003 "Used by"): consumer names
  // joined, or the fallback copy when no consumer has registered against this list's key yet.
  readonly usedByLabel = computed(() => {
    const usedBy = this.selectedList()?.usedBy ?? [];
    return usedBy.length > 0 ? usedBy.join(', ') : 'Not linked to a form yet';
  });

  // ─── T-03: values (design §4 A9–A12, §6.2 values table + modal, §6.3 DataTable) ───────────
  readonly values = signal<ControlListValue[]>([]);
  readonly valuesLoading = signal(false);
  readonly valuesLoadError = signal(false);
  readonly savingValue = signal(false);
  readonly deletingValueId = signal<number | null>(null);
  readonly editingValueId = signal<number | null>(null);
  readonly valueForm = signal<ValueFormValue>({ code: '', value: '', description: '', displayOrder: 0, isActive: true, portfolioIds: [] });
  // True while editing a value that is linked ONLY to inactive portfolios (`appliesToAll = false`,
  // `appliesTo = []`, D-CLG-14). Such a value shows no ticks, and sending `portfolioIds: []` for it
  // would turn it into "all" without the admin asking — so an untouched empty selection is omitted.
  private readonly editingNoActivePortfolio = signal(false);
  // `0` = All portfolios (see PortfolioFilterOption). Reset whenever another list is selected.
  readonly pfFilter = signal<number>(ALL_PORTFOLIOS_FILTER);
  // Design §6.2 Modal row: a field-named 409 on 'code' or 'value' (duplicate, R-CTL-004) is
  // shown inline under its own input — two separate signals because both fields can conflict
  // independently.
  readonly valueCodeFieldError = signal<string | null>(null);
  readonly valueValueFieldError = signal<string | null>(null);

  readonly isEditingValue = computed(() => this.editingValueId() !== null);
  readonly valueModalTitle = computed(() => (this.isEditingValue() ? 'Edit value' : 'New value'));
  readonly valueFormInvalid = computed(() => {
    const form = this.valueForm();
    if (!form.value.trim()) return true;
    // Code is optional on CREATE (design §5 rule 4 — the server proposes one when blank), but
    // once a value is established its code must not be saved blank.
    if (this.isEditingValue() && !form.code.trim()) return true;
    return false;
  });

  // design §6.3 DataTable column config — "ID" plain text (read-only, D-CTL-14), Code, Value,
  // Description, Order, In use, Active, Actions. "In use" (T-04, design §6.2 values table: "ID ·
  // Code · Value · Description · Order · In use · Active · Actions") sits between Order and
  // Active, sourced from A9's required `inUse` (design §4 A9, §5 rule 5).
  readonly valueColumns: DataTableColumn<ControlListValueRow>[] = [
    { field: 'id', header: 'ID', type: 'text', sortable: false },
    { field: 'code', header: 'Code', type: 'code', sortable: true },
    { field: 'value', header: 'Value', type: 'text', sortable: true },
    { field: 'description', header: 'Description', type: 'text', sortable: false },
    { field: 'displayOrder', header: 'Order', type: 'number', sortable: true },
    { field: 'appliesToLabel', header: 'Applies to', type: 'text', sortable: true },
    { field: 'inUse', header: 'In use', type: 'number', sortable: false },
    { field: 'isActive', header: 'Active', type: 'badge', sortable: false }
  ];
  readonly valueSearchFields: (keyof ControlListValueRow & string)[] = ['code', 'value', 'description'];

  readonly portfolioFilterOptions = computed<PortfolioFilterOption[]>(() => [
    { label: 'All portfolios', value: ALL_PORTFOLIOS_FILTER },
    ...this.portfolios().map(portfolio => ({ label: portfolio.name, value: this.portfolioId(portfolio) }))
  ]);

  // The A13 rule, applied client-side to the loaded values (design §6 / R-CLG-009): no filter → every
  // value; portfolio P → values with no restriction (`appliesToAll`) + values whose `appliesTo`
  // includes P. A value linked only to inactive portfolios (`appliesToAll = false`, `appliesTo = []`)
  // matches no P, so it is never shown for any portfolio — and is NOT treated as "all".
  readonly visibleValues = computed<ControlListValue[]>(() => {
    const portfolioFilter = this.pfFilter();
    const values = this.values();
    if (portfolioFilter === ALL_PORTFOLIOS_FILTER) return values;
    return values.filter(value => value.appliesToAll || value.appliesTo.includes(portfolioFilter));
  });

  readonly valueRows = computed<ControlListValueRow[]>(() =>
    this.visibleValues().map(value => ({ ...value, appliesToLabel: this.appliesToLabel(value) }))
  );

  // design §6.3 "Export … with the list name in the file name".
  readonly valuesExportFileName = computed(() => {
    const list = this.selectedList();
    const slug =
      (list?.name ?? 'values')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'values';
    return `control-list-values-${slug}.xlsx`;
  });

  ngOnInit(): void {
    this.configureModal();
    void this.load();
  }

  trackByCategoryId = (_: number, category: ControlListCategory): number => category.id;
  trackByListId = (_: number, list: ControlListSummary): number => list.id;

  // design §6 Load: A1 and the active portfolios start together; neither waits for the other.
  async load(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadPortfolios()]);
  }

  selectList(listId: number): void {
    this.selectedListId.set(listId);
    this.pfFilter.set(ALL_PORTFOLIOS_FILTER);
    void this.loadValues(listId);
  }

  // Leader-adjudicated defect (T-03 rework): with no guard, selecting list A then quickly list B
  // let A's slower response land AFTER B's and overwrite B's table with A's rows — and the next
  // "Add value" on B would then derive its proposed code from A's values and POST it to B. Every
  // branch below re-checks `selectedListId()` against the `listId` this call started with, so a
  // response for a list the admin has since navigated away from is silently dropped.
  private async loadValues(listId: number): Promise<void> {
    this.valuesLoading.set(true);
    this.valuesLoadError.set(false);

    try {
      const response = await this.api.GET_ControlListValues(listId);
      if (this.selectedListId() !== listId) return;
      if (response?.successfulRequest === false) {
        this.valuesLoadError.set(true);
        this.values.set([]);
        return;
      }
      this.values.set(Array.isArray(response?.data) ? response.data : []);
    } catch {
      if (this.selectedListId() !== listId) return;
      this.valuesLoadError.set(true);
      this.values.set([]);
    } finally {
      if (this.selectedListId() === listId) {
        this.valuesLoading.set(false);
      }
    }
  }

  private async loadCategories(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.api.GET_ControlListCategories();
      if (response?.successfulRequest === false) {
        this.loadError.set(true);
        this.categories.set([]);
        return;
      }
      this.categories.set(Array.isArray(response?.data) ? response.data : []);
    } catch {
      this.loadError.set(true);
      this.categories.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  // Never rejects: a failure only sets `portfoliosLoadFailed` (the page keeps working, S-4). The
  // portfolios endpoint lists active portfolios; `is_active === false` is filtered anyway so an
  // inactive one can never be offered.
  private async loadPortfolios(): Promise<void> {
    this.portfoliosLoadFailed.set(false);

    try {
      const response = await this.api.GET_Portfolios();
      if (response?.successfulRequest === false) {
        this.portfoliosLoadFailed.set(true);
        this.portfolios.set([]);
        return;
      }
      const list = Array.isArray(response?.data) ? response.data : [];
      this.portfolios.set(list.filter(portfolio => portfolio.is_active !== false));
    } catch {
      this.portfoliosLoadFailed.set(true);
      this.portfolios.set([]);
    }
  }

  portfolioId(portfolio: Portfolio): number {
    return Number(portfolio.portfolio_id ?? portfolio.id ?? 0);
  }

  trackByPortfolioId = (_: number, portfolio: Portfolio): number => this.portfolioId(portfolio);

  // Applies to column text (design §6): *All*, the portfolio names, or *No active portfolio*. With
  // the portfolios call failed (or an id not in the active list) the id is shown instead.
  private appliesToLabel(value: ControlListValue): string {
    if (value.appliesToAll) return 'All';
    if (value.appliesTo.length === 0) return 'No active portfolio';
    const namesById = new Map(this.portfolios().map(portfolio => [this.portfolioId(portfolio), portfolio.name]));
    return value.appliesTo.map(id => namesById.get(id) ?? String(id)).join(', ');
  }

  appliesToHint(): string {
    return this.valueForm().portfolioIds.length > 0
      ? 'Offered only in the ticked portfolios. Records that already use it stay valid.'
      : 'None ticked = applies to all portfolios. Records that already use it stay valid.';
  }

  togglePortfolio(portfolioId: number, checked: boolean): void {
    this.valueForm.update(current => {
      const withoutId = current.portfolioIds.filter(id => id !== portfolioId);
      return { ...current, portfolioIds: checked ? [...withoutId, portfolioId] : withoutId };
    });
  }

  startCreate(): void {
    this.modalMode.set('category');
    this.resetForm();
    this.openModal();
  }

  startEdit(category: ControlListCategory): void {
    this.modalMode.set('category');
    this.editingCategoryId.set(category.id);
    this.form.set({ name: category.name ?? '', description: category.description ?? '' });
    this.openModal();
  }

  startCreateList(category: ControlListCategory): void {
    this.modalMode.set('list');
    this.resetListForm();
    this.createListCategoryId.set(category.id);
    this.openModal();
  }

  startEditList(): void {
    const list = this.selectedList();
    if (!list) return;
    this.modalMode.set('list');
    this.editingListId.set(list.id);
    this.listForm.set({ listKey: list.key, name: list.name ?? '', description: list.description ?? '', codePrefix: list.codePrefix ?? '' });
    this.openModal();
  }

  // ─── T-03: value modal (design §4 A10/A11, §6.2 Modal row value mode) ─────────────────────

  startCreateValue(): void {
    const list = this.selectedList();
    if (!list) return;
    this.modalMode.set('value');
    this.resetValueForm();
    // D-CTL-17: computed HERE on the client, from the codes already loaded for this list (no
    // network round trip) — but using the LIST's own `codePrefix`, not one guessed from the
    // codes themselves (reviewer FAIL, T-03 rework attempt 1: a code belonging to another list's
    // prefix, e.g. a stray `X-50`, could otherwise win). The rule mirrors the server's
    // `proposeNextCode` exactly, including `<prefix>-01` / `L1` on an empty list, so this never
    // diverges from what A10 would propose server-side when `code` is omitted.
    const proposedCode = this.deriveNextProposedCode(
      list.codePrefix,
      this.values().map(existing => existing.code)
    );
    this.valueForm.update(current => ({ ...current, code: proposedCode }));
    this.openModal();
  }

  startEditValue(value: ControlListValue): void {
    this.modalMode.set('value');
    this.editingValueId.set(value.id);
    this.valueForm.set({
      code: value.code,
      value: value.value,
      description: value.description ?? '',
      displayOrder: value.displayOrder,
      isActive: value.isActive,
      portfolioIds: [...value.appliesTo]
    });
    this.editingNoActivePortfolio.set(!value.appliesToAll && value.appliesTo.length === 0);
    this.openModal();
  }

  updateValueFormActive(isActive: boolean): void {
    this.valueForm.update(current => ({ ...current, isActive }));
  }

  // D-CTL-17 / design §5 rule 4: a LITERAL mirror of the server's `proposeNextCode`
  // (`control-lists.service.ts`) — same escaping, same `L<n>` special case, same "ignore a code
  // from another prefix" behavior, same `<prefix>-01` / `L1` result on an empty (or
  // all-foreign-prefix) list, same case-insensitive suffix scan (the unique index ignores case, so
  // `dir-04` counts). Keep this in lockstep with the server function if either changes.
  private deriveNextProposedCode(codePrefix: string, existingCodes: string[]): string {
    const escapedPrefix = codePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isOrgLevelFormat = codePrefix === 'L';
    const pattern = isOrgLevelFormat ? new RegExp(`^${escapedPrefix}(\\d+)$`, 'i') : new RegExp(`^${escapedPrefix}-(\\d+)$`, 'i');

    let maxSuffix = 0;
    for (const code of existingCodes) {
      const match = pattern.exec(code);
      if (match) {
        const suffix = parseInt(match[1], 10);
        if (suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }

    const next = maxSuffix + 1;
    return isOrgLevelFormat ? `${codePrefix}${next}` : `${codePrefix}-${String(next).padStart(2, '0')}`;
  }

  clearModal = (): void => {
    const mode = this.modalMode();
    if (mode === 'list') {
      this.resetListForm();
    } else if (mode === 'value') {
      this.resetValueForm();
    } else {
      this.resetForm();
    }
    this.configureModal();
  };

  async save(): Promise<void> {
    if (this.formInvalid() || this.saving()) return;

    this.saving.set(true);
    this.nameFieldError.set(null);
    const value = this.form();
    const editingId = this.editingCategoryId();
    // Leader-adjudicated defect: on create, an empty description is omitted (no column value
    // to clear yet); on edit, an emptied description must be SENT as '' so the server actually
    // clears it — `|| undefined` here would make `JSON.stringify` drop the key, and the save
    // would silently leave the old description in place while reporting success.
    const trimmedDescription = value.description.trim();

    try {
      const response =
        editingId === null
          ? await this.api.POST_ControlListCategory({
              name: value.name.trim(),
              description: trimmedDescription || undefined
            })
          : await this.api.PATCH_ControlListCategory(editingId, { name: value.name.trim(), description: trimmedDescription });

      if (response?.successfulRequest === false) {
        this.handleSaveError(response);
        return;
      }

      this.actions.showToast({
        severity: 'success',
        summary: 'Control Lists',
        detail: editingId === null ? 'Category created successfully' : 'Category updated successfully'
      });
      this.resetForm();
      this.modals.closeModal('controlListForm');
      await this.loadCategories();
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not save the category. Please try again.' });
    } finally {
      this.saving.set(false);
    }
  }

  // Design §6.2 Modal row: a field-named error (`field === 'name'`, e.g. the duplicate-name
  // 409) is shown inline under the name input. Anything else — no field, a plain string, or an
  // array of ValidationPipe messages — has nowhere inline to go and falls back to a toast.
  // Reviewer finding 1: never reads `errorDetail.description` (the exception class name).
  private handleSaveError(response: MainResponse<unknown>): void {
    const fieldError = this.extractFieldError(response);
    if (fieldError?.field === 'name') {
      this.nameFieldError.set(fieldError.message);
      return;
    }
    this.actions.showToast({
      severity: 'error',
      summary: 'Error',
      detail: fieldError?.message || 'We could not save the category. Please try again.'
    });
  }

  delete(category: ControlListCategory): void {
    if (this.deletingId() !== null) return;

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Delete category',
      detail: `Are you sure you want to delete ${category.name || 'this category'}? This action cannot be undone.`,
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.confirmDelete(category);
        }
      },
      cancelCallback: { label: 'Cancel' },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  private async confirmDelete(category: ControlListCategory): Promise<void> {
    if (this.deletingId() !== null) return;

    this.deletingId.set(category.id);

    try {
      const response = await this.api.DELETE_ControlListCategory(category.id);

      if (response?.successfulRequest === false) {
        // D-CTL-11 / design §6.2: a blocked delete (409, category still has lists) is
        // shown AS-IS — the server's own description — behind a single Close.
        this.showBlockedDeleteAlert(this.extractErrorMessage(response, 'This category could not be deleted.'));
        return;
      }

      this.actions.showToast({ severity: 'success', summary: 'Control Lists', detail: 'Category deleted successfully' });
      await this.loadCategories();
    } catch {
      this.showBlockedDeleteAlert('This category could not be deleted.');
    } finally {
      this.deletingId.set(null);
    }
  }

  private showBlockedDeleteAlert(detail: string): void {
    this.actions.showGlobalAlert({
      severity: 'error',
      summary: 'Cannot delete category',
      detail,
      hasNoCancelButton: true,
      generalButton: true,
      confirmCallback: { label: 'Close', event: () => undefined },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  // ─── T-02: list CRUD (design §4 A6–A8, §5 rules 1, 3, 6) ───────────────────────

  async saveList(): Promise<void> {
    if (this.listFormInvalid() || this.savingList()) return;

    this.savingList.set(true);
    this.listKeyFieldError.set(null);
    const value = this.listForm();
    const editingId = this.editingListId();
    // Same fix as save() above, inherited from T-01's category PATCH (Leader-adjudicated
    // defect): create omits an empty description, edit sends '' so a cleared field is actually
    // cleared on the server instead of silently keeping the old value.
    const trimmedDescription = value.description.trim();

    try {
      // §5 rule 3 / design A7: `listKey` is never part of the update body — the create-only
      // key field stays disabled (not removed) in edit mode so the admin can still see it.
      const response =
        editingId === null
          ? await this.api.POST_ControlList({
              categoryId: this.createListCategoryId() ?? 0,
              listKey: value.listKey.trim(),
              name: value.name.trim(),
              description: trimmedDescription || undefined,
              codePrefix: value.codePrefix.trim() || undefined
            })
          : await this.api.PATCH_ControlList(editingId, { name: value.name.trim(), description: trimmedDescription });

      if (response?.successfulRequest === false) {
        this.handleListSaveError(response);
        return;
      }

      this.actions.showToast({
        severity: 'success',
        summary: 'Control Lists',
        detail: editingId === null ? 'List created successfully' : 'List updated successfully'
      });
      const createdId = editingId === null ? (response?.data as ControlList | undefined)?.id : undefined;
      this.resetListForm();
      this.modals.closeModal('controlListForm');
      await this.loadCategories();
      if (createdId !== undefined) {
        this.selectedListId.set(createdId);
      }
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not save the list. Please try again.' });
    } finally {
      this.savingList.set(false);
    }
  }

  // Design §6.2 Modal row: the duplicate-key 409 names `field: 'listKey'` — shown inline under
  // the key input. Everything else (no field, a plain 404 string, a 400 array) falls back to a
  // toast, same pattern as the category form's `handleSaveError` (reviewer finding 1).
  private handleListSaveError(response: MainResponse<unknown>): void {
    const fieldError = this.extractFieldError(response);
    if (fieldError?.field === 'listKey') {
      this.listKeyFieldError.set(fieldError.message);
      return;
    }
    this.actions.showToast({
      severity: 'error',
      summary: 'Error',
      detail: fieldError?.message || 'We could not save the list. Please try again.'
    });
  }

  deleteList(): void {
    const list = this.selectedList();
    if (!list || this.deletingListId() !== null) return;

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Delete list',
      detail: `Are you sure you want to delete ${list.name || 'this list'}? This action cannot be undone.`,
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.confirmDeleteList(list);
        }
      },
      cancelCallback: { label: 'Cancel' },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  private async confirmDeleteList(list: ControlListSummary): Promise<void> {
    if (this.deletingListId() !== null) return;

    this.deletingListId.set(list.id);

    try {
      const response = await this.api.DELETE_ControlList(list.id);

      if (response?.successfulRequest === false) {
        // design §6.2 / A8: a blocked delete (409 has values — any list, seeded or created,
        // CR-2) is shown AS-IS — the server's own description — behind a single Close.
        this.showBlockedDeleteListAlert(this.extractErrorMessage(response, 'This list could not be deleted.'));
        return;
      }

      this.actions.showToast({ severity: 'success', summary: 'Control Lists', detail: 'List deleted successfully' });
      this.selectedListId.set(null);
      this.values.set([]);
      await this.loadCategories();
    } catch {
      this.showBlockedDeleteListAlert('This list could not be deleted.');
    } finally {
      this.deletingListId.set(null);
    }
  }

  private showBlockedDeleteListAlert(detail: string): void {
    this.actions.showGlobalAlert({
      severity: 'error',
      summary: 'Cannot delete list',
      detail,
      hasNoCancelButton: true,
      generalButton: true,
      confirmCallback: { label: 'Close', event: () => undefined },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  // ─── T-03: value CRUD (design §4 A10–A12, §5 rules 2, 4, 6) ────────────────────────────────

  async saveValue(): Promise<void> {
    if (this.valueFormInvalid() || this.savingValue()) return;
    const list = this.selectedList();
    if (!list) return;

    this.savingValue.set(true);
    this.valueCodeFieldError.set(null);
    this.valueValueFieldError.set(null);
    const formValue = this.valueForm();
    const editingId = this.editingValueId();
    const trimmedCode = formValue.code.trim();
    const trimmedValue = formValue.value.trim();
    // Same Leader-adjudicated rule as the category/list forms above: create omits an empty
    // description (nothing to clear yet); edit sends '' so the server actually clears it.
    const trimmedDescription = formValue.description.trim();
    // Reviewer finding (T-03 rework): `p-inputNumber` emits `null` when the Order field is
    // cleared, and the DTO's NOT NULL column would 500 (or false-409) on that. On CREATE, a
    // cleared Order sends a safe default of 0; on EDIT, the key is omitted entirely so a value
    // the admin otherwise left untouched is not silently reset to 0.
    const hasValidDisplayOrder = typeof formValue.displayOrder === 'number' && Number.isFinite(formValue.displayOrder);
    // R-CLG-009: `[]` (none ticked) is sent as `[]` — it means "all portfolios". It is omitted only
    // when the admin could not see or change the field: portfolios failed to load (S-4), or an
    // untouched value whose links are all inactive (`editingNoActivePortfolio`) — in both cases an
    // omitted key keeps the stored set (A11), whereas `[]` would silently clear it.
    const sendPortfolioIds =
      !this.portfoliosLoadFailed() && !(editingId !== null && this.editingNoActivePortfolio() && formValue.portfolioIds.length === 0);
    const portfolioPayload = sendPortfolioIds ? { portfolioIds: formValue.portfolioIds } : {};

    try {
      const response =
        editingId === null
          ? await this.api.POST_ControlListValue(list.id, {
              code: trimmedCode || undefined,
              value: trimmedValue,
              description: trimmedDescription || undefined,
              displayOrder: hasValidDisplayOrder ? (formValue.displayOrder as number) : 0,
              isActive: formValue.isActive,
              ...portfolioPayload
            })
          : await this.api.PATCH_ControlListValue(editingId, {
              code: trimmedCode,
              value: trimmedValue,
              description: trimmedDescription,
              ...(hasValidDisplayOrder ? { displayOrder: formValue.displayOrder as number } : {}),
              isActive: formValue.isActive,
              ...portfolioPayload
            });

      if (response?.successfulRequest === false) {
        this.handleValueSaveError(response);
        return;
      }

      this.actions.showToast({
        severity: 'success',
        summary: 'Control Lists',
        detail: editingId === null ? 'Value created successfully' : 'Value updated successfully'
      });
      this.resetValueForm();
      this.modals.closeModal('controlListForm');
      await this.loadValues(list.id);
      // Leader's brief: "After value create/delete, the navigator valueCount must update" —
      // A1's `ControlListSummary.valueCount` is stale until categories are reloaded, same
      // staleness fix as the category reload after a category write.
      await this.loadCategories();
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'We could not save the value. Please try again.' });
    } finally {
      this.savingValue.set(false);
    }
  }

  // Design §6.2 Modal row: a field-named 409 names `field: 'code'` or `field: 'value'` (R-CTL-004
  // "Duplicate code or value") — shown inline under the matching input. Anything else falls back
  // to a toast, same pattern as the category/list handlers (reviewer finding 1).
  private handleValueSaveError(response: MainResponse<unknown>): void {
    const fieldError = this.extractFieldError(response);
    if (fieldError?.field === 'code') {
      this.valueCodeFieldError.set(fieldError.message);
      return;
    }
    if (fieldError?.field === 'value') {
      this.valueValueFieldError.set(fieldError.message);
      return;
    }
    this.actions.showToast({
      severity: 'error',
      summary: 'Error',
      detail: fieldError?.message || 'We could not save the value. Please try again.'
    });
  }

  deleteValue(value: ControlListValue): void {
    if (this.deletingValueId() !== null) return;

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Delete value',
      detail: `Are you sure you want to delete ${value.value || 'this value'}? This action cannot be undone.`,
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.confirmDeleteValue(value);
        }
      },
      cancelCallback: { label: 'Cancel' },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  private async confirmDeleteValue(value: ControlListValue): Promise<void> {
    const list = this.selectedList();
    if (!list || this.deletingValueId() !== null) return;

    this.deletingValueId.set(value.id);

    try {
      const response = await this.api.DELETE_ControlListValue(value.id);

      if (response?.successfulRequest === false) {
        // design §6.2 / A12: a blocked delete (409 in use — T-04; here, any other 409) is shown
        // AS-IS — the server's own description — behind a single Close.
        this.showBlockedDeleteValueAlert(this.extractErrorMessage(response, 'This value could not be deleted.'));
        return;
      }

      this.actions.showToast({ severity: 'success', summary: 'Control Lists', detail: 'Value deleted successfully' });
      await this.loadValues(list.id);
      await this.loadCategories();
    } catch {
      this.showBlockedDeleteValueAlert('This value could not be deleted.');
    } finally {
      this.deletingValueId.set(null);
    }
  }

  private showBlockedDeleteValueAlert(detail: string): void {
    this.actions.showGlobalAlert({
      severity: 'error',
      summary: 'Cannot delete value',
      detail,
      hasNoCancelButton: true,
      generalButton: true,
      confirmCallback: { label: 'Close', event: () => undefined },
      buttonColor: 'var(--ac-light-blue-400)'
    });
  }

  private resetForm(): void {
    this.editingCategoryId.set(null);
    this.form.set({ name: '', description: '' });
    this.nameFieldError.set(null);
  }

  private resetListForm(): void {
    this.editingListId.set(null);
    this.createListCategoryId.set(null);
    this.listForm.set({ listKey: '', name: '', description: '', codePrefix: '' });
    this.listKeyFieldError.set(null);
  }

  private resetValueForm(): void {
    this.editingValueId.set(null);
    this.valueForm.set({ code: '', value: '', description: '', displayOrder: 0, isActive: true, portfolioIds: [] });
    this.editingNoActivePortfolio.set(false);
    this.valueCodeFieldError.set(null);
    this.valueValueFieldError.set(null);
  }

  private configureModal(): void {
    const mode = this.modalMode();
    this.modals.modalConfig.update(modals => ({
      ...modals,
      controlListForm: {
        ...modals.controlListForm,
        title: mode === 'list' ? this.listModalTitle() : mode === 'value' ? this.valueModalTitle() : this.modalTitle(),
        cancelText: 'Cancel',
        confirmText: 'Save',
        confirmAction: () => {
          void (mode === 'list' ? this.saveList() : mode === 'value' ? this.saveValue() : this.save());
        },
        cancelAction: () => this.modals.closeModal('controlListForm'),
        disabledConfirmAction: () =>
          mode === 'list'
            ? this.listFormInvalid() || this.savingList()
            : mode === 'value'
              ? this.valueFormInvalid() || this.savingValue()
              : this.formInvalid() || this.saving()
      }
    }));
  }

  private openModal(): void {
    // Clears a stale inline error from a previous failed attempt — startEdit()/startEditList()/
    // startEditValue() do not route through the reset*Form() helpers, so without this a
    // re-opened modal could still show the last field error.
    this.nameFieldError.set(null);
    this.listKeyFieldError.set(null);
    this.valueCodeFieldError.set(null);
    this.valueValueFieldError.set(null);
    this.configureModal();
    this.modals.openModal('controlListForm');
  }

  // The server keeps its payload: a real 409/400 from GlobalExceptions puts the message in
  // `errorDetail.errors`, which arrives as one of three shapes — a plain string, a field-named
  // object `{ description, field }` (ConflictException), or an array of ValidationPipe strings.
  // `errorDetail.description` is always the exception CLASS NAME ("ConflictException") and must
  // never be read as a message (reviewer finding 1; prior art: bilateral-mapping.service.ts:192-196,
  // innovation-use-details.component.ts:527).
  private extractFieldError(response: MainResponse<unknown> | undefined): ControlListFieldError | null {
    const errors = response?.errorDetail?.errors as unknown;

    if (typeof errors === 'string') {
      const message = errors.trim();
      return message ? { message } : null;
    }

    if (Array.isArray(errors)) {
      const message = errors.map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join(' ');
      return message ? { message } : null;
    }

    if (errors && typeof errors === 'object') {
      const detail = errors as { description?: unknown; field?: unknown };
      const message = typeof detail.description === 'string' ? detail.description.trim() : '';
      const field = typeof detail.field === 'string' ? detail.field : undefined;
      return message ? { message, field } : null;
    }

    return null;
  }

  private extractErrorMessage(response: MainResponse<unknown> | undefined, fallback: string): string {
    return this.extractFieldError(response)?.message || fallback;
  }
}
