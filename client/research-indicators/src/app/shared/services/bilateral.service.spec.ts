import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BilateralService } from './bilateral.service';
import { ApiService } from './api.service';
import { RolesService } from './cache/roles.service';
import { CurrentResultService } from './cache/current-result.service';
import { FindContracts, FindContractsResponse } from '@shared/interfaces/find-contracts.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { PoolFundingTagPatchResponse } from '@interfaces/bilateral/agresso-contract.interface';
import {
  AlignmentResponse,
  BilateralTocCatalogResponse,
  PoolFundingSciencePrograms,
  SpAlignmentDraft
} from '@interfaces/bilateral/pool-funding-alignment.interface';
import { SAVED_TOC_ALIGNMENTS_FIXTURE, TOC_CATALOG_CAPSHARING_FIXTURE, TOC_CATALOG_TWO_SP_FIXTURE } from '../../testing/toc-catalog.fixture';

describe('BilateralService', () => {
  let service: BilateralService;
  let mockApi: {
    GET_FindContracts: jest.Mock;
    PATCH_PoolFundingTag: jest.Mock;
    GET_PoolFundingAlignment: jest.Mock;
    PATCH_PoolFundingAlignment: jest.Mock;
    GET_PoolFundingSciencePrograms: jest.Mock;
    GET_PoolFundingHlosIndicators: jest.Mock;
  };
  let canAccessCenterAdminSignal: ReturnType<typeof signal<boolean>>;
  let isCurrentUserOwnerSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    mockApi = {
      GET_FindContracts: jest.fn(),
      PATCH_PoolFundingTag: jest.fn(),
      GET_PoolFundingAlignment: jest.fn(),
      PATCH_PoolFundingAlignment: jest.fn(),
      GET_PoolFundingSciencePrograms: jest.fn(),
      GET_PoolFundingHlosIndicators: jest.fn()
    };
    canAccessCenterAdminSignal = signal<boolean>(false);
    isCurrentUserOwnerSignal = signal<boolean>(false);
    TestBed.configureTestingModule({
      providers: [
        BilateralService,
        { provide: ApiService, useValue: mockApi },
        { provide: RolesService, useValue: { canAccessCenterAdmin: canAccessCenterAdminSignal } },
        { provide: CurrentResultService, useValue: { isCurrentUserOwner: isCurrentUserOwnerSignal } }
      ]
    });
    service = TestBed.inject(BilateralService);
  });

  const ok = <T>(data: T, overrides: Partial<MainResponse<T>> = {}): MainResponse<T> =>
    ({
      data,
      status: 200,
      description: 'OK',
      timestamp: '',
      path: '',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' },
      ...overrides
    }) as MainResponse<T>;

  const err = <T>(status: number, description: string, data: T): MainResponse<T> =>
    ({
      data,
      status,
      description: 'error',
      timestamp: '',
      path: '',
      successfulRequest: false,
      errorDetail: { errors: '', detail: '', description }
    }) as MainResponse<T>;

  describe('getContract', () => {
    it('happy path — sets currentContract, returns the first row, toggles loadingContract', async () => {
      const row: FindContracts = {
        agreement_id: 'AC-1594',
        is_pool_funding_contributor: true,
        funding_type: 'Bilateral'
      };
      const response = ok<FindContractsResponse>({
        data: [row],
        metadata: { total: 1, page: 1, limit: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      });
      let loadingDuringCall = false;
      mockApi.GET_FindContracts.mockImplementation(() => {
        loadingDuringCall = service.loadingContract();
        return Promise.resolve(response);
      });

      const result = await service.getContract('AC-1594');

      expect(loadingDuringCall).toBe(true);
      expect(service.loadingContract()).toBe(false);
      expect(service.currentContract()).toEqual(row);
      expect(result).toEqual(row);
      expect(mockApi.GET_FindContracts).toHaveBeenCalledWith({ 'contract-code': 'AC-1594', limit: 1 });
    });

    it('empty result — returns null and sets currentContract to null', async () => {
      mockApi.GET_FindContracts.mockResolvedValue(
        ok<FindContractsResponse>({
          data: [],
          metadata: { total: 0, page: 1, limit: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
        })
      );

      const result = await service.getContract('nope');

      expect(result).toBeNull();
      expect(service.currentContract()).toBeNull();
      expect(service.loadingContract()).toBe(false);
    });

    it('unsuccessful request (404) — returns null and clears currentContract', async () => {
      mockApi.GET_FindContracts.mockResolvedValue(err<FindContractsResponse>(404, 'not found', undefined as unknown as FindContractsResponse));

      const result = await service.getContract('gone');

      expect(result).toBeNull();
      expect(service.currentContract()).toBeNull();
      expect(service.loadingContract()).toBe(false);
    });
  });

  describe('patchTag', () => {
    const seedContract = () => {
      const row: FindContracts = {
        agreement_id: 'AC-1594',
        is_pool_funding_contributor: false,
        funding_type: 'Bilateral'
      };
      service.currentContract.set(row);
      return row;
    };

    it('200 — returns ok:true, updates currentContract optimistically, toggles savingTag', async () => {
      seedContract();
      const data: PoolFundingTagPatchResponse = {
        agreement_id: 'AC-1594',
        is_pool_funding_contributor: true,
        updated_at: '2026-05-20T00:00:00.000Z'
      };
      let savingDuringCall = false;
      mockApi.PATCH_PoolFundingTag.mockImplementation(() => {
        savingDuringCall = service.savingTag();
        return Promise.resolve(ok<PoolFundingTagPatchResponse>(data));
      });

      const result = await service.patchTag('AC-1594', true);

      expect(savingDuringCall).toBe(true);
      expect(service.savingTag()).toBe(false);
      expect(result).toEqual({ ok: true, data });
      expect(service.currentContract()?.is_pool_funding_contributor).toBe(true);
      expect(mockApi.PATCH_PoolFundingTag).toHaveBeenCalledWith('AC-1594', { is_pool_funding_contributor: true });
    });

    it('400 with "bilateral" in errorDetail.description — returns ok:false, leaves currentContract unchanged', async () => {
      seedContract();
      mockApi.PATCH_PoolFundingTag.mockResolvedValue(
        err<PoolFundingTagPatchResponse>(
          400,
          'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.',
          undefined as unknown as PoolFundingTagPatchResponse
        )
      );

      const result = await service.patchTag('AC-NB', true);

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.'
      });
      expect(service.currentContract()?.is_pool_funding_contributor).toBe(false);
      expect(service.savingTag()).toBe(false);
    });

    it('500 — returns ok:false with status 500 and propagated description', async () => {
      mockApi.PATCH_PoolFundingTag.mockResolvedValue(
        err<PoolFundingTagPatchResponse>(500, 'Internal Server Error', undefined as unknown as PoolFundingTagPatchResponse)
      );

      const result = await service.patchTag('AC-1594', true);

      expect(result).toEqual({ ok: false, status: 500, description: 'Internal Server Error' });
      expect(service.savingTag()).toBe(false);
    });

    it('rejection — savingTag resets to false (defensive try/finally)', async () => {
      mockApi.PATCH_PoolFundingTag.mockRejectedValue(new Error('network down'));

      await expect(service.patchTag('AC-1594', true)).rejects.toThrow('network down');

      expect(service.savingTag()).toBe(false);
    });
  });

  describe('isBilateral', () => {
    it('true for AGRESSO bilateral codes (BLR, BILATERAL) with trim/case normalization', () => {
      expect(service.isBilateral({ funding_type: 'BLR' })).toBe(true);
      expect(service.isBilateral({ funding_type: ' blr ' })).toBe(true);
      expect(service.isBilateral({ funding_type: 'BILATERAL' })).toBe(true);
      expect(service.isBilateral({ funding_type: 'Bilateral' })).toBe(true);
    });

    it('false when funding_type is missing, pooled (POL), or other non-bilateral values', () => {
      expect(service.isBilateral(null)).toBe(false);
      expect(service.isBilateral(undefined)).toBe(false);
      expect(service.isBilateral({})).toBe(false);
      expect(service.isBilateral({ funding_type: 'POL' })).toBe(false);
      expect(service.isBilateral({ funding_type: 'Pool Funding' })).toBe(false);
      expect(service.isBilateral({ funding_type: 'mixed bilateral' })).toBe(false);
      expect(service.isBilateral({ funding_type: null })).toBe(false);
    });

    it('false when funding is bilateral but an active pooled-funding contract exists (backend parity)', () => {
      expect(
        service.isBilateral({
          funding_type: 'BLR',
          pooled_funding_contracts: [{ is_active: true }]
        })
      ).toBe(false);
    });

    it('true when pooled-funding rows exist but none are active', () => {
      expect(
        service.isBilateral({
          funding_type: 'BLR',
          pooled_funding_contracts: [{ is_active: false }]
        })
      ).toBe(true);
    });
  });

  describe('getAlignment', () => {
    const baseAlignment: AlignmentResponse = {
      result_code: 'RES-001',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'L1', lever_name: 'Lever 1' }],
      is_synced_to_prms: false,
      is_read_only: false
    };

    it('happy path — sets currentAlignment, toggles loadingAlignment true→false', async () => {
      let loadingDuringCall = false;
      mockApi.GET_PoolFundingAlignment.mockImplementation(() => {
        loadingDuringCall = service.loadingAlignment();
        return Promise.resolve(ok<AlignmentResponse>(baseAlignment));
      });

      const result = await service.getAlignment('RES-001');

      expect(loadingDuringCall).toBe(true);
      expect(service.loadingAlignment()).toBe(false);
      expect(service.currentAlignment()).toEqual(baseAlignment);
      expect(result).toEqual(baseAlignment);
      expect(mockApi.GET_PoolFundingAlignment).toHaveBeenCalledWith('RES-001');
    });

    it('404 — returns null and sets currentAlignment to null', async () => {
      mockApi.GET_PoolFundingAlignment.mockResolvedValue(
        err<AlignmentResponse>(404, 'not found', undefined as unknown as AlignmentResponse)
      );

      const result = await service.getAlignment('NONE');

      expect(result).toBeNull();
      expect(service.currentAlignment()).toBeNull();
      expect(service.loadingAlignment()).toBe(false);
    });

    it('rejection — loadingAlignment resets to false (defensive try/finally)', async () => {
      mockApi.GET_PoolFundingAlignment.mockRejectedValue(new Error('network down'));

      await expect(service.getAlignment('RES-001')).rejects.toThrow('network down');

      expect(service.loadingAlignment()).toBe(false);
    });
  });

  describe('getSciencePrograms (REQ-BIL-ASR-01)', () => {
    const mapped: PoolFundingSciencePrograms = {
      result_code: '19792',
      mapping_status: 'mapped',
      clarisa_project: { id: 1, short_name: 'T-PJ-003262-...' },
      science_programs: [
        { code: 'SP09', name: 'Scaling for Impact', category: 'Scaling programs', color: '#ec4899', icon_key: 'SP09', allocation: 25 },
        { code: 'SP10', name: 'Gender Equality and Inclusion', category: 'Accelerators', color: '#8b5cf6', icon_key: 'SP10', allocation: 75 }
      ]
    };

    it('mapped + SPs — sets sciencePrograms + mappingStatus, toggles loading, calls per-result endpoint with the numeric code', async () => {
      let loadingDuringCall = false;
      mockApi.GET_PoolFundingSciencePrograms.mockImplementation(() => {
        loadingDuringCall = service.loadingSciencePrograms();
        return Promise.resolve(ok<PoolFundingSciencePrograms>(mapped));
      });

      const result = await service.getSciencePrograms('STAR-19792');

      expect(loadingDuringCall).toBe(true);
      expect(service.loadingSciencePrograms()).toBe(false);
      expect(mockApi.GET_PoolFundingSciencePrograms).toHaveBeenCalledWith('STAR-19792');
      expect(service.mappingStatus()).toBe('mapped');
      expect(service.sciencePrograms()).toEqual(mapped.science_programs);
      expect(result).toEqual(mapped.science_programs);
    });

    it('unmapped — empty list + mappingStatus "unmapped" (no fallback to the 13-SP catalog, pitfall 1)', async () => {
      mockApi.GET_PoolFundingSciencePrograms.mockResolvedValue(
        ok<PoolFundingSciencePrograms>({
          result_code: '19792',
          mapping_status: 'unmapped',
          clarisa_project: null,
          science_programs: []
        })
      );

      const result = await service.getSciencePrograms('19792');

      expect(service.mappingStatus()).toBe('unmapped');
      expect(service.sciencePrograms()).toEqual([]);
      expect(result).toEqual([]);
    });

    it('mapped + empty list — keeps mappingStatus "mapped" with an empty list (distinct from unmapped)', async () => {
      mockApi.GET_PoolFundingSciencePrograms.mockResolvedValue(
        ok<PoolFundingSciencePrograms>({
          result_code: '19792',
          mapping_status: 'mapped',
          clarisa_project: { id: 1, short_name: 'T-PJ-003262-...' },
          science_programs: []
        })
      );

      await service.getSciencePrograms('19792');

      expect(service.mappingStatus()).toBe('mapped');
      expect(service.sciencePrograms()).toEqual([]);
    });

    it('unsuccessful request — clears list + status to null, no catalog fallback', async () => {
      mockApi.GET_PoolFundingSciencePrograms.mockResolvedValue(
        err<PoolFundingSciencePrograms>(404, 'not found', undefined as unknown as PoolFundingSciencePrograms)
      );

      const result = await service.getSciencePrograms('NONE');

      expect(service.sciencePrograms()).toEqual([]);
      expect(service.mappingStatus()).toBeNull();
      expect(result).toEqual([]);
      expect(service.loadingSciencePrograms()).toBe(false);
    });

    it('rejection — loadingSciencePrograms resets to false (defensive try/finally)', async () => {
      mockApi.GET_PoolFundingSciencePrograms.mockRejectedValue(new Error('network down'));

      await expect(service.getSciencePrograms('19792')).rejects.toThrow('network down');

      expect(service.loadingSciencePrograms()).toBe(false);
    });
  });

  describe('patchAlignment', () => {
    const successAlignment: AlignmentResponse = {
      result_code: 'RES-001',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'L1', lever_name: 'Lever 1' }],
      is_synced_to_prms: false,
      is_read_only: false
    };

    it('200 — returns ok:true and updates currentAlignment', async () => {
      let savingDuringCall = false;
      mockApi.PATCH_PoolFundingAlignment.mockImplementation(() => {
        savingDuringCall = service.savingAlignment();
        return Promise.resolve(ok<AlignmentResponse>(successAlignment));
      });

      const result = await service.patchAlignment('RES-001', { has_contribution: true, lever_codes: ['L1'] });

      expect(savingDuringCall).toBe(true);
      expect(service.savingAlignment()).toBe(false);
      expect(result).toEqual({ ok: true, data: successAlignment });
      expect(service.currentAlignment()).toEqual(successAlignment);
    });

    it('400 with structured field-keyed errors — returns ok:false with fieldErrors', async () => {
      const errorsJson = JSON.stringify({ has_contribution: 'must be true or false', lever_codes: 'at least one required' });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue({
        data: undefined,
        status: 400,
        description: 'error',
        timestamp: '',
        path: '',
        successfulRequest: false,
        errorDetail: { errors: errorsJson, detail: '', description: 'Validation failed' }
      } as MainResponse<AlignmentResponse>);

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'Validation failed',
        fieldErrors: { has_contribution: 'must be true or false', lever_codes: 'at least one required' }
      });
      expect(service.savingAlignment()).toBe(false);
    });

    it('400 without parseable field errors — returns ok:false with description, no fieldErrors', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(
        err<AlignmentResponse>(400, 'has_contribution must be set', undefined as unknown as AlignmentResponse)
      );

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'has_contribution must be set'
      });
      expect((result as { fieldErrors?: unknown }).fieldErrors).toBeUndefined();
    });

    it('REQ-BIL-ASR-03 — 400 with unknown_sp_codes as STRINGIFIED-JSON errors → unknownSpCodes populated', async () => {
      const errorsJson = JSON.stringify({ unknown_sp_codes: ['SP04', 'SP07'] });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue({
        data: undefined,
        status: 400,
        description: 'Validation failed',
        timestamp: '',
        path: '',
        successfulRequest: false,
        errorDetail: { errors: errorsJson, detail: '', description: 'Validation failed' }
      } as MainResponse<AlignmentResponse>);

      const result = await service.patchAlignment('RES-001', { has_contribution: true, sp_codes: ['SP04', 'SP07'] });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'Validation failed',
        unknownSpCodes: ['SP04', 'SP07']
      });
      // unknown_sp_codes is an array → NOT captured by the string-valued fieldErrors path.
      expect((result as { fieldErrors?: unknown }).fieldErrors).toBeUndefined();
    });

    it('REQ-BIL-ASR-03 — 400 with unknown_sp_codes as an OBJECT errors envelope → unknownSpCodes populated (tolerant of object shape)', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue({
        data: undefined,
        status: 400,
        description: 'Validation failed',
        timestamp: '',
        path: '',
        successfulRequest: false,
        // Live envelope may return `errors` as an object rather than stringified JSON.
        errorDetail: { errors: { unknown_sp_codes: ['SP09'] } as unknown as string, detail: '', description: 'Validation failed' }
      } as MainResponse<AlignmentResponse>);

      const result = await service.patchAlignment('RES-001', { has_contribution: true, sp_codes: ['SP09'] });

      expect((result as { unknownSpCodes?: string[] }).unknownSpCodes).toEqual(['SP09']);
    });

    it('REQ-BIL-ASR-03 — 400 with BOTH string-valued field errors and an unknown_sp_codes array → fieldErrors AND unknownSpCodes both surfaced (no regression)', async () => {
      const errorsJson = JSON.stringify({ has_contribution: 'must be true or false', unknown_sp_codes: ['SP04'] });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue({
        data: undefined,
        status: 400,
        description: 'Validation failed',
        timestamp: '',
        path: '',
        successfulRequest: false,
        errorDetail: { errors: errorsJson, detail: '', description: 'Validation failed' }
      } as MainResponse<AlignmentResponse>);

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'Validation failed',
        // string-valued path still works exactly as before…
        fieldErrors: { has_contribution: 'must be true or false' },
        // …and the array is carried separately.
        unknownSpCodes: ['SP04']
      });
    });

    it('REQ-BIL-ASR-03 — 400 whose unknown_sp_codes array has no valid string entries → no unknownSpCodes key', async () => {
      const errorsJson = JSON.stringify({ unknown_sp_codes: ['', 123, null] });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue({
        data: undefined,
        status: 400,
        description: 'Validation failed',
        timestamp: '',
        path: '',
        successfulRequest: false,
        errorDetail: { errors: errorsJson, detail: '', description: 'Validation failed' }
      } as MainResponse<AlignmentResponse>);

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect((result as { unknownSpCodes?: unknown }).unknownSpCodes).toBeUndefined();
    });

    it('409 — returns ok:false with status 409 (component handles refetch)', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(
        err<AlignmentResponse>(409, 'Result was synced to PRMS', undefined as unknown as AlignmentResponse)
      );

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({ ok: false, status: 409, description: 'Result was synced to PRMS' });
      expect(service.savingAlignment()).toBe(false);
    });

    it('500 — returns ok:false with status 500; global interceptor handles toast', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(
        err<AlignmentResponse>(500, 'Internal Server Error', undefined as unknown as AlignmentResponse)
      );

      const result = await service.patchAlignment('RES-001', { has_contribution: false });

      expect(result).toEqual({ ok: false, status: 500, description: 'Internal Server Error' });
      expect(service.savingAlignment()).toBe(false);
    });

    it('rejection — savingAlignment resets to false (defensive try/finally)', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockRejectedValue(new Error('network down'));

      await expect(service.patchAlignment('RES-001', { has_contribution: false })).rejects.toThrow('network down');

      expect(service.savingAlignment()).toBe(false);
    });
  });

  describe('editable computed', () => {
    const readOnlyFalse: AlignmentResponse = {
      result_code: 'RES-001',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: false,
      selected_levers: [],
      is_synced_to_prms: false,
      is_read_only: false
    };

    it('false when currentAlignment is null', () => {
      service.currentAlignment.set(null);
      canAccessCenterAdminSignal.set(true);
      isCurrentUserOwnerSignal.set(true);

      expect(service.editable()).toBe(false);
    });

    it('false when is_read_only is true (even for admin owner)', () => {
      service.currentAlignment.set({ ...readOnlyFalse, is_read_only: true });
      canAccessCenterAdminSignal.set(true);
      isCurrentUserOwnerSignal.set(true);

      expect(service.editable()).toBe(false);
    });

    it('true for admin / center admin (canAccessCenterAdmin=true) when not read-only', () => {
      service.currentAlignment.set(readOnlyFalse);
      canAccessCenterAdminSignal.set(true);
      isCurrentUserOwnerSignal.set(false);

      expect(service.editable()).toBe(true);
    });

    it('true for owner (isCurrentUserOwner=true) when not admin and not read-only', () => {
      service.currentAlignment.set(readOnlyFalse);
      canAccessCenterAdminSignal.set(false);
      isCurrentUserOwnerSignal.set(true);

      expect(service.editable()).toBe(true);
    });

    it('false when neither admin nor owner', () => {
      service.currentAlignment.set(readOnlyFalse);
      canAccessCenterAdminSignal.set(false);
      isCurrentUserOwnerSignal.set(false);

      expect(service.editable()).toBe(false);
    });
  });

  // --- T-BIL-TM2-02 — ToC mapping v2 catalog read + draft seams ---------------
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2

  describe('getTocCatalog (T-BIL-TM2-02, AC-11.1/AC-11.2)', () => {
    it('happy path — sets tocCatalog, clears tocCatalogError, toggles loadingTocCatalog true→false', async () => {
      let loadingDuringCall = false;
      mockApi.GET_PoolFundingHlosIndicators.mockImplementation(() => {
        loadingDuringCall = service.loadingTocCatalog();
        return Promise.resolve(ok<BilateralTocCatalogResponse>(TOC_CATALOG_CAPSHARING_FIXTURE));
      });

      const result = await service.getTocCatalog('STAR-5238');

      expect(loadingDuringCall).toBe(true);
      expect(service.loadingTocCatalog()).toBe(false);
      expect(service.tocCatalog()).toEqual(TOC_CATALOG_CAPSHARING_FIXTURE);
      expect(service.tocCatalogError()).toBe(false);
      expect(result).toEqual(TOC_CATALOG_CAPSHARING_FIXTURE);
      expect(mockApi.GET_PoolFundingHlosIndicators).toHaveBeenCalledWith('STAR-5238');
    });

    it('5xx — sets tocCatalogError, KEEPS the prior tocCatalog value (design §4.4), loading false', async () => {
      service.tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);
      mockApi.GET_PoolFundingHlosIndicators.mockResolvedValue(
        err<BilateralTocCatalogResponse>(500, 'Internal Server Error', undefined as unknown as BilateralTocCatalogResponse)
      );

      const result = await service.getTocCatalog('STAR-5238');

      expect(result).toBeNull();
      expect(service.tocCatalogError()).toBe(true);
      expect(service.tocCatalog()).toEqual(TOC_CATALOG_CAPSHARING_FIXTURE);
      expect(service.loadingTocCatalog()).toBe(false);
    });

    it('success after a prior error — clears tocCatalogError and replaces the catalog', async () => {
      mockApi.GET_PoolFundingHlosIndicators.mockResolvedValueOnce(
        err<BilateralTocCatalogResponse>(503, 'Service Unavailable', undefined as unknown as BilateralTocCatalogResponse)
      );
      await service.getTocCatalog('STAR-5238');
      expect(service.tocCatalogError()).toBe(true);
      expect(service.tocCatalog()).toBeNull();

      mockApi.GET_PoolFundingHlosIndicators.mockResolvedValueOnce(ok<BilateralTocCatalogResponse>(TOC_CATALOG_TWO_SP_FIXTURE));
      const result = await service.getTocCatalog('STAR-5238');

      expect(result).toEqual(TOC_CATALOG_TWO_SP_FIXTURE);
      expect(service.tocCatalogError()).toBe(false);
      expect(service.tocCatalog()).toEqual(TOC_CATALOG_TWO_SP_FIXTURE);
    });

    it('rejection — loadingTocCatalog resets to false (defensive try/finally)', async () => {
      mockApi.GET_PoolFundingHlosIndicators.mockRejectedValue(new Error('network down'));

      await expect(service.getTocCatalog('STAR-5238')).rejects.toThrow('network down');

      expect(service.loadingTocCatalog()).toBe(false);
    });
  });

  describe('catalogForSp (T-BIL-TM2-02)', () => {
    it('null when no catalog has been loaded', () => {
      expect(service.catalogForSp('SP01')).toBeNull();
    });

    it('returns the matching SP branch from the loaded catalog', () => {
      service.tocCatalog.set(TOC_CATALOG_TWO_SP_FIXTURE);

      expect(service.catalogForSp('SP01')?.sp_code).toBe('SP01');
      expect(service.catalogForSp('SP03')?.sp_code).toBe('SP03');
    });

    it('null when the SP is not in the catalog', () => {
      service.tocCatalog.set(TOC_CATALOG_CAPSHARING_FIXTURE);

      expect(service.catalogForSp('SP99')).toBeNull();
    });
  });

  describe('draftsFromSaved / writeDtoFromDrafts (T-BIL-TM2-02, D-9)', () => {
    it('round-trip — saved alignments (SP01 full Yes + SP03 No) → drafts → write DTOs', () => {
      const drafts = service.draftsFromSaved(SAVED_TOC_ALIGNMENTS_FIXTURE);

      expect(drafts).toEqual([
        {
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 5187,
          indicator_id: 5973,
          quantitative_contribution: 3
        },
        { sp_code: 'SP03', aligns_with_toc: false, level: null, toc_result_id: null, indicator_id: null, quantitative_contribution: null }
      ]);

      const dtos = service.writeDtoFromDrafts(drafts);

      expect(dtos).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 3 },
        // No → bare DTO, cascade fields dropped (design §4.4)
        { sp_code: 'SP03', aligns_with_toc: false }
      ]);
    });

    it('draftsFromSaved — null / undefined input → []', () => {
      expect(service.draftsFromSaved(null)).toEqual([]);
      expect(service.draftsFromSaved(undefined)).toEqual([]);
    });

    it('writeDtoFromDrafts — incomplete Yes draft is omitted entirely (defensive, canSave gates upstream)', () => {
      const incomplete: SpAlignmentDraft = {
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: null, // missing cascade step
        quantitative_contribution: 3
      };

      expect(service.writeDtoFromDrafts([incomplete])).toEqual([]);
    });

    it('writeDtoFromDrafts — unanswered draft (aligns_with_toc: null) is omitted', () => {
      const unanswered: SpAlignmentDraft = {
        sp_code: 'SP02',
        aligns_with_toc: null,
        level: null,
        toc_result_id: null,
        indicator_id: null,
        quantitative_contribution: null
      };

      expect(service.writeDtoFromDrafts([unanswered])).toEqual([]);
    });

    it('writeDtoFromDrafts — quantitative_contribution 0 is a valid complete draft (≥ 0)', () => {
      const zero: SpAlignmentDraft = {
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: 5973,
        quantitative_contribution: 0
      };

      expect(service.writeDtoFromDrafts([zero])).toEqual([
        { sp_code: 'SP01', aligns_with_toc: true, level: 'OUTPUT', toc_result_id: 5187, indicator_id: 5973, quantitative_contribution: 0 }
      ]);
    });

    it('writeDtoFromDrafts — negative contribution makes a Yes draft incomplete (omitted)', () => {
      const negative: SpAlignmentDraft = {
        sp_code: 'SP01',
        aligns_with_toc: true,
        level: 'OUTPUT',
        toc_result_id: 5187,
        indicator_id: 5973,
        quantitative_contribution: -1
      };

      expect(service.writeDtoFromDrafts([negative])).toEqual([]);
    });
  });

  describe('extractTocAlignmentErrors via patchAlignment (T-BIL-TM2-02, AC-08.2)', () => {
    const fail400 = (errors: unknown): MainResponse<AlignmentResponse> =>
      ({
        data: undefined,
        status: 400,
        description: 'error',
        timestamp: '',
        path: '',
        successfulRequest: false,
        errorDetail: { errors: errors as string, detail: '', description: 'Validation failed' }
      }) as MainResponse<AlignmentResponse>;

    it('400 with toc_alignments as STRINGIFIED-JSON errors → tocAlignmentErrors populated (field kept only when string)', async () => {
      const errorsJson = JSON.stringify({
        toc_alignments: [
          { sp_code: 'SP01', field: 'quantitative_contribution', message: 'must be >= 0' },
          { sp_code: 'SP03', message: 'indicator not in catalog' }
        ]
      });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400(errorsJson));

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'Validation failed',
        tocAlignmentErrors: [
          { sp_code: 'SP01', field: 'quantitative_contribution', message: 'must be >= 0' },
          { sp_code: 'SP03', message: 'indicator not in catalog' }
        ]
      });
      expect(service.savingAlignment()).toBe(false);
    });

    it('400 with toc_alignments on an already-parsed OBJECT errors envelope → tocAlignmentErrors populated (tolerant of object shape)', async () => {
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400({ toc_alignments: [{ sp_code: 'SP01', message: 'invalid level' }] }));

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect((result as { tocAlignmentErrors?: unknown }).tocAlignmentErrors).toEqual([{ sp_code: 'SP01', message: 'invalid level' }]);
    });

    it('400 with malformed errors payloads → no crash, no tocAlignmentErrors key', async () => {
      const malformed = ['{not-json', 'plain text', JSON.stringify({ toc_alignments: 'not-an-array' }), JSON.stringify(['array-root'])];
      for (const errors of malformed) {
        mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400(errors));

        const result = await service.patchAlignment('RES-001', { has_contribution: true });

        expect((result as { tocAlignmentErrors?: unknown }).tocAlignmentErrors).toBeUndefined();
      }
    });

    it('400 whose toc_alignments entries are missing sp_code / message or are non-objects → dropped (key absent when all drop)', async () => {
      const errorsJson = JSON.stringify({
        toc_alignments: [{ message: 'no sp_code' }, { sp_code: '   ', message: 'blank sp_code' }, { sp_code: 'SP01' }, 'not-an-object', null]
      });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400(errorsJson));

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect((result as { tocAlignmentErrors?: unknown }).tocAlignmentErrors).toBeUndefined();
    });

    it('400 mixing well-formed and malformed entries → only the well-formed entries survive', async () => {
      const errorsJson = JSON.stringify({
        toc_alignments: [{ sp_code: 'SP01', message: 'kept' }, { message: 'dropped — no sp_code' }, { sp_code: 'SP03', field: 7, message: 'kept, field dropped' }]
      });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400(errorsJson));

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect((result as { tocAlignmentErrors?: unknown }).tocAlignmentErrors).toEqual([
        { sp_code: 'SP01', message: 'kept' },
        { sp_code: 'SP03', message: 'kept, field dropped' }
      ]);
    });

    it('400 carrying BOTH unknown_sp_codes and toc_alignments → both surfaced side by side (no regression)', async () => {
      const errorsJson = JSON.stringify({
        unknown_sp_codes: ['SP04'],
        toc_alignments: [{ sp_code: 'SP01', message: 'invalid indicator' }]
      });
      mockApi.PATCH_PoolFundingAlignment.mockResolvedValue(fail400(errorsJson));

      const result = await service.patchAlignment('RES-001', { has_contribution: true });

      expect(result).toEqual({
        ok: false,
        status: 400,
        description: 'Validation failed',
        unknownSpCodes: ['SP04'],
        tocAlignmentErrors: [{ sp_code: 'SP01', message: 'invalid indicator' }]
      });
    });
  });
});
