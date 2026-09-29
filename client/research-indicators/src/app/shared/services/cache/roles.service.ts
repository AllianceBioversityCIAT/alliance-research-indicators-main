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

  /**
   * The signed-in user's roles, or an empty list while the cache is still being
   * populated. Reading `user.user_role_list` directly THROWS on the window before
   * the session is hydrated, and a role check that throws takes its whole caller
   * down with it — a page that only wanted to know whether to show a button ends
   * up in an error state.
   */
  private readonly roleList = computed(() => this.cache.dataCache().user?.user_role_list ?? []);

  isSystemAdmin = computed(() => this.roleList().some(r => r.role_id === this.adminRoleId));

  isAdmin = computed(() =>
    this.roleList().some(r => r.role_id === this.adminRoleId || r.role_id === this.centerAdminRoleId)
  );

  isMelRegionalExpert = computed(() => this.roleList().some(r => r.role_id === this.melRegionalExpertRoleId));

  canEditAnyResult = computed(() =>
    this.roleList()
      .some(
        r => r.role_id === this.adminRoleId || r.role_id === this.centerAdminRoleId || r.role_id === this.melRegionalExpertRoleId
      )
  );

  canAccessCenterAdmin = computed(() => this.roleList().some(e => this.userHasCenterAdminAccess(e)));

  canAccessAppConfiguration = computed(() =>
    this.roleList().some(
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
