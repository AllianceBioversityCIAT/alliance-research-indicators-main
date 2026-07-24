import { effect, Injectable, inject, signal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import {
  AppConfigCategoriesResponse,
  AppConfigListItem,
  AppConfigListQuery,
  AppConfigListResponse,
  AppConfigSortField,
  AppConfigSortOrder,
  UpdateAppConfigDto
} from '@shared/interfaces/app-config.interface';
import { JsonRowDraft } from '@shared/interfaces/variable-configuration.interface';
import {
  JsonEditorNode,
  JsonLeafValue,
  applyFlatValuesToJson,
  buildJsonEditorTree,
  cloneJsonTemplate,
  flattenJsonLeaves,
  isEditableJsonObject
} from '@shared/utils/json-structure-editor.util';

export const UNCategorized_FILTER = '__UNCATEGORIZED__';

function extractAppConfigListItems(payload: AppConfigListResponse | AppConfigListItem[] | null | undefined): AppConfigListItem[] {
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
}

@Injectable({
  providedIn: 'root'
})
export class VariableConfigurationService {
  private static readonly EMPTY_JSON_VALUES: Record<string, JsonLeafValue> = {};
  private static readonly EMPTY_JSON_SECTIONS: JsonEditorNode[] = [];

  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private readonly allModals = inject(AllModalsService);
  private readonly roles = inject(RolesService);
  private loadInFlight = false;
  private editModalWasOpen = false;

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly items = signal<AppConfigListItem[]>([]);
  readonly facets = signal<AppConfigCategoriesResponse>({ categories: [], subcategories: [] });

  readonly search = signal('');
  readonly categoryFilter = signal<string | null>(null);
  readonly subcategoryFilter = signal<string | null>(null);

  readonly draftSearch = signal('');
  readonly draftCategoryFilter = signal<string | null>(null);
  readonly draftSubcategoryFilter = signal<string | null>(null);
  readonly showAdvancedFilters = signal(false);

  readonly sortField = signal<AppConfigSortField>('key');
  readonly sortOrder = signal<AppConfigSortOrder>('ASC');

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly editingItem = signal<AppConfigListItem | null>(null);
  readonly editForm = signal<UpdateAppConfigDto>({});
  readonly modalJsonSections = signal<Record<string, boolean>>({});
  readonly jsonDrafts = signal<Record<string, JsonRowDraft>>({});

  constructor() {
    effect(
      () => {
        const isOpen = this.allModals.isModalOpen('editEnvironmentVariable').isOpen;
        if (this.editModalWasOpen && !isOpen) {
          this.resetEditState();
        }
        this.editModalWasOpen = isOpen;
      },
      { allowSignalWrites: true }
    );
  }

  syncDraftsFromActive(): void {
    this.draftSearch.set(this.search());
    this.draftCategoryFilter.set(this.categoryFilter());
    this.draftSubcategoryFilter.set(this.subcategoryFilter());
  }

  buildQuery(): AppConfigListQuery {
    const category = this.categoryFilter();
    const subcategory = this.subcategoryFilter();
    return {
      search: this.search() || undefined,
      category: category === UNCategorized_FILTER ? '' : (category ?? undefined),
      subcategory: subcategory === UNCategorized_FILTER ? '' : (subcategory ?? undefined),
      sortField: this.sortField(),
      sortOrder: this.sortOrder()
    };
  }

  async loadFacets(): Promise<void> {
    const res = await this.api.GET_AppConfigCategories().catch(() => null);
    if (res?.data) {
      this.facets.set(res.data);
    }
  }

  async loadList(): Promise<void> {
    if (this.loadInFlight) return;
    this.loadInFlight = true;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const res = await this.api.GET_AppConfigList(this.buildQuery());
      this.items.set(extractAppConfigListItems(res?.data));
    } catch {
      this.loadError.set(true);
      this.items.set([]);
    } finally {
      this.loading.set(false);
      this.loadInFlight = false;
    }
  }

  async reload(): Promise<void> {
    this.syncDraftsFromActive();
    await Promise.all([this.loadFacets(), this.loadList()]);
  }

  async applyFilters(): Promise<void> {
    this.search.set(this.draftSearch().trim());
    this.categoryFilter.set(this.draftCategoryFilter());
    this.subcategoryFilter.set(this.draftSubcategoryFilter());
    this.showAdvancedFilters.set(true);
    await this.loadList();
  }

  resetFilters(): void {
    this.search.set('');
    this.categoryFilter.set(null);
    this.subcategoryFilter.set(null);
    this.draftSearch.set('');
    this.draftCategoryFilter.set(null);
    this.draftSubcategoryFilter.set(null);
    this.sortField.set('key');
    this.sortOrder.set('ASC');
    this.showAdvancedFilters.set(false);
  }

  async patchItem(key: string, body: UpdateAppConfigDto): Promise<boolean> {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.api.PATCH_AppConfigByKey(key, body);
      this.saveSuccess.set(true);
      this.actions.showToast({
        severity: 'success',
        summary: 'Configuration',
        detail: 'Data saved successfully'
      });
      await this.loadList();
      return true;
    } catch {
      const errorMessage = 'Failed to save configuration. Please check your values and try again.';
      this.saveError.set(errorMessage);
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  isJsonConfig(row: AppConfigListItem): boolean {
    return isEditableJsonObject(row.json_value) && Object.keys(row.json_value).length > 0;
  }

  jsonSections(rowKey: string): JsonEditorNode[] {
    return this.jsonDrafts()[rowKey]?.sections ?? VariableConfigurationService.EMPTY_JSON_SECTIONS;
  }

  jsonValues(rowKey: string): Record<string, JsonLeafValue> {
    return this.jsonDrafts()[rowKey]?.values ?? VariableConfigurationService.EMPTY_JSON_VALUES;
  }

  isJsonRowDirty(rowKey: string): boolean {
    return this.jsonDrafts()[rowKey]?.dirty === true;
  }

  editingUsesJson(): boolean {
    const row = this.editingItem();
    return row != null && this.isJsonConfig(row);
  }

  openEdit(row: AppConfigListItem): void {
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.editingItem.set(row);
    this.editForm.set({
      description: row.description ?? '',
      simple_value: row.simple_value ?? '',
      category: row.category ?? '',
      subcategory: row.subcategory ?? ''
    });

    this.modalJsonSections.set({});

    this.allModals.openModal('editEnvironmentVariable');
  }

  closeEdit(): void {
    this.allModals.closeModal('editEnvironmentVariable');
    this.resetEditState();
  }

  toggleModalJsonSection(sectionKey: string): void {
    this.modalJsonSections.update(state => ({
      ...state,
      [sectionKey]: !state[sectionKey]
    }));
  }

  onJsonFieldChange(rowKey: string, event: { pathKey: string; value: JsonLeafValue }): void {
    this.jsonDrafts.update(drafts => {
      const current = drafts[rowKey];
      if (!current) return drafts;
      return {
        ...drafts,
        [rowKey]: {
          ...current,
          dirty: true,
          values: { ...current.values, [event.pathKey]: event.value }
        }
      };
    });
  }

  async saveEdit(): Promise<void> {
    const row = this.editingItem();
    if (!row || !this.roles.canEditAppConfiguration()) return;

    if (this.isJsonConfig(row)) {
      const draft = this.jsonDrafts()[row.key];
      if (!draft) return;

      const body: UpdateAppConfigDto = {
        description: this.editForm().description?.trim() || undefined,
        category: this.editForm().category?.trim() || undefined,
        subcategory: this.editForm().subcategory?.trim() || undefined,
        json_value: applyFlatValuesToJson(draft.template, draft.values),
        simple_value: undefined
      };

      const ok = await this.patchItem(row.key, body);
      if (ok) {
        this.syncJsonDrafts(this.items());
        this.closeEdit();
      }
      return;
    }

    const body: UpdateAppConfigDto = {
      description: this.editForm().description?.trim() || undefined,
      category: this.editForm().category?.trim() || undefined,
      subcategory: this.editForm().subcategory?.trim() || undefined,
      simple_value: this.editForm().simple_value?.trim() ?? ''
    };

    const ok = await this.patchItem(row.key, body);
    if (ok) {
      this.closeEdit();
    }
  }

  syncJsonDrafts(items: AppConfigListItem[]): void {
    const editingKey = this.editingItem()?.key;
    const existingDrafts = this.jsonDrafts();
    const nextDrafts: Record<string, JsonRowDraft> = {};

    for (const row of items) {
      if (!this.isJsonConfig(row)) continue;
      const jsonValue = row.json_value!;
      const existing = existingDrafts[row.key];
      if (existing?.dirty && row.key === editingKey) {
        nextDrafts[row.key] = existing;
        continue;
      }
      nextDrafts[row.key] = {
        template: cloneJsonTemplate(jsonValue),
        values: flattenJsonLeaves(jsonValue),
        sections: buildJsonEditorTree(jsonValue),
        dirty: false
      };
    }

    const draftKeys = Object.keys(existingDrafts);
    const nextKeys = Object.keys(nextDrafts);
    const draftsChanged =
      draftKeys.length !== nextKeys.length || nextKeys.some(key => existingDrafts[key] !== nextDrafts[key]);

    if (draftsChanged) {
      this.jsonDrafts.set(nextDrafts);
    }
  }

  buildRowSearchHaystack(row: AppConfigListItem): string {
    const parts = [row.category, row.subcategory, row.key, row.description, row.simple_value];
    if (this.isJsonConfig(row)) {
      parts.push(...Object.values(flattenJsonLeaves(row.json_value!)).map(value => String(value ?? '')));
    }
    return parts
      .filter((part): part is string => part != null && part !== '')
      .join(' ')
      .toLowerCase();
  }

  jsonSectionCount(row: AppConfigListItem): number {
    if (!this.isJsonConfig(row)) return 0;
    return this.jsonDrafts()[row.key]?.sections.length ?? Object.keys(row.json_value!).length;
  }

  jsonSectionsLabel(row: AppConfigListItem): string {
    const count = this.jsonSectionCount(row);
    return count === 1 ? '1 section' : `${count} sections`;
  }

  private resetEditState(): void {
    this.editingItem.set(null);
    this.modalJsonSections.set({});
  }
}
