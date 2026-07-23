import { Injectable, computed, inject } from '@angular/core';
import { CacheService } from './cache.service';
import { CreateResultManagementService } from '../../components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private readonly adminRoleId = 1;
  private readonly centerAdminRoleId = 9;
  private readonly melRegionalExpertRoleId = 10;

  private readonly technicalSupportRoleId = 7;

  createResultManagementService = inject(CreateResultManagementService);
  cache = inject(CacheService);

  isSystemAdmin = computed(() => this.cache.dataCache().user.user_role_list.some(r => r.role_id === this.adminRoleId));

  isAdmin = computed(() =>
    this.cache.dataCache().user.user_role_list.some(r => r.role_id === this.adminRoleId || r.role_id === this.centerAdminRoleId)
  );

  isMelRegionalExpert = computed(() => this.cache.dataCache().user.user_role_list.some(r => r.role_id === this.melRegionalExpertRoleId));

  canEditAnyResult = computed(() =>
    this.cache
      .dataCache()
      .user.user_role_list.some(
        r => r.role_id === this.adminRoleId || r.role_id === this.centerAdminRoleId || r.role_id === this.melRegionalExpertRoleId
      )
  );

  canAccessCenterAdmin = computed(() => this.cache.dataCache().user.user_role_list.some(e => this.userHasCenterAdminAccess(e)));

  canAccessAppConfiguration = computed(() =>
    this.cache.dataCache().user.user_role_list.some(
      r => r.role_id === this.adminRoleId || r.role_id === this.technicalSupportRoleId
    )
  );

  canEditAppConfiguration = computed(() => this.canAccessAppConfiguration());

  canEditOicr = computed(() => {
    if (!this.createResultManagementService.editingOicr()) {
      return true;
    }
    return this.canEditAnyResult();
  });

  private userHasCenterAdminAccess(entry: { role_id: number; role?: { focus_id?: number; sec_role_id?: number } | null }): boolean {
    if (entry.role_id === this.adminRoleId) {
      return true;
    }
    if (entry.role_id !== this.centerAdminRoleId) {
      return false;
    }
    if (entry.role?.focus_id !== this.adminRoleId) {
      return false;
    }
    const secId = entry.role?.sec_role_id;
    return secId != null && secId === this.centerAdminRoleId;
  }
}
