import { Injectable, computed, inject } from '@angular/core';
import { AllModalsService } from './all-modals.service';
import { CreateResultManagementService } from '../../components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { ApiService } from '../api.service';
import { CacheService } from './cache.service';
import { normalizeStepThree } from '@shared/utils/geographic-scope.util';

@Injectable({
  providedIn: 'root'
})
export class CurrentResultService {
  createResultManagementService = inject(CreateResultManagementService);
  api = inject(ApiService);
  allModalsService = inject(AllModalsService);
  cache = inject(CacheService);

  readonly isCurrentUserOwner = computed(() => {
    const metadata = this.cache.currentMetadata();
    return (
      this.cache.isMyResult() ||
      metadata.is_principal_investigator === true ||
      metadata.is_main_contact_person === true
    );
  });

  async openEditRequestdOicrsModal(
    indicatorId: number,
    resultStatusId: number,
    resultCode: number,
    creationEntryContext?: 'results-center' | 'project' | null
  ) {
    if (!this.validateOpenResult(indicatorId, resultStatusId)) return false;
    if (creationEntryContext !== undefined) {
      this.createResultManagementService.setResultCreationEntryContext(creationEntryContext);
    }
    this.createResultManagementService.currentRequestedResultCode.set(resultCode);
    this.createResultManagementService.editingOicr.set(true);
    await this.api.GET_OICRModal(resultCode).then(response => {
      response.data.step_three = normalizeStepThree(response.data.step_three);
      response.data.step_three.comment_geo_scope = response.data.step_three.comment_geo_scope || '';
      this.createResultManagementService.createOicrBody.set(response.data);
      this.allModalsService.openModal('createResult');
      this.createResultManagementService.resultPageStep.set(2);
      this.createResultManagementService.modalTitle.set('Outcome Impact Case Report (OICR)');
      this.createResultManagementService.contractId.set(response.data.base_information.contract_id);
      this.createResultManagementService.resultTitle.set(response.data.base_information.title);
      this.createResultManagementService.statusId.set(resultStatusId);
      this.cache.currentResultId.set(resultCode);
    });
    return true;
  }

  validateOpenResult(indicatorId: number, resultStatusId: number) {
    const isIntermediateStatus = resultStatusId === 10 || resultStatusId === 12 || resultStatusId === 13 || resultStatusId === 14;
    return indicatorId === 5 || resultStatusId === 9 || isIntermediateStatus;
  }
}
