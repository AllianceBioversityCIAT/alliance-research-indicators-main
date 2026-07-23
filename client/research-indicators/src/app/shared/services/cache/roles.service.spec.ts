import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { RolesService } from './roles.service';
import { CacheService } from './cache.service';
import { CreateResultManagementService } from '../../components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

type TestUserRole = { role_id: number; role?: { focus_id?: number; sec_role_id?: number | null } };

describe('RolesService', () => {
  let service: RolesService;

  const userRoleList = signal<TestUserRole[]>([]);
  const mockDataCache = computed(() => ({
    user: { user_role_list: userRoleList() }
  }));

  let editingOicr: boolean;

  const mockCacheService: Partial<CacheService> = {
    dataCache: mockDataCache as unknown as CacheService['dataCache']
  };

  const mockCreateResultManagementService: Partial<CreateResultManagementService> = {
    editingOicr: jest.fn(() => editingOicr) as unknown as CreateResultManagementService['editingOicr']
  };

  beforeEach(() => {
    userRoleList.set([]);
    editingOicr = false;

    TestBed.configureTestingModule({
      providers: [
        RolesService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: CreateResultManagementService, useValue: mockCreateResultManagementService }
      ]
    });

    service = TestBed.inject(RolesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isAdmin should be true when role_id 9 is present', () => {
    userRoleList.set([{ role_id: 2 }, { role_id: 9 }]);
    expect(service.isAdmin()).toBe(true);
  });

  it('isAdmin should be true when role_id 1 is present', () => {
    userRoleList.set([{ role_id: 5 }, { role_id: 1 }]);
    expect(service.isAdmin()).toBe(true);
  });

  it('isSystemAdmin should be true only when role_id 1 is present', () => {
    userRoleList.set([{ role_id: 1 }]);
    expect(service.isSystemAdmin()).toBe(true);
    userRoleList.set([{ role_id: 9 }]);
    expect(service.isSystemAdmin()).toBe(false);
  });

  it('isAdmin should be false when role_id 9 is absent', () => {
    userRoleList.set([{ role_id: 2 }, { role_id: 3 }]);
    expect(service.isAdmin()).toBe(false);
  });

  it('isAdmin should be false for MEL Regional Expert (10) alone', () => {
    userRoleList.set([{ role_id: 10 }]);
    expect(service.isAdmin()).toBe(false);
  });

  it('isMelRegionalExpert should be true when role_id 10 is present', () => {
    userRoleList.set([{ role_id: 10 }]);
    expect(service.isMelRegionalExpert()).toBe(true);
  });

  it('isMelRegionalExpert should be false without role_id 10', () => {
    userRoleList.set([{ role_id: 1 }, { role_id: 9 }]);
    expect(service.isMelRegionalExpert()).toBe(false);
  });

  it('canEditAnyResult should be true for System Admin (1), Center Admin (9), or MEL Regional Expert (10)', () => {
    userRoleList.set([{ role_id: 1 }]);
    expect(service.canEditAnyResult()).toBe(true);
    userRoleList.set([{ role_id: 9 }]);
    expect(service.canEditAnyResult()).toBe(true);
    userRoleList.set([{ role_id: 10 }]);
    expect(service.canEditAnyResult()).toBe(true);
  });

  it('canEditAnyResult should be false without roles 1, 9, or 10', () => {
    userRoleList.set([{ role_id: 2 }, { role_id: 3 }]);
    expect(service.canEditAnyResult()).toBe(false);
  });

  it('canAccessCenterAdmin should be true for super admin (1) or center admin (9) with focus 1 and sec_role_id 9', () => {
    userRoleList.set([{ role_id: 1 }]);
    expect(service.canAccessCenterAdmin()).toBe(true);
    userRoleList.set([{ role_id: 9, role: { focus_id: 1, sec_role_id: 9 } }]);
    expect(service.canAccessCenterAdmin()).toBe(true);
  });

  it('canAccessCenterAdmin should be false for MEL Regional Expert (10) even with center-admin-like focus/sec', () => {
    userRoleList.set([{ role_id: 10, role: { focus_id: 1, sec_role_id: 9 } }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
  });

  it('canAccessCenterAdmin should be false without super admin or matching focus_id and sec_role_id', () => {
    userRoleList.set([{ role_id: 2 }, { role_id: 8 }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
    userRoleList.set([{ role_id: 9, role: { focus_id: 2, sec_role_id: 9 } }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
    userRoleList.set([{ role_id: 9, role: { focus_id: 1, sec_role_id: 8 } }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
    userRoleList.set([{ role_id: 9 }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
  });

  it('canAccessCenterAdmin should be false when focus matches but sec_role_id is missing', () => {
    userRoleList.set([{ role_id: 9, role: { focus_id: 1 } }]);
    expect(service.canAccessCenterAdmin()).toBe(false);
  });

  it('canAccessCenterAdmin should evaluate non-super-admin entries when first entry is not a match', () => {
    userRoleList.set([{ role_id: 2 }, { role_id: 9, role: { focus_id: 1, sec_role_id: 9 } }]);
    expect(service.canAccessCenterAdmin()).toBe(true);
  });

  it('canEditOicr should be true when not editing (regardless of admin)', () => {
    editingOicr = false;
    userRoleList.set([{ role_id: 3 }]);
    expect(service.canEditOicr()).toBe(true);

    userRoleList.set([{ role_id: 9 }]);
    expect(service.canEditOicr()).toBe(true);
  });

  it('canEditOicr should be true when editing and user is admin, center admin, or MEL Regional Expert', () => {
    editingOicr = true;
    userRoleList.set([{ role_id: 1 }]);
    expect(service.canEditOicr()).toBe(true);
    userRoleList.set([{ role_id: 9 }]);
    expect(service.canEditOicr()).toBe(true);
    userRoleList.set([{ role_id: 10 }]);
    expect(service.canEditOicr()).toBe(true);
  });

  it('canEditOicr should be false when editing and user has no OICR edit role', () => {
    editingOicr = true;
    userRoleList.set([{ role_id: 2 }]);
    expect(service.canEditOicr()).toBe(false);
  });

  it('canAccessAppConfiguration should be true for System Admin (1) or Technical Support (7)', () => {
    userRoleList.set([{ role_id: 1 }]);
    expect(service.canAccessAppConfiguration()).toBe(true);

    userRoleList.set([{ role_id: 7 }]);
    expect(service.canAccessAppConfiguration()).toBe(true);
  });

  it('canAccessAppConfiguration should be false without roles 1 or 7', () => {
    userRoleList.set([{ role_id: 9 }, { role_id: 10 }]);
    expect(service.canAccessAppConfiguration()).toBe(false);
  });

  it('canEditAppConfiguration should mirror canAccessAppConfiguration', () => {
    userRoleList.set([{ role_id: 7 }]);
    expect(service.canEditAppConfiguration()).toBe(true);

    userRoleList.set([]);
    expect(service.canEditAppConfiguration()).toBe(false);
  });
});
