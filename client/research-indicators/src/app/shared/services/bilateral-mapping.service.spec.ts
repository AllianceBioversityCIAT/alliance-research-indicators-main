import { TestBed } from '@angular/core/testing';
import { BilateralMappingService } from './bilateral-mapping.service';
import { ApiService } from './api.service';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { FindContracts, FindContractsResponse } from '@shared/interfaces/find-contracts.interface';
import {
  BilateralProjectMapping,
  BilateralMappingListPage,
  ClarisaBilateralProjectOption
} from '@interfaces/bilateral/bilateral-project-mapping.interface';

describe('BilateralMappingService', () => {
  let service: BilateralMappingService;
  let mockApi: {
    GET_BilateralProjectMappings: jest.Mock;
    GET_BilateralProjectMapping: jest.Mock;
    POST_BilateralProjectMapping: jest.Mock;
    PATCH_BilateralProjectMapping: jest.Mock;
    PATCH_BilateralProjectMappingDeactivate: jest.Mock;
    GET_ClarisaBilateralProjects: jest.Mock;
    GET_FindContracts: jest.Mock;
    GET_BilateralMappingCoverage: jest.Mock;
    POST_AutomapperPreview: jest.Mock;
    POST_AutomapperApply: jest.Mock;
  };

  beforeEach(() => {
    mockApi = {
      GET_BilateralProjectMappings: jest.fn(),
      GET_BilateralProjectMapping: jest.fn(),
      POST_BilateralProjectMapping: jest.fn(),
      PATCH_BilateralProjectMapping: jest.fn(),
      PATCH_BilateralProjectMappingDeactivate: jest.fn(),
      GET_ClarisaBilateralProjects: jest.fn(),
      GET_FindContracts: jest.fn(),
      GET_BilateralMappingCoverage: jest.fn(),
      POST_AutomapperPreview: jest.fn(),
      POST_AutomapperApply: jest.fn()
    };
    TestBed.configureTestingModule({
      providers: [BilateralMappingService, { provide: ApiService, useValue: mockApi }]
    });
    service = TestBed.inject(BilateralMappingService);
  });

  const ok = <T>(data: T): MainResponse<T> =>
    ({
      data,
      status: 200,
      description: 'OK',
      timestamp: '',
      path: '',
      successfulRequest: true,
      errorDetail: { errors: '', detail: '', description: '' }
    }) as MainResponse<T>;

  // Failure envelope — `errors` carries the human-readable text, `description`
  // (errorDetail.description) carries the exception class name.
  const err = <T>(
    status: number,
    errorDetail: { errors: string; detail?: string; description?: string },
    topDescription = 'error'
  ): MainResponse<T> =>
    ({
      data: null,
      status,
      description: topDescription,
      timestamp: '',
      path: '',
      successfulRequest: false,
      errorDetail: { detail: '', description: '', ...errorDetail }
    }) as unknown as MainResponse<T>;

  const mapping = (overrides: Partial<BilateralProjectMapping> = {}): BilateralProjectMapping => ({
    id: 11,
    agresso_agreement_id: 'D504',
    clarisa_project_id: 22,
    clarisa_project_short_name: 'Project 22',
    source: 'MANUAL',
    confidence_score: null,
    notes: null,
    is_active: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    created_by: 1,
    updated_by: 1,
    ...overrides
  });

  describe('list', () => {
    it('returns the {items,meta} page on successfulRequest:true with mapping_status populated', async () => {
      const page: BilateralMappingListPage = {
        items: [mapping({ is_active: true })],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
      };
      mockApi.GET_BilateralProjectMappings.mockResolvedValue(ok(page));

      const result = await service.list({ page: 1, limit: 10 });

      expect(result).not.toBeNull();
      expect(result?.items[0].mapping_status).toBe('Mapped');
      expect(mockApi.GET_BilateralProjectMappings).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('returns pending unmapped candidates when status is pending', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(
        ok({
          feedFetchedAt: null,
          counts: { toCreate: 1, alreadyMapped: 0, ambiguous: 0, unresolved: 0, divergent: 0, supersede: 0 },
          toCreate: [
            {
              clarisaProjectId: 1403,
              clarisaProjectFullName: 'Rice Project',
              clarisaProjectShortName: 'B-A1676',
              externalCode: 'B-A1676',
              derivedContractId: 'A1676',
              action: 'toCreate'
            }
          ],
          alreadyMapped: [],
          ambiguous: [],
          unresolved: [],
          divergent: [],
          supersede: []
        })
      );

      const result = await service.list({ status: 'pending' }, 2026);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]).toEqual(
        expect.objectContaining({
          clarisa_project_id: 1403,
          clarisa_project_short_name: 'B-A1676',
          clarisa_project_full_name: 'Rice Project',
          agresso_agreement_id: 'A1676',
          mapping_status: 'Pending',
          source: 'UNMAPPED'
        })
      );
    });

    it('returns null on successfulRequest:false (AC-03.3)', async () => {
      mockApi.GET_BilateralProjectMappings.mockResolvedValue(
        err<BilateralMappingListPage>(500, { errors: 'boom' })
      );

      const result = await service.list();

      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('returns the mapping on success and null on failure', async () => {
      const row = mapping();
      mockApi.GET_BilateralProjectMapping.mockResolvedValueOnce(ok(row));
      expect(await service.get(11)).toEqual(row);

      mockApi.GET_BilateralProjectMapping.mockResolvedValueOnce(
        err<BilateralProjectMapping>(404, { errors: 'not found' })
      );
      expect(await service.get(99)).toBeNull();
    });
  });

  describe('create', () => {
    it('happy path → { ok:true, data }', async () => {
      const row = mapping();
      mockApi.POST_BilateralProjectMapping.mockResolvedValue(ok(row));

      const result = await service.create({ agresso_agreement_id: 'D504', clarisa_project_id: 22 });

      expect(result).toEqual({ ok: true, data: row });
    });

    it('409 conflict → message from errorDetail.errors, NOT the exception name', async () => {
      mockApi.POST_BilateralProjectMapping.mockResolvedValue(
        err<BilateralProjectMapping>(409, {
          errors: 'Active mapping already exists for this contract',
          description: 'ConflictException'
        })
      );

      const result = await service.create({ agresso_agreement_id: 'D504', clarisa_project_id: 22 });

      expect(result).toEqual({
        ok: false,
        status: 409,
        message: 'Active mapping already exists for this contract'
      });
      // Guard against reading the exception class name.
      expect(result).not.toEqual(
        expect.objectContaining({ message: 'ConflictException' })
      );
    });

    it('400 → { ok:false, status:400, message:<errors text> }', async () => {
      mockApi.POST_BilateralProjectMapping.mockResolvedValue(
        err<BilateralProjectMapping>(400, { errors: 'clarisa_project_id must be a positive number' })
      );

      const result = await service.create({ agresso_agreement_id: 'D504', clarisa_project_id: -1 });

      expect(result).toEqual({
        ok: false,
        status: 400,
        message: 'clarisa_project_id must be a positive number'
      });
    });
  });

  describe('update', () => {
    it('happy path → { ok:true, data }', async () => {
      const row = mapping({ notes: 'edited' });
      mockApi.PATCH_BilateralProjectMapping.mockResolvedValue(ok(row));

      const result = await service.update(11, { notes: 'edited' });

      expect(result).toEqual({ ok: true, data: row });
      expect(mockApi.PATCH_BilateralProjectMapping).toHaveBeenCalledWith(11, { notes: 'edited' });
    });

    it('400 → surfaces errorDetail.errors text', async () => {
      mockApi.PATCH_BilateralProjectMapping.mockResolvedValue(
        err<BilateralProjectMapping>(400, { errors: 'notes is too long' })
      );

      const result = await service.update(11, { notes: 'x' });

      expect(result).toEqual({ ok: false, status: 400, message: 'notes is too long' });
    });

    it('falls back to top-level description when errorDetail.errors is empty', async () => {
      mockApi.PATCH_BilateralProjectMapping.mockResolvedValue(
        err<BilateralProjectMapping>(500, { errors: '' }, 'Internal Server Error')
      );

      const result = await service.update(11, { notes: 'x' });

      expect(result).toEqual({ ok: false, status: 500, message: 'Internal Server Error' });
    });
  });

  describe('deactivate', () => {
    it('happy path → { ok:true, data }', async () => {
      const row = mapping({ is_active: false });
      mockApi.PATCH_BilateralProjectMappingDeactivate.mockResolvedValue(ok(row));

      const result = await service.deactivate(11);

      expect(result).toEqual({ ok: true, data: row });
      expect(mockApi.PATCH_BilateralProjectMappingDeactivate).toHaveBeenCalledWith(11);
    });
  });

  describe('loadAgressoOptions', () => {
    it('maps agreement_id/description and drops entries without agreement_id', async () => {
      const rows: FindContracts[] = [
        { agreement_id: 'A511', description: 'Contract A511' },
        { agreement_id: 'D527', projectDescription: 'Fallback desc' },
        { description: 'no agreement id — dropped' }
      ];
      const payload: FindContractsResponse = {
        data: rows,
        metadata: { total: 3, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      };
      mockApi.GET_FindContracts.mockResolvedValue(ok(payload));

      const result = await service.loadAgressoOptions('A5');

      expect(result).toEqual([
        { agreement_id: 'A511', description: 'Contract A511' },
        { agreement_id: 'D527', description: 'Fallback desc' }
      ]);
      expect(mockApi.GET_FindContracts).toHaveBeenCalledWith({
        'exclude-pooled-funding': true,
        query: 'A5',
        limit: 50
      });
    });

    it('omits the query filter when no search is provided (sends only exclude-pooled-funding + limit)', async () => {
      mockApi.GET_FindContracts.mockResolvedValue(
        ok<FindContractsResponse>({
          data: [],
          metadata: { total: 0, page: 1, limit: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
        })
      );

      await service.loadAgressoOptions();

      expect(mockApi.GET_FindContracts).toHaveBeenCalledWith({ 'exclude-pooled-funding': true, limit: 50 });
    });

    it('returns [] on failure', async () => {
      mockApi.GET_FindContracts.mockResolvedValue(err<FindContractsResponse>(500, { errors: 'boom' }));
      expect(await service.loadAgressoOptions('x')).toEqual([]);
    });
  });

  describe('loadClarisaProjectOptions', () => {
    it('returns the options on success', async () => {
      const options: ClarisaBilateralProjectOption[] = [{ id: 22, short_name: 'Project 22' }];
      mockApi.GET_ClarisaBilateralProjects.mockResolvedValue(ok(options));

      const result = await service.loadClarisaProjectOptions('proj');

      expect(result).toEqual(options);
      expect(mockApi.GET_ClarisaBilateralProjects).toHaveBeenCalledWith('proj');
    });

    it('returns [] on failure', async () => {
      mockApi.GET_ClarisaBilateralProjects.mockResolvedValue(
        err<ClarisaBilateralProjectOption[]>(500, { errors: 'boom' })
      );
      expect(await service.loadClarisaProjectOptions()).toEqual([]);
    });
  });

  describe('getCoverage', () => {
    it('returns coverage data on success', async () => {
      const coverageData = { mapped: 4, pending: 194, reachable: 198 };
      mockApi.GET_BilateralMappingCoverage.mockResolvedValue(ok(coverageData));

      const result = await service.getCoverage(2026);

      expect(result).toEqual(coverageData);
      expect(mockApi.GET_BilateralMappingCoverage).toHaveBeenCalledWith(2026);
    });

    it('returns null on failure', async () => {
      mockApi.GET_BilateralMappingCoverage.mockResolvedValue(
        err(500, { errors: 'coverage error' })
      );

      const result = await service.getCoverage();

      expect(result).toBeNull();
    });
  });

  describe('previewAutoMap', () => {
    it('returns preview report on success', async () => {
      const previewData = {
        feedFetchedAt: '2026-08-19T21:10:00.000Z',
        counts: {
          toCreate: 190,
          alreadyMapped: 4,
          ambiguous: 0,
          unresolved: 0,
          divergent: 3,
          supersede: 1
        },
        toCreate: [],
        alreadyMapped: [],
        ambiguous: [],
        unresolved: [],
        divergent: [],
        supersede: []
      };
      mockApi.POST_AutomapperPreview.mockResolvedValue(ok(previewData));

      const result = await service.previewAutoMap(2026);

      expect(result).toEqual(previewData);
      expect(mockApi.POST_AutomapperPreview).toHaveBeenCalledWith({ phase: 2026 });
    });

    it('returns null on failure', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValue(
        err(500, { errors: 'preview failed' })
      );

      const result = await service.previewAutoMap();

      expect(result).toBeNull();
    });
  });

  describe('applyAutoMap', () => {
    it('returns { ok: true, data } on success', async () => {
      const applyData = {
        feedFetchedAt: '2026-08-19T21:10:00.000Z',
        counts: {
          created: 190,
          alreadyMapped: 4,
          ambiguous: 0,
          unresolved: 0,
          divergent: 3,
          superseded: 1
        },
        ambiguous: [],
        unresolved: []
      };
      mockApi.POST_AutomapperApply.mockResolvedValue(ok(applyData));

      const result = await service.applyAutoMap(2026);

      expect(result).toEqual({ ok: true, data: applyData });
      expect(mockApi.POST_AutomapperApply).toHaveBeenCalledWith({ phase: 2026 });
    });

    it('returns { ok: false, status, message } on failure', async () => {
      mockApi.POST_AutomapperApply.mockResolvedValue(
        err(422, { errors: 'No external codes in cohort' })
      );

      const result = await service.applyAutoMap();

      expect(result).toEqual({
        ok: false,
        status: 422,
        message: 'No external codes in cohort'
      });
    });
  });
});

