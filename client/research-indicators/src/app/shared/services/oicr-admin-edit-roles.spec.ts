import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SubmissionService } from './submission.service';
import { RolesService } from './cache/roles.service';
import { CacheService } from './cache/cache.service';
import { CreateResultManagementService } from '../components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

// Owner 2026-10-26/27: "Edit all OICR metadata" on a Postponed (11), Not Accepted (15) or Published (14) OICR is for the
// two admin roles, System Admin (1) AND Center Admin (9), and nobody else. Both the modal button and
// the full form's editability go through RolesService.isAdmin(); here the REAL RolesService decides,
// with each role on its own, so a role mapping change cannot slip past mocked `isAdmin` stubs.

const ROLES = {
  'System Admin': 1,
  'Center Admin': 9,
  Contributor: 3,
  'Technical Support': 7,
  'Mel Regional Expert': 10
} as const;

function setup(roleId: number, statusId: number) {
  const metadata = signal<Record<string, unknown>>({ status_id: statusId });
  const cache = {
    dataCache: signal({ user: { user_role_list: [{ role_id: roleId }] } }),
    currentMetadata: metadata,
    isExternalResult: () => false,
    getCurrentPlatformCode: () => 'STAR',
    isMyResult: () => false
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      RolesService,
      SubmissionService,
      { provide: CacheService, useValue: cache },
      { provide: CreateResultManagementService, useValue: {} }
    ]
  });
  return { roles: TestBed.inject(RolesService), submission: TestBed.inject(SubmissionService) };
}

describe('OICR full edit on Postponed / Not Accepted / Published: both admins, nobody else', () => {
  it.each([
    ['System Admin', true],
    ['Center Admin', true],
    ['Contributor', false],
    ['Technical Support', false],
    ['Mel Regional Expert', false]
  ] as const)('%s -> admin %p', (role, expected) => {
    expect(setup(ROLES[role], 11).roles.isAdmin()).toBe(expected);
  });

  it.each([
    ['System Admin', 11, true],
    ['Center Admin', 11, true],
    ['Contributor', 11, false],
    ['Technical Support', 11, false],
    ['Mel Regional Expert', 11, false],
    ['System Admin', 15, true],
    ['Center Admin', 15, true],
    ['Contributor', 15, false],
    ['Technical Support', 15, false],
    ['Mel Regional Expert', 15, false],
    ['System Admin', 14, true],
    ['Center Admin', 14, true],
    ['Contributor', 14, false]
  ] as const)('%s can edit the full form of an OICR in status %p -> %p', (role, statusId, expected) => {
    expect(setup(ROLES[role], statusId).submission.isEditableStatus()).toBe(expected);
  });
});
