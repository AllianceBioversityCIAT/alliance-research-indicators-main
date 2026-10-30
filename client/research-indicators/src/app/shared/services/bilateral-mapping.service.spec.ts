import { TestBed } from '@angular/core/testing';
import { BilateralMappingService } from './bilateral-mapping.service';
import { ApiService } from './api.service';
import { ToPromiseService } from './to-promise.service';
import { CacheService } from './cache/cache.service';
import { ControlListCacheService } from './control-list-cache.service';
import { SignalEndpointService } from './signal-endpoint.service';
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
    PATCH_ActivateBilateralMapping: jest.Mock;
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
      POST_AutomapperApply: jest.fn(),
      PATCH_ActivateBilateralMapping: jest.fn()
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
    reporting_year: 2026,
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
          reporting_year: 2026,
          feedFetchedAt: null,
          counts: { toCreate: 1, alreadyMapped: 0, toUpdate: 0, ambiguous: 0, unresolved: 0, divergent: 0, inactive: 0 },
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
          toUpdate: [],
          inactive: []
        })
      );

      const result = await service.list({ status: 'pending' });

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]).toEqual(
        expect.objectContaining({
          clarisa_project_id: 1403,
          clarisa_project_short_name: 'B-A1676',
          clarisa_project_full_name: 'Rice Project',
          agresso_agreement_id: 'A1676',
          mapping_status: 'Pending',
          source: 'UNMAPPED',
          reporting_year: 2026
        })
      );
    });

    it('pending list excludes toUpdate and inactive rows', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(
        ok({
          reporting_year: 2026,
          feedFetchedAt: null,
          counts: { toCreate: 0, alreadyMapped: 0, toUpdate: 1, ambiguous: 0, unresolved: 0, divergent: 0, inactive: 1 },
          toCreate: [],
          alreadyMapped: [],
          ambiguous: [],
          unresolved: [],
          divergent: [],
          toUpdate: [
            {
              clarisaProjectId: 9,
              clarisaProjectFullName: 'Update me',
              clarisaProjectShortName: 'Upd',
              externalCode: 'U-1',
              derivedContractId: 'U1',
              action: 'toUpdate',
              existingMappingId: 3,
              existingClarisaProjectId: 8
            }
          ],
          inactive: [
            {
              clarisaProjectId: 4,
              clarisaProjectFullName: 'Inactive',
              clarisaProjectShortName: 'Ina',
              externalCode: 'I-1',
              derivedContractId: 'I1',
              action: 'inactive',
              existingMappingId: 4,
              existingClarisaProjectId: 4,
              refreshed: true
            }
          ]
        })
      );

      const result = await service.list({ status: 'pending' });

      expect(result?.items).toEqual([]);
    });

    it('returns null on successfulRequest:false (AC-03.3)', async () => {
      mockApi.GET_BilateralProjectMappings.mockResolvedValue(err<BilateralMappingListPage>(500, { errors: 'boom' }));

      const result = await service.list();

      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('returns the mapping on success and null on failure', async () => {
      const row = mapping();
      mockApi.GET_BilateralProjectMapping.mockResolvedValueOnce(ok(row));
      expect(await service.get(11)).toEqual(row);

      mockApi.GET_BilateralProjectMapping.mockResolvedValueOnce(err<BilateralProjectMapping>(404, { errors: 'not found' }));
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

    it('maps outcome created and updated from the response', async () => {
      const created = { ...mapping(), outcome: 'created' as const };
      mockApi.POST_BilateralProjectMapping.mockResolvedValueOnce(ok(created));
      const createdResult = await service.create({ agresso_agreement_id: 'D504', clarisa_project_id: 22 });
      expect(createdResult).toEqual({ ok: true, data: created });
      if (createdResult.ok) expect(createdResult.data.outcome).toBe('created');

      const updated = { ...mapping(), outcome: 'updated' as const };
      mockApi.POST_BilateralProjectMapping.mockResolvedValueOnce(ok(updated));
      const updatedResult = await service.create({ agresso_agreement_id: 'D504', clarisa_project_id: 22 });
      expect(updatedResult).toEqual({ ok: true, data: updated });
      if (updatedResult.ok) expect(updatedResult.data.outcome).toBe('updated');
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
      expect(result).not.toEqual(expect.objectContaining({ message: 'ConflictException' }));
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
      mockApi.PATCH_BilateralProjectMapping.mockResolvedValue(err<BilateralProjectMapping>(400, { errors: 'notes is too long' }));

      const result = await service.update(11, { notes: 'x' });

      expect(result).toEqual({ ok: false, status: 400, message: 'notes is too long' });
    });

    it('falls back to top-level description when errorDetail.errors is empty', async () => {
      mockApi.PATCH_BilateralProjectMapping.mockResolvedValue(err<BilateralProjectMapping>(500, { errors: '' }, 'Internal Server Error'));

      const result = await service.update(11, { notes: 'x' });

      expect(result).toEqual({ ok: false, status: 500, message: 'Internal Server Error' });
    });
  });

  describe('deactivate', () => {
    it('sends justification and omits notes when they were not edited (R-MSE-006)', async () => {
      const row = mapping({ is_active: false });
      mockApi.PATCH_BilateralProjectMappingDeactivate.mockResolvedValue(ok(row));

      const result = await service.deactivate(11, 'Contract closed');

      expect(result).toEqual({ ok: true, data: row });
      expect(mockApi.PATCH_BilateralProjectMappingDeactivate).toHaveBeenCalledWith(11, { justification: 'Contract closed' });
    });

    it('sends edited notes beside the justification (R-MSE-006)', async () => {
      const row = mapping({ is_active: false });
      mockApi.PATCH_BilateralProjectMappingDeactivate.mockResolvedValue(ok(row));

      await service.deactivate(11, 'Contract closed', 'kept note');

      expect(mockApi.PATCH_BilateralProjectMappingDeactivate).toHaveBeenCalledWith(11, {
        justification: 'Contract closed',
        notes: 'kept note'
      });
    });
  });

  describe('activate', () => {
    it('calls PATCH bilateral-project-mappings/:id/activate with an empty body', async () => {
      const row = mapping({ is_active: true });
      mockApi.PATCH_ActivateBilateralMapping.mockResolvedValue(ok(row));

      const result = await service.activate(11);

      expect(result).toEqual({ ok: true, data: row });
      expect(mockApi.PATCH_ActivateBilateralMapping).toHaveBeenCalledWith(11, {});
    });

    it('forwards notes when they were edited', async () => {
      const row = mapping({ is_active: true });
      mockApi.PATCH_ActivateBilateralMapping.mockResolvedValue(ok(row));

      const result = await service.activate(11, { notes: 'n' });

      expect(result).toEqual({ ok: true, data: row });
      expect(mockApi.PATCH_ActivateBilateralMapping).toHaveBeenCalledWith(11, { notes: 'n' });
    });

    it('forwards justification only when it was typed (R-MSE-008)', async () => {
      const row = mapping({ is_active: true });
      mockApi.PATCH_ActivateBilateralMapping.mockResolvedValue(ok(row));

      await service.activate(11, { justification: 'Contract renewed' });

      expect(mockApi.PATCH_ActivateBilateralMapping).toHaveBeenCalledWith(11, { justification: 'Contract renewed' });
    });

    it('forwards only clarisa_project_id when the project changed (R-MSE-007)', async () => {
      const row = mapping({ is_active: true });
      mockApi.PATCH_ActivateBilateralMapping.mockResolvedValue(ok(row));

      await service.activate(11, { clarisa_project_id: 99 });

      expect(mockApi.PATCH_ActivateBilateralMapping).toHaveBeenCalledWith(11, { clarisa_project_id: 99 });
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
      mockApi.GET_ClarisaBilateralProjects.mockResolvedValue(err<ClarisaBilateralProjectOption[]>(500, { errors: 'boom' }));
      expect(await service.loadClarisaProjectOptions()).toEqual([]);
    });
  });

  describe('getCoverage', () => {
    it('returns coverage data on success', async () => {
      const coverageData = { reporting_year: 2026, mapped: 4, pending: 194, inactive: 0, reachable: 198 };
      mockApi.GET_BilateralMappingCoverage.mockResolvedValue(ok(coverageData));

      const result = await service.getCoverage();

      expect(result).toEqual(coverageData);
      expect(mockApi.GET_BilateralMappingCoverage).toHaveBeenCalledWith();
    });

    it('returns null on failure', async () => {
      mockApi.GET_BilateralMappingCoverage.mockResolvedValue(err(500, { errors: 'coverage error' }));

      const result = await service.getCoverage();

      expect(result).toBeNull();
    });
  });

  describe('previewAutoMap', () => {
    it('returns preview report on success', async () => {
      const previewData = {
        reporting_year: 2026,
        feedFetchedAt: '2026-08-19T21:10:00.000Z',
        counts: {
          toCreate: 190,
          alreadyMapped: 4,
          toUpdate: 1,
          ambiguous: 0,
          unresolved: 0,
          divergent: 3,
          inactive: 0
        },
        toCreate: [],
        alreadyMapped: [],
        toUpdate: [],
        ambiguous: [],
        unresolved: [],
        divergent: [],
        inactive: []
      };
      mockApi.POST_AutomapperPreview.mockResolvedValue(ok(previewData));

      const result = await service.previewAutoMap();

      expect(result).toEqual(previewData);
      expect(mockApi.POST_AutomapperPreview).toHaveBeenCalledWith({});
    });

    it('returns null on failure', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValue(err(500, { errors: 'preview failed' }));

      const result = await service.previewAutoMap();

      expect(result).toBeNull();
    });
  });

  describe('applyAutoMap', () => {
    it('apply body is {}', async () => {
      mockApi.POST_AutomapperApply.mockResolvedValue(
        ok({
          feedFetchedAt: null,
          counts: {
            created: 0,
            updated: 0,
            alreadyMapped: 0,
            ambiguous: 0,
            unresolved: 0,
            divergent: 0,
            inactive: 0
          },
          ambiguous: [],
          unresolved: []
        })
      );

      await service.applyAutoMap();

      expect(mockApi.POST_AutomapperApply).toHaveBeenCalledWith({});
    });

    it('returns { ok: true, data } on success', async () => {
      const applyData = {
        feedFetchedAt: '2026-08-19T21:10:00.000Z',
        counts: {
          created: 190,
          updated: 1,
          alreadyMapped: 4,
          ambiguous: 0,
          unresolved: 0,
          divergent: 3,
          inactive: 0
        },
        ambiguous: [],
        unresolved: []
      };
      mockApi.POST_AutomapperApply.mockResolvedValue(ok(applyData));

      const result = await service.applyAutoMap();

      expect(result).toEqual({ ok: true, data: applyData });
      expect(mockApi.POST_AutomapperApply).toHaveBeenCalledWith({});
    });

    it('returns { ok: false, status, message } on failure', async () => {
      mockApi.POST_AutomapperApply.mockResolvedValue(err(422, { errors: 'No external codes in cohort' }));

      const result = await service.applyAutoMap();

      expect(result).toEqual({
        ok: false,
        status: 422,
        message: 'No external codes in cohort'
      });
    });
  });

  // ── Coverage completion: pending search/pagination and fallbacks ──────────

  describe('edge branches (coverage completion)', () => {
    const cand = (id: number, short: string | null, full: string | null, contract: string | null) => ({
      clarisaProjectId: id,
      clarisaProjectShortName: short,
      clarisaProjectFullName: full,
      externalCode: null,
      derivedContractId: contract,
      action: 'toCreate'
    });

    const preview = (extra: Record<string, unknown>) =>
      ok({
        reporting_year: 2026,
        feedFetchedAt: null,
        counts: {
          toCreate: 0,
          alreadyMapped: 0,
          toUpdate: 0,
          ambiguous: 0,
          unresolved: 0,
          divergent: 0,
          inactive: 0
        },
        ...extra
      });

    it('pending list returns null when the preview fails', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(err(500, { errors: 'x' }));
      expect(await service.list({ status: 'pending' })).toBeNull();
      expect(mockApi.POST_AutomapperPreview).toHaveBeenCalledWith({});
    });

    it('pending list tolerates missing buckets and returns an empty single page', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(preview({}));
      const result = await service.list({ status: 'pending' });
      expect(result?.items).toEqual([]);
      expect(result?.meta).toEqual({ total: 0, page: 1, limit: 20, totalPages: 1 });
    });

    it('pending list merges toCreate/ambiguous/unresolved, filters by search across the three fields and paginates', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(
        preview({
          toCreate: [cand(1, 'Alpha', 'Zeta', 'C1'), cand(2, null, null, null)],
          ambiguous: [cand(3, 'Beta', 'Rice Farming', 'C2')],
          unresolved: [cand(4, 'Gamma', 'Other', 'XRICE')]
        })
      );
      const result = await service.list({ status: 'pending', search: '  rice ', page: 1, limit: 1 });
      expect(result?.meta).toEqual({ total: 2, page: 1, limit: 1, totalPages: 2 });
      expect(result?.items.map(i => i.clarisa_project_id)).toEqual([3]);

      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(
        preview({
          toCreate: [cand(1, 'Alpha', 'Zeta', 'C1')],
          ambiguous: [cand(3, 'Beta', 'Rice Farming', 'C2')],
          unresolved: [cand(4, 'Gamma', 'Other', 'XRICE')]
        })
      );
      const page2 = await service.list({ status: 'pending', search: 'rice', page: 2, limit: 1 });
      expect(page2?.items.map(i => i.clarisa_project_id)).toEqual([4]);

      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(
        preview({ toCreate: [cand(1, 'Alpha', 'Zeta', 'C1'), cand(2, null, null, null)] })
      );
      const byShort = await service.list({ status: 'pending', search: 'alp' });
      expect(byShort?.items.map(i => i.clarisa_project_id)).toEqual([1]);
    });

    it('pending list shows an em dash and negative id for candidates without a derived contract', async () => {
      mockApi.POST_AutomapperPreview.mockResolvedValueOnce(preview({ toCreate: [cand(7, 'S', 'F', '')] }));
      const result = await service.list({ status: 'pending' });
      expect(result?.items[0]).toEqual(expect.objectContaining({ id: -7, agresso_agreement_id: '—' }));
    });

    it('list marks an inactive row without mapping_status as Inactive and keeps an explicit status even if inactive', async () => {
      const page: BilateralMappingListPage = {
        items: [mapping({ id: 1, is_active: false }), mapping({ id: 2, is_active: false, mapping_status: 'Mapped' })],
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 }
      };
      mockApi.GET_BilateralProjectMappings.mockResolvedValue(ok(page));
      const result = await service.list();
      expect(result?.items.map(i => i.mapping_status)).toEqual(['Inactive', 'Mapped']);
    });

    it('loadAgressoOptions handles a missing data payload and description fallbacks', async () => {
      mockApi.GET_FindContracts.mockResolvedValueOnce(ok(undefined));
      expect(await service.loadAgressoOptions()).toEqual([]);

      mockApi.GET_FindContracts.mockResolvedValueOnce(
        ok({
          data: [
            { agreement_id: 'A1', description: 'Desc' },
            { agreement_id: 'A2', projectDescription: 'Project desc' },
            { agreement_id: 'A3' }
          ]
        })
      );
      expect(await service.loadAgressoOptions('q')).toEqual([
        { agreement_id: 'A1', description: 'Desc' },
        { agreement_id: 'A2', description: 'Project desc' },
        { agreement_id: 'A3', description: '' }
      ]);
    });

    it('loadClarisaProjectOptions returns [] when a successful response has no data', async () => {
      mockApi.GET_ClarisaBilateralProjects.mockResolvedValue(ok(null));
      expect(await service.loadClarisaProjectOptions()).toEqual([]);
    });

    it('mutations on a nullish response resolve to status 0 and an empty message', async () => {
      mockApi.POST_BilateralProjectMapping.mockResolvedValue(undefined);
      expect(await service.create({ agresso_agreement_id: 'A', clarisa_project_id: 1 })).toEqual({
        ok: false,
        status: 0,
        message: ''
      });
    });

    it('mutation failure with neither errors nor description yields an empty message', async () => {
      mockApi.POST_BilateralProjectMapping.mockResolvedValue({
        successfulRequest: false,
        status: 500,
        description: '',
        errorDetail: { errors: '' }
      });
      expect(await service.create({ agresso_agreement_id: 'A', clarisa_project_id: 1 })).toEqual({
        ok: false,
        status: 500,
        message: ''
      });
    });
  });
});
describe('PATCH_ActivateBilateralMapping URL', () => {
  it('patches bilateral-project-mappings/:id/activate with an empty body', async () => {
    const patch = jest.fn().mockResolvedValue({ successfulRequest: true, data: { id: 11 } });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: ToPromiseService, useValue: { patch } },
        { provide: CacheService, useValue: {} },
        { provide: ControlListCacheService, useValue: {} },
        {
          provide: SignalEndpointService,
          useValue: {
            createEndpoint: jest.fn().mockImplementation((urlFn: () => string) => {
              if (typeof urlFn === 'function') urlFn();
              return { get: jest.fn(), post: jest.fn() };
            })
          }
        }
      ]
    });

    const api = TestBed.inject(ApiService);
    await api.PATCH_ActivateBilateralMapping(11);

    expect(patch).toHaveBeenCalledWith('bilateral-project-mappings/11/activate', {}, { useResultInterceptor: true });
  });
});

describe('PATCH_BilateralProjectMappingDeactivate URL', () => {
  it('patches bilateral-project-mappings/:id/deactivate with the justification body', async () => {
    const patch = jest.fn().mockResolvedValue({ successfulRequest: true, data: { id: 11 } });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: ToPromiseService, useValue: { patch } },
        { provide: CacheService, useValue: {} },
        { provide: ControlListCacheService, useValue: {} },
        {
          provide: SignalEndpointService,
          useValue: {
            createEndpoint: jest.fn().mockImplementation((urlFn: () => string) => {
              if (typeof urlFn === 'function') urlFn();
              return { get: jest.fn(), post: jest.fn() };
            })
          }
        }
      ]
    });

    const api = TestBed.inject(ApiService);
    await api.PATCH_BilateralProjectMappingDeactivate(11, { justification: 'Contract closed' });

    expect(patch).toHaveBeenCalledWith(
      'bilateral-project-mappings/11/deactivate',
      { justification: 'Contract closed' },
      { useResultInterceptor: true }
    );
  });
});
