import { Component, Input, Output, EventEmitter, signal, HostListener, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { NextStepOption, GetNextStep } from '@shared/interfaces/get-next-step.interface';
import { SubmissionService, STATUS_CHANGE_VALIDATION_TOOLTIP } from '@shared/services/submission.service';
import { isStatusChangeValidationRequired } from '@shared/utils/status-workflow.util';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-status-dropdown',
  imports: [CommonModule, TooltipModule],
  templateUrl: './status-dropdown.component.html'
})
export class StatusDropdownComponent implements OnInit, OnChanges {
  @Input() statusId = 0;
  @Input() statusName = '';
  @Output() statusChange = new EventEmitter<number>();
  cache = inject(CacheService);
  api = inject(ApiService);
  submissionService = inject(SubmissionService);
  isOpen = signal(false);
  readonly statusChangeValidationTooltip = STATUS_CHANGE_VALIDATION_TOOLTIP;
  
  availableStatuses = signal<NextStepOption[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadNextSteps();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['statusId'] && !changes['statusId'].firstChange) {
      this.loadNextSteps();
    }
  }

  async loadNextSteps(): Promise<void> {
    if (!this.statusId) {
      this.availableStatuses.set([]);
      return;
    }

    const resultCode = this.cache.getCurrentNumericResultId();
    if (!resultCode) {
      this.availableStatuses.set([]);
      return;
    }

    this.isLoading.set(true);
    try {
      const platformCode = this.cache.getCurrentPlatformCode();
      const response = await this.api.GET_NextStep(
        resultCode,
        platformCode || undefined
      );
      
      if (response.successfulRequest && response.data) {
        if (Array.isArray(response.data)) {
          this.availableStatuses.set(response.data.map(item => this.mapNextStepOption(item)));
        } else if (response.data.available_statuses) {
          this.availableStatuses.set(response.data.available_statuses.map((item: NextStepOption) => this.mapNextStepOption(item)));
        } else if (response.data.data && Array.isArray(response.data.data)) {
          this.availableStatuses.set(response.data.data.map(item => this.mapNextStepOption(item)));
        } else {
          const options = this.buildOptionsFromResponse(response.data);
          this.availableStatuses.set(options);
        }
      } else {
        this.availableStatuses.set([]);
      }
    } catch (error) {
      console.error('Error loading next steps:', error);
      this.availableStatuses.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildOptionsFromResponse(data: GetNextStep): NextStepOption[] {
    const options: NextStepOption[] = [];
    
    if (data.sequence && Array.isArray(data.sequence)) {
      const currentIndex = data.sequence.findIndex((s) => s.id === this.statusId);
      
      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          const previousStatus = data.sequence[currentIndex - 1];
          options.push({
            id: previousStatus.id,
            name: previousStatus.name,
            direction: 'previous'
          });
        }

        if (currentIndex < data.sequence.length - 1) {
          const nextStatus = data.sequence[currentIndex + 1];
          options.push({
            id: nextStatus.id,
            name: nextStatus.name,
            direction: 'next'
          });
        }
      }
    }

    if (data.special_transitions?.[this.statusId]) {
      options.push(...data.special_transitions[this.statusId]);
    }

    return options;
  }

  private mapNextStepOption(item: NextStepOption): NextStepOption {
    return {
      ...item,
      id: item.result_status_id || item.id,
      result_status_id: item.result_status_id,
      name: item.name,
      direction: item.direction,
      transition_direction: item.transition_direction,
      icon: item.icon,
      is_status_change_validation_required: isStatusChangeValidationRequired(item.is_status_change_validation_required)
        ? true
        : undefined
    };
  }

  isStatusOptionDisabled(status: NextStepOption): boolean {
    if (!isStatusChangeValidationRequired(status.is_status_change_validation_required)) {
      return false;
    }
    return !this.submissionService.meetsStatusChangeValidationRequirements();
  }

  getStatusOptionTooltip(status: NextStepOption): string {
    return this.isStatusOptionDisabled(status) ? this.statusChangeValidationTooltip : '';
  }

  getAvailableStatuses(): NextStepOption[] {
    const statuses = this.availableStatuses();
    return [...statuses].sort((a, b) => {
      const aIsBackward = a.transition_direction === 'backward' || a.direction === 'previous';
      const bIsBackward = b.transition_direction === 'backward' || b.direction === 'previous';
      
      if (aIsBackward && !bIsBackward) return 1;
      if (!aIsBackward && bIsBackward) return -1;
      return 0;
    });
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isOpen.update(v => !v);
  }

  selectStatus(statusId: number, event: Event) {
    event.stopPropagation();
    const status = this.availableStatuses().find(s => s.id === statusId);
    if (status && this.isStatusOptionDisabled(status)) {
      return;
    }
    this.statusChange.emit(statusId);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.status-dropdown-container')) {
      this.isOpen.set(false);
    }
  }
}

