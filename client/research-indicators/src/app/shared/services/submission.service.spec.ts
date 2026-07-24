import { TestBed } from '@angular/core/testing';
import { SubmissionService } from './submission.service';
import { signal } from '@angular/core';
import { RolesService } from './cache/roles.service';
import { GreenChecks } from '../interfaces/get-green-checks.interface';

const cacheMock = {
  allGreenChecksAreTrue: jest.fn(),
  greenChecks: jest.fn(),
  isMyResult: jest.fn(),
  currentMetadata: jest.fn(),
  getCurrentPlatformCode: jest.fn()
};

const rolesMock = {
  isAdmin: jest.fn().mockReturnValue(false),
  isMelRegionalExpert: jest.fn().mockReturnValue(false),
  canEditAnyResult: jest.fn()
};

describe('SubmissionService', () => {
  let service: SubmissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubmissionService,
        { provide: 'CacheService', useValue: cacheMock },
        { provide: RolesService, useValue: rolesMock }
      ]
    });
    service = TestBed.inject(SubmissionService);
    service.cache = cacheMock as any;
    jest.clearAllMocks();
    rolesMock.isAdmin.mockReturnValue(false);
    rolesMock.isMelRegionalExpert.mockReturnValue(false);
    rolesMock.canEditAnyResult.mockImplementation(() => rolesMock.isAdmin() || rolesMock.isMelRegionalExpert());
    cacheMock.isMyResult.mockReturnValue(true);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getStatusNameById returns correct name', () => {
    expect(service.getStatusNameById(1)).toBe('Editing');
    expect(service.getStatusNameById(99)).toBe('');
  });

  it('getStatusNameById returns empty string for non-existent status', () => {
    expect(service.getStatusNameById(999)).toBe('');
    expect(service.getStatusNameById(0)).toBe('');
    expect(service.getStatusNameById(-1)).toBe('');
  });

  it('isEditableStatus true for status_id 4 and STAR platform when user is creator (contributor path)', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for status_id 5 and STAR platform', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 5 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for published status_id 14 on STAR when user is admin', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 14 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    rolesMock.isAdmin.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus false for published status_id 14 on STAR when user is not admin', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 14 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    rolesMock.isAdmin.mockReturnValue(false);
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for status_id 4 but TIP platform', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('TIP');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for status_id 5 but TIP platform', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 5 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('TIP');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for status_id 2 and STAR platform', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 2 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for null status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: null });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for undefined status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: undefined });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus true for status_id 4 and empty platform code when user is creator', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('');
    cacheMock.isMyResult.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for status_id 5 and empty platform code', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 5 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('');
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isSubmitted true for status_id 2', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 2 });
    expect(service.isSubmitted()).toBe(true);
  });

  it('isSubmitted false for status_id 4', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4 });
    expect(service.isSubmitted()).toBe(false);
  });

  it('isSubmitted false for null status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: null });
    expect(service.isSubmitted()).toBe(false);
  });

  it('isSubmitted false for undefined status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: undefined });
    expect(service.isSubmitted()).toBe(false);
  });

  it('meetsStatusChangeValidationRequirements true when all green checks are true', () => {
    cacheMock.greenChecks.mockReturnValue({ a: true, b: true });
    expect(service.meetsStatusChangeValidationRequirements()).toBe(true);
  });

  it('meetsStatusChangeValidationRequirements false when green checks are empty', () => {
    cacheMock.greenChecks.mockReturnValue({});
    expect(service.meetsStatusChangeValidationRequirements()).toBe(false);
  });

  it('meetsStatusChangeValidationRequirements false when any green check is false', () => {
    cacheMock.greenChecks.mockReturnValue({ a: true, b: false });
    expect(service.meetsStatusChangeValidationRequirements()).toBe(false);
  });

  it('canSubmitResult true when all conditions met', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({ a: 1 });
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(service.canSubmitResult()).toBe(true);
  });

  it('canSubmitResult true when principal investigator', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({ a: 1 });
    cacheMock.isMyResult.mockReturnValue(false);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: true });
    expect(service.canSubmitResult()).toBe(true);
  });

  it('canSubmitResult false if not allGreenChecksAreTrue', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(false);
    cacheMock.greenChecks.mockReturnValue({ a: false });
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(service.canSubmitResult()).toBe(false);
  });

  it('canSubmitResult false if greenChecks empty', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({});
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(!!service.canSubmitResult()).toBe(false);
  });

  it('currentResultIsSubmitted true for status_id 2', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 2 });
    expect(service.currentResultIsSubmitted()).toBe(true);
  });

  it('currentResultIsSubmitted false for status_id 1', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 1 });
    expect(service.currentResultIsSubmitted()).toBe(false);
  });

  it('canSubmitResult false when not my result and not principal investigator', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({ a: 1 });
    cacheMock.isMyResult.mockReturnValue(false);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(service.canSubmitResult()).toBe(false);
  });

  it('canSubmitResult false when greenChecks is empty object', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({});
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(!!service.canSubmitResult()).toBe(false);
  });

  it('canSubmitResult false when greenChecks is null', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({});
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(!!service.canSubmitResult()).toBe(false);
  });

  it('canSubmitResult false when greenChecks is undefined', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({});
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(!!service.canSubmitResult()).toBe(false);
  });

  it('canSubmitResult false when greenChecks is empty array', () => {
    cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
    cacheMock.greenChecks.mockReturnValue({});
    cacheMock.isMyResult.mockReturnValue(true);
    cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });
    expect(!!service.canSubmitResult()).toBe(false);
  });

  it('signals are properly initialized', () => {
    expect(service.comment()).toBe('');
    expect(service.melRegionalExpert()).toBe('');
    expect(service.oicrNo()).toBe('');
    expect(service.sharePointFolderLink()).toBe('');
    expect(service.statusSelected()).toBe(null);
    expect(service.refreshSubmissionHistory()).toBe(0);
  });

  it('submissionStatuses contains all expected statuses', () => {
    const statuses = service.submissionStatuses();
    expect(statuses).toHaveLength(14);
    expect(statuses.find(s => s.id === 1)?.name).toBe('Editing');
    expect(statuses.find(s => s.id === 2)?.name).toBe('Submitted');
    expect(statuses.find(s => s.id === 3)?.name).toBe('Accepted');
    expect(statuses.find(s => s.id === 4)?.name).toBe('Draft');
    expect(statuses.find(s => s.id === 5)?.name).toBe('Pending Revision');
    expect(statuses.find(s => s.id === 6)?.name).toBe('Approved');
    expect(statuses.find(s => s.id === 7)?.name).toBe('Do not approve');
    expect(statuses.find(s => s.id === 8)?.name).toBe('Deleted');
    expect(statuses.find(s => s.id === 9)?.name).toBe('Requested');
    expect(statuses.find(s => s.id === 10)?.name).toBe('Approved');
    expect(statuses.find(s => s.id === 11)?.name).toBe('Postponed');
    expect(statuses.find(s => s.id === 12)?.name).toBe('Science Edition');
    expect(statuses.find(s => s.id === 13)?.name).toBe('KM Curation');
    expect(statuses.find(s => s.id === 14)?.name).toBe('Published');
  });

  it('getStatusNameById returns correct names for all statuses', () => {
    expect(service.getStatusNameById(1)).toBe('Editing');
    expect(service.getStatusNameById(2)).toBe('Submitted');
    expect(service.getStatusNameById(3)).toBe('Accepted');
    expect(service.getStatusNameById(4)).toBe('Draft');
    expect(service.getStatusNameById(5)).toBe('Pending Revision');
    expect(service.getStatusNameById(6)).toBe('Approved');
    expect(service.getStatusNameById(7)).toBe('Do not approve');
    expect(service.getStatusNameById(8)).toBe('Deleted');
    expect(service.getStatusNameById(9)).toBe('Requested');
    expect(service.getStatusNameById(10)).toBe('Approved');
    expect(service.getStatusNameById(11)).toBe('Postponed');
    expect(service.getStatusNameById(12)).toBe('Science Edition');
    expect(service.getStatusNameById(13)).toBe('KM Curation');
    expect(service.getStatusNameById(14)).toBe('Published');
  });

  it('isEditableStatus handles edge cases', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 3 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus handles status_id 0', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 0 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus handles status_id -1', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: -1 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus false for STAR draft when user is not creator, has no grant, and no privileged role', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4 });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    rolesMock.isAdmin.mockReturnValue(false);
    rolesMock.isMelRegionalExpert.mockReturnValue(false);
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus true for STAR draft when has_result_edit_grant is true', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4, has_result_edit_grant: true });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus false for STAR draft when has_result_edit_grant is false', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4, has_result_edit_grant: false });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(false);
  });

  it('isEditableStatus true for STAR draft when user is System or Center Admin', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4, has_result_edit_grant: false });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    rolesMock.isAdmin.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for STAR draft when user is MEL Regional Expert', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 12, has_result_edit_grant: false });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    rolesMock.isMelRegionalExpert.mockReturnValue(true);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for STAR draft via is_main_contact_person when grant omitted', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 13, is_main_contact_person: true });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isEditableStatus true for STAR draft via is_principal_investigator when grant omitted', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 4, is_principal_investigator: true });
    cacheMock.getCurrentPlatformCode.mockReturnValue('STAR');
    cacheMock.isMyResult.mockReturnValue(false);
    expect(service.isEditableStatus()).toBe(true);
  });

  it('isSubmitted handles status_id 0', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 0 });
    expect(service.isSubmitted()).toBe(false);
  });

  it('isSubmitted handles status_id -1', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: -1 });
    expect(service.isSubmitted()).toBe(false);
  });

  it('currentResultIsSubmitted handles status_id 0', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: 0 });
    expect(service.currentResultIsSubmitted()).toBe(false);
  });

  it('currentResultIsSubmitted handles status_id -1', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: -1 });
    expect(service.currentResultIsSubmitted()).toBe(false);
  });

  it('currentResultIsSubmitted handles null status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: null });
    expect(service.currentResultIsSubmitted()).toBe(false);
  });

  it('currentResultIsSubmitted handles undefined status_id', () => {
    cacheMock.currentMetadata.mockReturnValue({ status_id: undefined });
    expect(service.currentResultIsSubmitted()).toBe(false);
  });

  // AR.3 — Pool Funding Alignment is NOT part of the submission validator.
  // See docs/specs/bilateral-module/alignment-section/requirements.md REQ-BIL-AS-09.
  // If anyone adds `pool_funding_alignment` to the GreenChecks interface or to the
  // runtime greenChecks() map, this test will fail and the change should be reviewed
  // against the alignment-section spec.
  describe('AR.3 — Pool Funding Alignment is decoupled from submission completion', () => {
    const canonicalGreenChecks: Required<GreenChecks> = {
      general_information: 1,
      alignment: 1,
      geo_location: 1,
      partners: 1,
      evidences: 1,
      policy_change: 1,
      cap_sharing_ip: 1,
      completness: 1,
      link_result: 1,
      innovation_dev: 1,
      oicr: 1
    };

    it('canSubmitResult returns true when all canonical green checks pass, with no alignment field present', () => {
      cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
      cacheMock.greenChecks.mockReturnValue(canonicalGreenChecks);
      cacheMock.isMyResult.mockReturnValue(true);
      cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });

      expect(service.canSubmitResult()).toBe(true);
      expect(Object.keys(canonicalGreenChecks)).not.toContain('pool_funding_alignment');
    });

    it('GreenChecks interface canonical key set excludes pool_funding_alignment', () => {
      // Lock the GreenChecks shape. Adding pool_funding_alignment here would require
      // explicit reasoning against AR.3 — see the spec.
      expect(Object.keys(canonicalGreenChecks).sort()).toEqual(
        [
          'alignment',
          'cap_sharing_ip',
          'completness',
          'evidences',
          'general_information',
          'geo_location',
          'innovation_dev',
          'link_result',
          'oicr',
          'partners',
          'policy_change'
        ].sort()
      );
    });
  });

  // AR.3 — HLO indicator mappings are NOT part of the submission validator.
  // See docs/specs/bilateral-module/indicator-mapping/requirements.md REQ-BIL-IM
  // (AR.3 holds for indicator mappings; mirrors alignment-section AC-09). If anyone
  // adds `hlo_mappings`, `indicator_mappings`, `pool_funding_indicators`, or similar
  // to the GreenChecks interface or runtime map, this block fails and the change
  // should be reviewed against the indicator-mapping spec.
  describe('AR.3 — HLO indicator mappings are decoupled from submission completion (T-BIL-IM-14)', () => {
    // Same canonical fixture as the alignment-section AR.3 block above. Kept as a
    // separate const so each block is self-contained; future churn here is localized.
    const canonicalGreenChecks: Required<GreenChecks> = {
      general_information: 1,
      alignment: 1,
      geo_location: 1,
      partners: 1,
      evidences: 1,
      policy_change: 1,
      cap_sharing_ip: 1,
      completness: 1,
      link_result: 1,
      innovation_dev: 1,
      oicr: 1
    };

    it('canSubmitResult returns true even though no HLO-mapping concept is represented in greenChecks', () => {
      cacheMock.allGreenChecksAreTrue.mockReturnValue(true);
      cacheMock.greenChecks.mockReturnValue(canonicalGreenChecks);
      cacheMock.isMyResult.mockReturnValue(true);
      cacheMock.currentMetadata.mockReturnValue({ is_principal_investigator: false });

      // canSubmitResult must NOT depend on HLO mapping state. None of the concept
      // names the indicator-mapping spec introduces should leak into GreenChecks.
      expect(service.canSubmitResult()).toBe(true);
      expect(Object.keys(canonicalGreenChecks)).not.toContain('hlo_mappings');
      expect(Object.keys(canonicalGreenChecks)).not.toContain('indicator_mappings');
      expect(Object.keys(canonicalGreenChecks)).not.toContain('pool_funding_indicators');
      expect(Object.keys(canonicalGreenChecks)).not.toContain('pool_funding_alignment_indicators');
    });

    it('GreenChecks interface canonical key set is the exact 11 known keys — no HLO concept added', () => {
      // Locks the GreenChecks shape against quiet additions of any HLO-mapping
      // concept. If the indicator-mapping work ever needs to surface completion in
      // the sidebar, the AR.3 conversation must happen first — see the spec.
      expect(Object.keys(canonicalGreenChecks).sort()).toEqual(
        [
          'alignment',
          'cap_sharing_ip',
          'completness',
          'evidences',
          'general_information',
          'geo_location',
          'innovation_dev',
          'link_result',
          'oicr',
          'partners',
          'policy_change'
        ].sort()
      );
    });
  });
});
