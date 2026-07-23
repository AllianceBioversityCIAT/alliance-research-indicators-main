import { computed, Injectable, signal, inject } from '@angular/core';
import { CacheService } from './cache/cache.service';
import { GetMetadata } from '../interfaces/get-metadata.interface';
import { ReviewOption } from '../interfaces/review-option.interface';
import { RolesService } from './cache/roles.service';

const STAR_DRAFT_RBAC_STATUS_IDS = new Set([4, 12, 13]);

export const STATUS_CHANGE_VALIDATION_TOOLTIP =
  'All green checks must be completed. All mandatory fields must be filled.';

export interface SubmissionStatus {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  cache = inject(CacheService);
  rolesService = inject(RolesService);
  comment = signal('');
  melRegionalExpert = signal('');
  oicrNo = signal('');
  sharePointFolderLink = signal('');
  statusSelected = signal<ReviewOption | null>(null);
  canSubmitResult = computed(() => {
    return (
      this.meetsStatusChangeValidationRequirements() &&
      (this.cache.isMyResult() || this.cache.currentMetadata().is_principal_investigator || this.rolesService.isAdmin())
    );
  });

  meetsStatusChangeValidationRequirements = computed(() => {
    const checks = this.cache.greenChecks();
    return Object.values(checks).length > 0 && Object.values(checks).every(Boolean);
  });
  submissionStatuses = signal<SubmissionStatus[]>([
    { id: 1, name: 'Editing' },
    { id: 2, name: 'Submitted' },
    { id: 3, name: 'Accepted' },
    { id: 4, name: 'Draft' },
    { id: 5, name: 'Pending Revision' },
    { id: 6, name: 'Approved' },
    { id: 7, name: 'Do not approve' },
    { id: 8, name: 'Deleted' },
    { id: 9, name: 'Requested' },
    { id: 10, name: 'Approved' },
    { id: 11, name: 'Postponed' },
    { id: 12, name: 'Science Edition' },
    { id: 13, name: 'KM Curation' },
    { id: 14, name: 'Published' }
  ]);

  currentResultIsSubmitted = computed(() => this.cache.currentMetadata().status_id == 2);

  refreshSubmissionHistory = signal(0);

  isEditableStatus = computed(() => {
    const editableStatuses = [4, 5, 12, 13, 10];
    const meta = this.cache.currentMetadata();
    const statusId = meta.status_id ?? -1;
    const platformCode = this.cache.getCurrentPlatformCode();
    const isStarPlatform = platformCode === 'STAR';
    const hasNoPlatformCode = platformCode === '';
    if (!isStarPlatform && !hasNoPlatformCode) {
      return false;
    }
    if (statusId === 14 && this.rolesService.isAdmin()) {
      return true;
    }
    const hasEditableStatus = editableStatuses.includes(statusId);
    if (!hasEditableStatus) {
      return false;
    }
    if (!STAR_DRAFT_RBAC_STATUS_IDS.has(statusId)) {
      return true;
    }
    return this.canEditStarDraftResult(meta);
  });

  isSubmitted = computed(() => {
    const editableStatuses = [2];
    return editableStatuses.includes(this.cache.currentMetadata().status_id ?? -1);
  });

  getStatusNameById(id: number): string {
    const status = this.submissionStatuses().find(status => status.id === id);
    return status ? status.name : '';
  }

  private canEditStarDraftResult(meta: GetMetadata): boolean {
    if (this.rolesService.canEditAnyResult()) {
      return true;
    }
    if (meta.has_result_edit_grant === false) {
      return false;
    }
    if (meta.has_result_edit_grant === true) {
      return true;
    }
    return this.cache.isMyResult() || Boolean(meta.is_main_contact_person) || Boolean(meta.is_principal_investigator);
  }
}
