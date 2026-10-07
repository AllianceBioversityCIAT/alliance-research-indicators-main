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
import { Portfolio } from '@shared/interfaces/portfolio.interface';
import {
  ControlList,
  ControlListCategory,
  ControlListPortfolioSummary,
  ControlListSummary,
  ControlListValue
} from '@shared/interfaces/control-lists.interface';
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
}

/**
 * A resolved client-side error: `message` is always display-safe text (never the exception
 * class name); `field` is present only for a field-named 409/400 (design §6.2 Modal row).
 */
interface ControlListFieldError {
  message: string;
  field?: string;
}

/** A portfolio option for the selector — R-CTL-001 "Default portfolio" / design §6.2. */
export interface PortfolioOption extends Portfolio {
  portfolioIdValue: number;
  configured: boolean;
  displayLabel: string;
}

// @akili-spec institutional-performance/control-lists T-01 (client half)
// design §2.1, §4 (A1–A5), §6.1/§6.2; requirements R-CTL-001, R-CTL-002, R-CTL-007, R-CTL-008.
// Scope: header + portfolio selector + category navigator + category-mode modal + delete
// confirm. Lists/values arrive in T-02/T-03 — A1's `lists` is read but not yet rendered.
@Component({
  selector: 'app-control-lists',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    ToggleSwitchModule,
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

  readonly portfolios = signal<Portfolio[]>([]);
  readonly portfolioSummaries = signal<ControlListPortfolioSummary[]>([]);
  readonly selectedPortfolioId = signal<number | null>(null);
  readonly categories = signal<ControlListCategory[]>([]);

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
  // Design §6.2 Modal row: the field-named 409 for a duplicate key in the portfolio
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

  // D-CTL-2 / falsifier 4: built from the portfolio ID, never the portfolio name.
  readonly listReference = computed(() => {
    const list = this.selectedList();
    const portfolioId = this.selectedPortfolioId();
    return list && portfolioId !== null ? `P${portfolioId} · ${list.key}` : '';
  });

  // T-04 (design §4 A1 "usedBy: string[]", §5 rule 5, R-CTL-003 "Used by"): consumer names
  // joined, or the fallback copy when no consumer has registered against this list's key yet.
  readonly usedByLabel = computed(() => {
    const usedBy = this.selectedList()?.usedBy ?? [];
    return usedBy.length > 0 ? usedBy.join(', ') : 'Not linked to a form yet';
  });

  // R-CTL-001 "Default portfolio": every portfolio stays selectable; a 0-category one
  // is labelled "(not configured)" (A2) and opens on the empty state (design D-CTL-10).
  readonly portfolioOptions = computed<PortfolioOption[]>(() => {
    const summaries = this.portfolioSummaries();
    return this.portfolios().map(portfolio => {
      const id = this.portfolioId(portfolio);
      const configured = (summaries.find(summary => summary.portfolioId === id)?.categories ?? 0) > 0;
      return {
        ...portfolio,
        portfolioIdValue: id,
        configured,
        displayLabel: configured ? portfolio.name : `${portfolio.name} (not configured)`
      };
    });
  });

  // ─── T-03: values (design §4 A9–A12, §6.2 values table + modal, §6.3 DataTable) ───────────
  readonly values = signal<ControlListValue[]>([]);
  readonly valuesLoading = signal(false);
  readonly valuesLoadError = signal(false);
  readonly savingValue = signal(false);
  readonly deletingValueId = signal<number | null>(null);
  readonly editingValueId = signal<number | null>(null);
  readonly valueForm = signal<ValueFormValue>({ code: '', value: '', description: '', displayOrder: 0, isActive: true });
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
  readonly valueColumns: DataTableColumn<ControlListValue>[] = [
    { field: 'id', header: 'ID', type: 'text', sortable: false },
    { field: 'code', header: 'Code', type: 'code', sortable: true },
    { field: 'value', header: 'Value', type: 'text', sortable: true },
    { field: 'description', header: 'Description', type: 'text', sortable: false },
    { field: 'displayOrder', header: 'Order', type: 'number', sortable: true },
    { field: 'inUse', header: 'In use', type: 'number', sortable: false },
    { field: 'isActive', header: 'Active', type: 'badge', sortable: false }
  ];
  readonly valueSearchFields: (keyof ControlListValue & string)[] = ['code', 'value', 'description'];

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

  portfolioId(portfolio: Portfolio): number {
    return Number(portfolio.portfolio_id ?? portfolio.id ?? 0);
  }

  trackByCategoryId = (_: number, category: ControlListCategory): number => category.id;
  trackByPortfolioId = (_: number, portfolio: PortfolioOption): number => portfolio.portfolioIdValue;
  trackByListId = (_: number, list: ControlListSummary): number => list.id;

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const [portfoliosRes, summariesRes] = await Promise.all([this.api.GET_Portfolios(), this.api.GET_ControlListPortfolioSummaries()]);

      if (portfoliosRes?.successfulRequest === false || summariesRes?.successfulRequest === false) {
        this.loadError.set(true);
        this.loading.set(false);
        return;
      }

      const portfolioList = Array.isArray(portfoliosRes?.data) ? portfoliosRes.data : [];
      const summaryList = Array.isArray(summariesRes?.data) ? summariesRes.data : [];
      this.portfolios.set(portfolioList);
      this.portfolioSummaries.set(summaryList);

      const defaultId = this.resolveDefaultPortfolioId(portfolioList);
      this.selectedPortfolioId.set(defaultId);

      if (defaultId === null) {
        this.categories.set([]);
        this.loading.set(false);
        return;
      }

      await this.loadCategories(defaultId);
    } catch {
      this.loadError.set(true);
      this.loading.set(false);
    }
  }

  async selectPortfolio(portfolioId: number | null): Promise<void> {
    if (portfolioId === null || portfolioId === this.selectedPortfolioId()) return;
    this.selectedPortfolioId.set(portfolioId);
    // R-CTL-001 isolation: a list id from the previous portfolio must not stay "selected"
    // against the new portfolio's categories.
    this.selectedListId.set(null);
    this.values.set([]);
    await this.loadCategories(portfolioId);
  }

  selectList(listId: number): void {
    this.selectedListId.set(listId);
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

  private async loadCategories(portfolioId: number): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await this.api.GET_ControlListCategories(portfolioId);
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
      isActive: value.isActive
    });
    this.openModal();
  }

  updateValueFormActive(isActive: boolean): void {
    this.valueForm.update(current => ({ ...current, isActive }));
  }

  // D-CTL-17 / design §5 rule 4: a LITERAL mirror of the server's `proposeNextCode`
  // (`control-lists.service.ts`) — same escaping, same `L<n>` special case, same "ignore a code
  // from another prefix" behavior, same `<prefix>-01` / `L1` result on an empty (or
  // all-foreign-prefix) list. Keep this in lockstep with the server function if either changes.
  private deriveNextProposedCode(codePrefix: string, existingCodes: string[]): string {
    const escapedPrefix = codePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isOrgLevelFormat = codePrefix === 'L';
    const pattern = isOrgLevelFormat ? new RegExp(`^${escapedPrefix}(\\d+)$`) : new RegExp(`^${escapedPrefix}-(\\d+)$`);

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
    const portfolioId = this.selectedPortfolioId();
    if (portfolioId === null) return;

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
              portfolioId,
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
      await this.loadCategories(portfolioId);
      // R-CTL-001 Details / D-CTL-10 (reviewer finding 3): a create/edit can change the
      // portfolio's category count, which the "(not configured)" label is derived from —
      // refresh A2 so the selector never shows a stale label right after the flow that
      // changes it.
      await this.refreshPortfolioSummaries();
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
    const portfolioId = this.selectedPortfolioId();
    if (portfolioId === null || this.deletingId() !== null) return;

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
      await this.loadCategories(portfolioId);
      // Same staleness fix as save() — a delete can drop a portfolio back to 0 categories.
      await this.refreshPortfolioSummaries();
    } catch {
      this.showBlockedDeleteAlert('This category could not be deleted.');
    } finally {
      this.deletingId.set(null);
    }
  }

  // Best-effort: A2 drives only the "(not configured)" label text (design D-CTL-10), never a
  // functional gate, so a failed refresh just leaves the previous summaries in place.
  private async refreshPortfolioSummaries(): Promise<void> {
    try {
      const response = await this.api.GET_ControlListPortfolioSummaries();
      if (response?.successfulRequest !== false && Array.isArray(response?.data)) {
        this.portfolioSummaries.set(response.data);
      }
    } catch {
      // best-effort refresh; see comment above
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
    const portfolioId = this.selectedPortfolioId();
    if (portfolioId === null) return;

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
      await this.loadCategories(portfolioId);
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
    const portfolioId = this.selectedPortfolioId();
    if (portfolioId === null || this.deletingListId() !== null) return;

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
      await this.loadCategories(portfolioId);
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
    const portfolioId = this.selectedPortfolioId();
    if (!list || portfolioId === null) return;

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

    try {
      const response =
        editingId === null
          ? await this.api.POST_ControlListValue(list.id, {
              code: trimmedCode || undefined,
              value: trimmedValue,
              description: trimmedDescription || undefined,
              displayOrder: hasValidDisplayOrder ? (formValue.displayOrder as number) : 0,
              isActive: formValue.isActive
            })
          : await this.api.PATCH_ControlListValue(editingId, {
              code: trimmedCode,
              value: trimmedValue,
              description: trimmedDescription,
              ...(hasValidDisplayOrder ? { displayOrder: formValue.displayOrder as number } : {}),
              isActive: formValue.isActive
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
      // staleness fix as the A2 "(not configured)" label refresh above.
      await this.loadCategories(portfolioId);
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
    const portfolioId = this.selectedPortfolioId();
    if (!list || portfolioId === null || this.deletingValueId() !== null) return;

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
      await this.loadCategories(portfolioId);
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
    this.valueForm.set({ code: '', value: '', description: '', displayOrder: 0, isActive: true });
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

  // R-CTL-001 "Default portfolio": the portfolio whose start/end years contain the
  // current year. No match falls back to the first portfolio (judgment call — the
  // selector must always resolve to SOME portfolio when at least one exists).
  private resolveDefaultPortfolioId(portfolios: Portfolio[]): number | null {
    if (!portfolios.length) return null;
    const year = new Date().getFullYear();
    const match = portfolios.find(portfolio => Number(portfolio.start_year) <= year && year <= Number(portfolio.end_year));
    return this.portfolioId(match ?? portfolios[0]);
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
