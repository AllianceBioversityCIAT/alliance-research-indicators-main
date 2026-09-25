import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@envs/environment';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import {
  PROMPT_SECTION_LABELS,
  PromptItem,
  PromptListResponse,
  PromptSections,
  UpdatePromptRequest
} from '@shared/interfaces/prompt-manager.interface';

@Injectable({
  providedIn: 'root'
})
export class PromptManagerService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly actions = inject(ActionsService);
  private readonly allModals = inject(AllModalsService);

  private loadInFlight = false;
  private editModalWasOpen = false;

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly items = signal<PromptItem[]>([]);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly editingItem = signal<PromptItem | null>(null);
  readonly editForm = signal<PromptSections>({});

  constructor() {
    effect(
      () => {
        const isOpen = this.allModals.isModalOpen('editPrompt').isOpen;
        if (this.editModalWasOpen && !isOpen) {
          this.resetEditState();
        }
        this.editModalWasOpen = isOpen;
      },
      { allowSignalWrites: true }
    );
  }

  async loadList(): Promise<void> {
    if (this.loadInFlight) return;
    this.loadInFlight = true;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<PromptListResponse>(`${environment.documentOverviewUrl}/api/prompts`, {
          headers: this.buildAuthHeaders()
        })
      );
      this.items.set(res?.prompts ?? []);
    } catch (error) {
      console.error('Error occurred while fetching prompts:', error);
      this.loadError.set(true);
      this.items.set([]);
    } finally {
      this.loading.set(false);
      this.loadInFlight = false;
    }
  }

  openEdit(row: PromptItem): void {
    this.saveError.set(null);
    this.editingItem.set(row);
    this.editForm.set(this.buildDraft(row));
    this.allModals.openModal('editPrompt');
    this.allModals.setModalWidth('editPrompt', true);
  }

  closeEdit(): void {
    this.allModals.closeModal('editPrompt');
    this.resetEditState();
  }

  /** True when at least one section differs from what the server currently holds. */
  isDirty(): boolean {
    const row = this.editingItem();
    if (!row) return false;
    const draft = this.editForm();
    return this.sectionKeys(row).some(key => (draft[key] ?? '') !== (row.user_prompt?.[key] ?? ''));
  }

  async saveEdit(): Promise<void> {
    const row = this.editingItem();
    if (!row) return;

    const draft = this.editForm();
    const userPrompt: PromptSections = {};
    for (const key of this.sectionKeys(row)) {
      userPrompt[key] = draft[key] ?? '';
    }

    const body: UpdatePromptRequest = {
      id: row.id,
      user_prompt: userPrompt,
      updated_by: this.cache.dataCache().user.email
    };

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await firstValueFrom(
        this.http.post<unknown>(`${environment.documentOverviewUrl}/api/prompts`, body, {
          headers: this.buildAuthHeaders()
        })
      );
      this.actions.showToast({
        severity: 'success',
        summary: 'Prompt Manager',
        detail: 'Prompt saved successfully'
      });
      await this.loadList();
      this.closeEdit();
    } catch (error) {
      console.error('Error occurred while saving the prompt:', error);
      const errorMessage = 'Failed to save the prompt. Please check your changes and try again.';
      this.saveError.set(errorMessage);
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage
      });
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Section keys to render/persist: the declared `sections` when present,
   * otherwise whatever keys the stored prompt actually carries.
   */
  sectionKeys(row: PromptItem): string[] {
    if (row.sections?.length) return row.sections;
    return Object.keys(row.user_prompt ?? row.default_prompt ?? {});
  }

  sectionLabel(key: string): string {
    return PROMPT_SECTION_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());
  }

  private buildDraft(row: PromptItem): PromptSections {
    const draft: PromptSections = {};
    for (const key of this.sectionKeys(row)) {
      draft[key] = row.user_prompt?.[key] ?? row.default_prompt?.[key] ?? '';
    }
    return draft;
  }

  private resetEditState(): void {
    this.editingItem.set(null);
    this.editForm.set({});
    this.saveError.set(null);
  }

  private buildAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'access-token': this.cache.dataCache().access_token,
      'X-API-Key': environment.clarisaApiKey,
      'Content-Type': 'application/json'
    });
  }
}
