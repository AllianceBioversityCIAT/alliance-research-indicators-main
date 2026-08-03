import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal, ViewChild, ElementRef, ChangeDetectionStrategy, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { AIAssistantResult, CreateResultResponse } from '../../../../models/AIAssistantResult';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '@shared/services/api.service';
import { Router } from '@angular/router';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { FormsModule } from '@angular/forms';
import { GetOsResult } from '@shared/interfaces/get-os-result.interface';
import { EXPANDED_ITEM_DETAILS, getIndicatorTypeIcon, INDICATOR_TYPE_ICONS } from '@shared/constants/result-ai.constants';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ExtendedHttpErrorResponse } from '@shared/interfaces/http-error-response.interface';

@Component({
  selector: 'app-result-ai-item',
  templateUrl: './result-ai-item.component.html',
  styleUrl: './result-ai-item.component.scss',
  imports: [CommonModule, ButtonModule, TooltipModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultAiItemComponent implements OnChanges {
  @Input() item!: AIAssistantResult | GetOsResult;
  @Input() hideButtons = false;
  @Input() isLastItem = false;
  @Input() isFirstItem = false;
  @ViewChild('titleInput') titleInput!: ElementRef;
  @ViewChild('titleText') titleText!: ElementRef;
  @ViewChild('editTitleContainer') editTitleContainer!: ElementRef;
  createResultManagementService = inject(CreateResultManagementService);
  createdResults = signal<Set<string>>(new Set());
  api = inject(ApiService);
  isCreated = signal(false);
  actions = inject(ActionsService);
  allModalsService = inject(AllModalsService);
  isEditingTitle = signal(false);
  private _tempTitle = '';

  get tempTitle(): string {
    return this._tempTitle;
  }

  set tempTitle(value: string) {
    this._tempTitle = value;
    this.autoGrow();
  }

  expandedItemDetails = EXPANDED_ITEM_DETAILS;
  indicatorTypeIcon = INDICATOR_TYPE_ICONS;

  constructor(private readonly router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.item) {
      const aiItem = this.isAIAssistantResult(this.item) ? this.item : undefined;
      this.isCreated.set(Boolean(aiItem?.result_official_code));
    }
  }

  getIndicatorTypeIcon(type: string) {
    return getIndicatorTypeIcon(type);
  }

  toggleExpand(item: AIAssistantResult) {
    this.createResultManagementService.expandedItem.set(this.createResultManagementService.expandedItem() === item ? null : item);
  }

  discardResult(item: AIAssistantResult) {
    this.createResultManagementService.items.update(items => items.filter(i => i !== item));
  }

  createResult(item: AIAssistantResult) {
    if (this.isEditingTitle()) {
      this.finishEditingTitle();
    }
    const payload = { ...item };
    delete payload.organization_type;
    delete payload.organization_sub_type;
    delete payload.organizations;
    this.api
      .POST_CreateResult(payload)
      .then((response: MainResponse<CreateResultResponse | ExtendedHttpErrorResponse>) => {
        if (response.successfulRequest) {
          this.isCreated.set(true);
          if ('data' in response && 'result_official_code' in response.data) {
            item.result_official_code = response.data.result_official_code as string;
          }
          return;
        }

        this.isCreated.set(false);
        this.actions.handleBadRequest(response);
      })
      .catch(err => {
        console.error('Error creating result:', err);
      });
  }

  openResult(item: AIAssistantResult) {
    const url = `/result/${item.result_official_code}/general-information`;
    window.open(url, '_blank');
  }

  isAIAssistantResult(item: AIAssistantResult | GetOsResult): item is AIAssistantResult {
    return 'training_type' in item;
  }

  autoGrow() {
    if (this.titleInput?.nativeElement) {
      this.titleInput.nativeElement.style.height = 'auto';
      this.titleInput.nativeElement.style.height = this.titleInput.nativeElement.scrollHeight + 'px';
    }
  }

  startEditingTitle() {
    this._tempTitle = this.item.title;
    this.isEditingTitle.set(true);
    setTimeout(() => {
      this.autoGrow();
      this.titleInput?.nativeElement?.focus();
    });
  }

  finishEditingTitle() {
    this.item.title = this._tempTitle;
    this.isEditingTitle.set(false);
  }

  cancelEditingTitle() {
    this.isEditingTitle.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.isEditingTitle()) {
      return;
    }

    const editContainer = this.editTitleContainer?.nativeElement;
    if (editContainer && !editContainer.contains(event.target as Node)) {
      this.finishEditingTitle();
    }
  }

  getOrganizationType(item: AIAssistantResult): string[] {
    return Array.isArray(item.organization_type) ? item.organization_type : [];
  }

  getOrganizations(item: AIAssistantResult): string[] {
    return Array.isArray(item.organizations) ? item.organizations : [];
  }

  getInnovationActorsDetailed(item: AIAssistantResult): import('../../../../models/AIAssistantResult').InnovationActorDetailed[] {
    return Array.isArray(item.innovation_actors_detailed) ? item.innovation_actors_detailed : [];
  }
}
