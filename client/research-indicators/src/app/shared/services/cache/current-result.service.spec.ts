import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CurrentResultService } from './current-result.service';
import { ApiService } from '../api.service';
import { AllModalsService } from './all-modals.service';
import { CacheService } from './cache.service';
import { CreateResultManagementService } from '../../components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { GetMetadata } from '../../interfaces/get-metadata.interface';

describe('CurrentResultService', () => {
  let service: CurrentResultService;
  let mockApi: jest.Mocked<ApiService>;
  let mockAllModals: jest.Mocked<AllModalsService>;
  let mockCache: jest.Mocked<CacheService>;
  let mockCreateResultManagement: jest.Mocked<CreateResultManagementService>;

  const signalMock = () => ({ set: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApi = {
      GET_OICRModal: jest.fn()
    } as any;

    mockAllModals = {
      openModal: jest.fn()
    } as any;

    mockCache = {
      currentResultId: signalMock() as any
    } as any;

    mockCreateResultManagement = {
      currentRequestedResultCode: signalMock() as any,
      editingOicr: signalMock() as any,
      createOicrBody: signalMock() as any,
      resultPageStep: signalMock() as any,
      modalTitle: signalMock() as any,
      contractId: signalMock() as any,
      resultTitle: signalMock() as any,
      statusId: signalMock() as any,
      setResultCreationEntryContext: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        CurrentResultService,
        { provide: ApiService, useValue: mockApi },
        { provide: AllModalsService, useValue: mockAllModals },
        { provide: CacheService, useValue: mockCache },
        { provide: CreateResultManagementService, useValue: mockCreateResultManagement }
      ]
    });
    service = TestBed.inject(CurrentResultService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateOpenResult', () => {
    it('should return true when indicatorId is 5', () => {
      expect(service.validateOpenResult(5, 1)).toBe(true);
    });

    it('should return true when resultStatusId is 9', () => {
      expect(service.validateOpenResult(1, 9)).toBe(true);
    });

    it('should return true when both indicatorId is 5 and resultStatusId is 9', () => {
      expect(service.validateOpenResult(5, 9)).toBe(true);
    });

    it('should return false when indicatorId is not 5 and resultStatusId is not 9', () => {
      expect(service.validateOpenResult(1, 1)).toBe(false);
    });

    it('should return false when indicatorId is 0 and resultStatusId is 0', () => {
      expect(service.validateOpenResult(0, 0)).toBe(false);
    });

    it('should return false when indicatorId is -1 and resultStatusId is -1', () => {
      expect(service.validateOpenResult(-1, -1)).toBe(false);
    });
  });

  describe('openEditRequestdOicrsModal', () => {
    it('should return false when validation fails (indicatorId not 5 and resultStatusId not 9)', async () => {
      const result = await service.openEditRequestdOicrsModal(1, 1, 123);
      
      expect(result).toBe(false);
      expect(mockApi.GET_OICRModal).not.toHaveBeenCalled();
      expect(mockAllModals.openModal).not.toHaveBeenCalled();
      expect(mockCreateResultManagement.currentRequestedResultCode.set).not.toHaveBeenCalled();
      expect(mockCreateResultManagement.editingOicr.set).not.toHaveBeenCalled();
      expect(mockCache.currentResultId.set).not.toHaveBeenCalled();
    });

    it('should return false when validation fails with indicatorId 0', async () => {
      const result = await service.openEditRequestdOicrsModal(0, 1, 123);
      
      expect(result).toBe(false);
      expect(mockApi.GET_OICRModal).not.toHaveBeenCalled();
    });

    it('should return false when validation fails with resultStatusId 0', async () => {
      const result = await service.openEditRequestdOicrsModal(1, 0, 123);
      
      expect(result).toBe(false);
      expect(mockApi.GET_OICRModal).not.toHaveBeenCalled();
    });

    it('should call setResultCreationEntryContext when a creation entry context is provided', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'x' },
        base_information: { contract_id: 'C-1', title: 'T' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 1, 456, 'results-center');

      expect(mockCreateResultManagement.setResultCreationEntryContext).toHaveBeenCalledWith('results-center');
    });

    it('should successfully open modal when indicatorId is 5', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'existing comment' },
        base_information: { contract_id: 'C-123', title: 'Test Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      const result = await service.openEditRequestdOicrsModal(5, 1, 456);

      expect(result).toBe(true);
      expect(mockApi.GET_OICRModal).toHaveBeenCalledWith(456);
      expect(mockCreateResultManagement.currentRequestedResultCode.set).toHaveBeenCalledWith(456);
      expect(mockCreateResultManagement.editingOicr.set).toHaveBeenCalledWith(true);
      expect(mockAllModals.openModal).toHaveBeenCalledWith('createResult');
      expect(mockCreateResultManagement.resultPageStep.set).toHaveBeenCalledWith(2);
      expect(mockCreateResultManagement.modalTitle.set).toHaveBeenCalledWith('Outcome Impact Case Report (OICR)');
      expect(mockCreateResultManagement.contractId.set).toHaveBeenCalledWith('C-123');
      expect(mockCreateResultManagement.resultTitle.set).toHaveBeenCalledWith('Test Title');
      expect(mockCreateResultManagement.statusId.set).toHaveBeenCalledWith(1);
      expect(mockCache.currentResultId.set).toHaveBeenCalledWith(456);
    });

    it('should successfully open modal when resultStatusId is 9', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'another comment' },
        base_information: { contract_id: 'C-789', title: 'Another Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      const result = await service.openEditRequestdOicrsModal(1, 9, 789);

      expect(result).toBe(true);
      expect(mockApi.GET_OICRModal).toHaveBeenCalledWith(789);
      expect(mockCreateResultManagement.statusId.set).toHaveBeenCalledWith(9);
    });

    it('should set empty string for comment_geo_scope when undefined', async () => {
      const responseData = {
        step_three: { comment_geo_scope: undefined },
        base_information: { contract_id: 'C-456', title: 'Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 1, 123);

      expect(mockCreateResultManagement.createOicrBody.set).toHaveBeenCalledWith({
        step_three: { comment_geo_scope: '', countries: [], regions: [], geo_scope_id: undefined },
        base_information: { contract_id: 'C-456', title: 'Title' }
      });
    });

    it('should set empty string for comment_geo_scope when null', async () => {
      const responseData = {
        step_three: { comment_geo_scope: null },
        base_information: { contract_id: 'C-456', title: 'Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 1, 123);

      expect(mockCreateResultManagement.createOicrBody.set).toHaveBeenCalledWith({
        step_three: { comment_geo_scope: '', countries: [], regions: [], geo_scope_id: undefined },
        base_information: { contract_id: 'C-456', title: 'Title' }
      });
    });

    it('should preserve existing comment_geo_scope when it has a value', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'existing comment' },
        base_information: { contract_id: 'C-456', title: 'Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 1, 123);

      expect(mockCreateResultManagement.createOicrBody.set).toHaveBeenCalledWith({
        step_three: { comment_geo_scope: 'existing comment', countries: [], regions: [], geo_scope_id: undefined },
        base_information: { contract_id: 'C-456', title: 'Title' }
      });
    });

    it('should handle API call with different resultCode values', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'test' },
        base_information: { contract_id: 'C-999', title: 'Test Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 1, 999);

      expect(mockApi.GET_OICRModal).toHaveBeenCalledWith(999);
      expect(mockCreateResultManagement.currentRequestedResultCode.set).toHaveBeenCalledWith(999);
      expect(mockCache.currentResultId.set).toHaveBeenCalledWith(999);
    });

    it('should handle different statusId values', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'test' },
        base_information: { contract_id: 'C-123', title: 'Test Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      await service.openEditRequestdOicrsModal(5, 3, 123);

      expect(mockCreateResultManagement.statusId.set).toHaveBeenCalledWith(3);
    });

    it('should handle edge case with resultCode 0', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'test' },
        base_information: { contract_id: 'C-0', title: 'Test Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      const result = await service.openEditRequestdOicrsModal(5, 1, 0);

      expect(result).toBe(true);
      expect(mockApi.GET_OICRModal).toHaveBeenCalledWith(0);
      expect(mockCreateResultManagement.currentRequestedResultCode.set).toHaveBeenCalledWith(0);
      expect(mockCache.currentResultId.set).toHaveBeenCalledWith(0);
    });

    it('should handle edge case with resultCode -1', async () => {
      const responseData = {
        step_three: { comment_geo_scope: 'test' },
        base_information: { contract_id: 'C--1', title: 'Test Title' }
      };
      mockApi.GET_OICRModal.mockResolvedValueOnce({ data: responseData });

      const result = await service.openEditRequestdOicrsModal(5, 1, -1);

      expect(result).toBe(true);
      expect(mockApi.GET_OICRModal).toHaveBeenCalledWith(-1);
      expect(mockCreateResultManagement.currentRequestedResultCode.set).toHaveBeenCalledWith(-1);
      expect(mockCache.currentResultId.set).toHaveBeenCalledWith(-1);
    });
  });

  describe('isCurrentUserOwner', () => {
    let currentMetadataSignal: ReturnType<typeof signal<GetMetadata>>;
    let isMyResultSignal: ReturnType<typeof signal<boolean>>;
    let ownerService: CurrentResultService;

    beforeEach(() => {
      currentMetadataSignal = signal<GetMetadata>({});
      isMyResultSignal = signal<boolean>(false);

      const reactiveCache = {
        currentResultId: signalMock() as any,
        currentMetadata: currentMetadataSignal,
        isMyResult: isMyResultSignal
      } as any;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CurrentResultService,
          { provide: ApiService, useValue: mockApi },
          { provide: AllModalsService, useValue: mockAllModals },
          { provide: CacheService, useValue: reactiveCache },
          { provide: CreateResultManagementService, useValue: mockCreateResultManagement }
        ]
      });
      ownerService = TestBed.inject(CurrentResultService);
    });

    it('returns false when there is no metadata and the user matches no owner field', () => {
      currentMetadataSignal.set({});
      isMyResultSignal.set(false);

      expect(ownerService.isCurrentUserOwner()).toBe(false);
    });

    it('returns true when the current user is the creator (isMyResult)', () => {
      currentMetadataSignal.set({ is_principal_investigator: false, is_main_contact_person: false });
      isMyResultSignal.set(true);

      expect(ownerService.isCurrentUserOwner()).toBe(true);
    });

    it('returns true when the current user is the principal investigator', () => {
      currentMetadataSignal.set({ is_principal_investigator: true, is_main_contact_person: false });
      isMyResultSignal.set(false);

      expect(ownerService.isCurrentUserOwner()).toBe(true);
    });

    it('returns true when the current user is the main contact person', () => {
      currentMetadataSignal.set({ is_principal_investigator: false, is_main_contact_person: true });
      isMyResultSignal.set(false);

      expect(ownerService.isCurrentUserOwner()).toBe(true);
    });

    it('returns false when the user matches none of creator, PI, or contact', () => {
      currentMetadataSignal.set({ is_principal_investigator: false, is_main_contact_person: false });
      isMyResultSignal.set(false);

      expect(ownerService.isCurrentUserOwner()).toBe(false);
    });
  });
});