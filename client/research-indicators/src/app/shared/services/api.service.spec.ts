import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { ToPromiseService } from './to-promise.service';
import { CacheService } from './cache/cache.service';
import { ControlListCacheService } from './control-list-cache.service';
import { SignalEndpointService } from './signal-endpoint.service';
import { environment } from '../../../environments/environment';
import { HttpParams } from '@angular/common/http';

describe('ApiService', () => {
  let service: ApiService;
  let mockToPromiseService: jest.Mocked<Partial<ToPromiseService>>;
  let mockCacheService: jest.Mocked<Partial<CacheService>>;
  let mockControlListCacheService: jest.Mocked<Partial<ControlListCacheService>>;
  let mockSignalEndpointService: jest.Mocked<Partial<SignalEndpointService>>;

  beforeEach(() => {
    mockToPromiseService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getWithParams: jest.fn(),
      getBlob: jest.fn()
    };

    mockCacheService = {
      currentResultId: jest.fn().mockReturnValue(123),
      getCurrentNumericResultId: jest.fn().mockReturnValue(123)
    } as any;

    mockControlListCacheService = {};

    mockSignalEndpointService = {
      createEndpoint: jest.fn().mockImplementation((urlFn: () => string) => {
        if (typeof urlFn === 'function') {
          urlFn();
        }
        return {
          get: jest.fn(),
          post: jest.fn()
        };
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: ToPromiseService, useValue: mockToPromiseService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ControlListCacheService, useValue: mockControlListCacheService },
        { provide: SignalEndpointService, useValue: mockSignalEndpointService }
      ]
    });
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create signal endpoints with correct URLs', () => {
    expect(mockSignalEndpointService.createEndpoint).toHaveBeenCalledTimes(2);
    const firstUrlFn = mockSignalEndpointService.createEndpoint.mock.calls[0][0];
    const secondUrlFn = mockSignalEndpointService.createEndpoint.mock.calls[1][0];
    expect(firstUrlFn()).toBe('indicators/with/result');
    expect(secondUrlFn()).toBe('indicators');
  });

  describe('Authentication methods', () => {
    it('should call login with correct parameters', () => {
      const awsToken = 'test-token';
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.login(awsToken);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('authorization/login', {}, { token: awsToken, isAuth: true });
    });

    it('should call refreshToken with correct parameters', () => {
      const refreshToken = 'refresh-token';
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.refreshToken(refreshToken);

      expect(mockToPromiseService.post).toHaveBeenCalledWith(
        'authorization/refresh-token',
        {},
        { token: refreshToken, isRefreshToken: true, isAuth: true }
      );
    });
  });

  describe('GET methods', () => {
    it('should call GET_IndicatorTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_IndicatorTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('indicator-types', {});
    });

    it('should call GET_AllIndicators', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AllIndicators();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('indicators', {});
    });

    it('should call GET_Institutions', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Institutions();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions?location=true&type=true&only-hq=true', {});
    });

    it('should call GET_InstitutionsTypesChildless', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InstitutionsTypesChildless();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions-types/childless', {});
    });

    it('should call GET_SDGs', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SDGs();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/sdgs', {});
    });

    it('should call GET_Levers', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Levers();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/levers', {});
    });

    it('should call GET_Levers with portfolio params', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Levers({ portfolioId: 2, reportYear: 2026 });

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params;
      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/levers', { params });
      expect(params.get('portfolioId')).toBe('2');
      expect(params.get('reportYear')).toBe('2026');
    });

    it('should call GET_StrategicObjectives with portfolio params', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_StrategicObjectives({ portfolioId: 2, reportYear: 2026 });

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params;
      expect(mockToPromiseService.get).toHaveBeenCalledWith('strategic-objectives', { params });
      expect(params.get('portfolioId')).toBe('2');
      expect(params.get('reportYear')).toBe('2026');
    });

    it('should call GET_StrategicObjectives without params', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_StrategicObjectives();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('strategic-objectives', {});
    });

    it('should call GET_ImpactOutcomes with portfolio params', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ImpactOutcomes({ portfolioId: 2, reportYear: 2026 });

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params;
      expect(mockToPromiseService.get).toHaveBeenCalledWith('impact-outcomes', { params });
      expect(params.get('portfolioId')).toBe('2');
      expect(params.get('reportYear')).toBe('2026');
    });

    it('should call GET_ImpactOutcomes without params', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ImpactOutcomes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('impact-outcomes', {});
    });

    it('should call GET_Portfolios', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Portfolios();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('portfolios', {});
    });

    it('should call GET_FundingTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_FundingTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/funding-types', {});
    });

    it('should call GET_ClarisaSdgTargets', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ClarisaSdgTargets();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/sdg-targets', {});
    });

    it('should call GET_InstitutionsTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InstitutionsTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions-types', {});
    });

    it('should call GET_SubNationals', () => {
      const isoAlpha2 = 'US';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SubNationals(isoAlpha2);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/sub-nationals/country/US', {});
    });

    it('should call GET_Tags', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Tags();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tags', {});
    });

    it('should call GET_Initiatives', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Initiatives();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/initiatives', {});
    });

    it('should call GET_IndicatorTypeById', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_IndicatorTypeById(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('indicator-types/123', {});
    });

    it('should call GET_IndicatorById', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_IndicatorById(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('indicators/123', {});
    });

    it('should call GET_ViewComponents', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ViewComponents();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('authorization/view/scomponents', {});
    });

    it('should call GET_PoolFundingAlignment with v1-prefixed URL and numeric result code', () => {
      const resultCode = '19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingAlignment(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment', {});
    });

    it('should strip the STAR- prefix from the resultCode for GET_PoolFundingAlignment', () => {
      const resultCode = 'STAR-19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingAlignment(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment', {});
    });

    it('should URL-encode the (post-strip) resultCode for GET_PoolFundingAlignment', () => {
      const resultCode = 'edge case#1';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingAlignment(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        `v1/results/${encodeURIComponent(resultCode)}/pool-funding-alignment`,
        {}
      );
    });

    it('should call GET_PoolFundingSciencePrograms with the per-result /science-programs suffix and numeric code', () => {
      const resultCode = '19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingSciencePrograms(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment/science-programs', {});
    });

    it('should strip the STAR- prefix from the resultCode for GET_PoolFundingSciencePrograms', () => {
      const resultCode = 'STAR-19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingSciencePrograms(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment/science-programs', {});
    });

    it('should call GET_PoolFundingHlosIndicators with the per-result /hlos-indicators suffix and numeric code', () => {
      const resultCode = '19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingHlosIndicators(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment/hlos-indicators', {});
    });

    it('should strip the STAR- prefix from the resultCode for GET_PoolFundingHlosIndicators', () => {
      const resultCode = 'STAR-19792';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PoolFundingHlosIndicators(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('v1/results/19792/pool-funding-alignment/hlos-indicators', {});
    });

    it('should resolve the MainResponse<BilateralTocCatalogResponse> envelope for GET_PoolFundingHlosIndicators', async () => {
      const envelope = {
        data: {
          result_code: 'STAR-19792',
          mapping_status: 'mapped',
          clarisa_project: { id: 7, short_name: 'PRJ-7' },
          result_type: 'CapSharing',
          allowed_levels: [],
          version_locked: false,
          catalogs: []
        },
        status: 200,
        description: 'OK',
        successfulRequest: true,
        errorDetail: { errors: '', detail: '', description: '' }
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue(envelope);

      const result = await service.GET_PoolFundingHlosIndicators('19792');

      expect(result).toEqual(envelope);
    });

    it('should leave GET_SciencePrograms (catalog-wide) untouched (AC-01.5)', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SciencePrograms();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/science-programs', {});
    });
  });

  describe('POST methods', () => {
    it('should call POST_CreateOicr', () => {
      const body = { test: 'data' } as any;
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_CreateOicr(body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/oicr', body, {});
    });

    it('should call POST_CreateOicr with resultCode', () => {
      const body = { test: 'data' } as any;
      const resultCode = 123;
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_CreateOicr(body, resultCode);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/oicr?resultCode=123', body, {});
    });

    it('should call POST_Result', () => {
      const body = { test: 'data' };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_Result(body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('results', body, {});
    });

    it('should call POST_CreateResult', () => {
      const result = { test: 'data' } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_CreateResult(result);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('results/ai/formalize', result, {});
    });

    it('should call POST_DynamoFeedback', () => {
      const body = { test: 'data' };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_DynamoFeedback(body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('dynamo-feedback/save-data', body, {});
    });

    it('should call GET_DynamoFeedback', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_DynamoFeedback();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('dynamo-feedback/test-data', {});
    });

    it('should call GET_IssueCategories', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_IssueCategories();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('issue-categories', {});
    });

    it('should call POST_PartnerRequest', () => {
      const body = { test: 'data' };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_PartnerRequest(body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('tools/clarisa/manager/partner-request/create', body, {});
    });

    it('should call POST_Portfolio', () => {
      const body = {
        name: 'Portfolio',
        description: 'Description',
        start_year: 2026,
        end_year: 2030
      };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.POST_Portfolio(body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('portfolios', body, {});
    });
  });

  describe('PATCH methods', () => {
    it('should call PATCH_Configuration', () => {
      const id = '123';
      const section = 'test';
      const body = { test: 'data' } as unknown as import('../interfaces/configuration.interface').Configuration;
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Configuration(id, section, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('user/configuration/123?component=test', body, {});
    });

    it('should call PATCH_GeneralInformation', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_GeneralInformation(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/123/general-information', body, { useResultInterceptor: true });
    });

    it('should call PATCH_Partners', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Partners(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/institutions/partners/by-result-id/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_InnovationDetails', () => {
      const resultCode = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_InnovationDetails(resultCode, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/innovation-dev/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_ResultEvidences', () => {
      const resultId = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_ResultEvidences(resultId, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/evidences/by-result-id/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_IpOwners', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_IpOwners(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/intellectual-property/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_CapacitySharing', () => {
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_CapacitySharing(body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/capacity-sharing/by-result-id/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_PolicyChange', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PolicyChange(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/policy-change/by-result-id/123', body, { useResultInterceptor: true });
    });

    it('should call PATCH_Alignments', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Alignments(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/123/alignments', body, { useResultInterceptor: true });
    });

    it('should call PATCH_Alignments with portfolio query params', () => {
      const id = 123;
      const body = { contracts: [] };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Alignments(id, body, { portfolioId: 2, return: true });

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/123/alignments', body, {
        params: expect.any(Object),
        useResultInterceptor: true
      });
    });

    it('should call PATCH_ReportingCycle', () => {
      const resultCode = 123;
      const newReportYear = '2024';
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_ReportingCycle(resultCode, newReportYear);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/green-checks/new-reporting-cycle/123/year/2024', {});
    });

    it('should call PATCH_StatusChangeDate with newDate as query param', () => {
      const resultCode = 19547;
      const submissionHistoryId = 4687;
      const newDate = '2026-03-02T16:46:00.000Z';
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_StatusChangeDate(resultCode, submissionHistoryId, newDate);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        'results/green-checks/change/status/date/19547/submission-history/4687?newDate=2026-03-02T16%3A46%3A00.000Z',
        {},
        { useResultInterceptor: true }
      );
    });

    it('should call PATCH_SubmitResult with comment', () => {
      const params = { resultCode: 123, comment: 'test comment', status: 1 } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_SubmitResult(params);

      expect(mockToPromiseService.post).toHaveBeenCalledWith(
        'results/status/workflow/change-status/123/to-status/1',
        { submission_comment: 'test comment' },
        {
          useResultInterceptor: true
        }
      );
    });

    it('should call PATCH_SubmitResult without comment', () => {
      const params = { resultCode: 123, status: 1 } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_SubmitResult(params);

      expect(mockToPromiseService.post).toHaveBeenCalledWith(
        'results/status/workflow/change-status/123/to-status/1',
        { submission_comment: '' },
        {
          useResultInterceptor: true
        }
      );
    });

    it('should call PATCH_SubmitResult with body', () => {
      const params = { resultCode: 123, comment: 'test comment', status: 1 } as any;
      const body = { test: 'data' } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_SubmitResult(params, body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith(
        'results/status/workflow/change-status/123/to-status/1',
        { ...body, submission_comment: 'test comment' },
        {
          useResultInterceptor: true
        }
      );
    });

    it('should call PATCH_SubmitResult with body and null comment using empty string for submission_comment', () => {
      const params = { resultCode: 123, comment: null, status: 1 } as any;
      const body = { extra: 'field' } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_SubmitResult(params, body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith(
        'results/status/workflow/change-status/123/to-status/1',
        { ...body, submission_comment: '' },
        { useResultInterceptor: true }
      );
    });

    it('should call PATCH_Feedback', () => {
      const body = { test: 'data' } as any;
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Feedback(body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('reporting-feedback/send', body);
    });

    it('should call PATCH_PoolFundingTag with encoded code and useResultInterceptor option', () => {
      const code = 'AC-1594';
      const body = { is_pool_funding_contributor: true };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PoolFundingTag(code, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        'agresso/contracts/AC-1594/pool-funding-tag',
        body,
        { useResultInterceptor: true }
      );
    });

    it('should call PATCH_PoolFundingTag with a code that needs URL-encoding', () => {
      const code = 'AC/1594 with space';
      const body = { is_pool_funding_contributor: false };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PoolFundingTag(code, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        `agresso/contracts/${encodeURIComponent(code)}/pool-funding-tag`,
        body,
        { useResultInterceptor: true }
      );
    });

    it('should call PATCH_PoolFundingAlignment with v1-prefixed URL and has_contribution=true + lever_codes', () => {
      const resultCode = '19792';
      const body = {
        has_contribution: true,
        lever_codes: ['L1', 'L2']
      };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PoolFundingAlignment(resultCode, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        'v1/results/19792/pool-funding-alignment',
        body,
        {}
      );
    });

    it('should call PATCH_PoolFundingAlignment with has_contribution=false and no lever_codes', () => {
      const resultCode = '19792';
      const body = { has_contribution: false };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PoolFundingAlignment(resultCode, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        'v1/results/19792/pool-funding-alignment',
        body,
        {}
      );
    });

    it('should strip the STAR- prefix from the resultCode for PATCH_PoolFundingAlignment', () => {
      const resultCode = 'STAR-19792';
      const body = { has_contribution: true, lever_codes: ['L1'] };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_PoolFundingAlignment(resultCode, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith(
        'v1/results/19792/pool-funding-alignment',
        body,
        {}
      );
    });
  });

  describe('DELETE methods', () => {
    it('should call DELETE_Result', () => {
      const resultCode = 123;
      (mockToPromiseService.delete as jest.Mock).mockResolvedValue({ data: {} });

      service.DELETE_Result(resultCode);

      expect(mockToPromiseService.delete).toHaveBeenCalledWith('results/123/delete', { useResultInterceptor: true });
    });
  });

  describe('Utility methods', () => {
    it('should clean body correctly', () => {
      const body = {
        stringValue: 'test',
        numberValue: 123,
        arrayValue: [1, 2, 3],
        objectValue: { key: 'value' },
        nullValue: null
      };

      service.cleanBody(body);

      expect(body.stringValue).toBe('');
      expect(body.numberValue).toBeNull();
      expect(body.arrayValue).toEqual([]);
      expect(body.objectValue).toBeNull();
      expect(body.nullValue).toBeNull();
    });

    it('should update signal body correctly', () => {
      const newBody = { newKey: 'newValue', nullKey: null };
      const updateSpy = jest.fn();

      service.updateSignalBody({ update: updateSpy } as any, newBody);

      expect(updateSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should invoke update callback so body is merged (cover update callback)', () => {
      const newBody = { a: 1, b: null };
      const updateSpy = jest.fn((fn: (prev: Record<string, unknown>) => Record<string, unknown>) => fn({ existing: true }));

      service.updateSignalBody({ update: updateSpy } as any, newBody);

      expect(updateSpy).toHaveBeenCalled();
      const result = updateSpy.mock.results[0].value;
      expect(result).toEqual({ existing: true, a: 1 });
    });

    it('should build find contracts params correctly', () => {
      const filters = {
        'current-user': true,
        'contract-code': 'TEST123',
        'project-name': 'Test Project',
        'principal-investigator': 'John Doe',
        lever: 'test-lever',
        status: 'active',
        'start-date': '2024-01-01',
        'end-date': '2024-12-31',
        'funding-type': 'BLR,RUN',
        'with-indicators': false
      };

      const result = (service as any).buildFindContractsParams(filters);

      expect(result.get('current-user')).toBe('true');
      expect(result.get('contract-code')).toBe('TEST123');
      expect(result.get('project-name')).toBe('Test Project');
      expect(result.get('principal-investigator')).toBe('John Doe');
      expect(result.get('lever')).toBe('test-lever');
      expect(result.get('status')).toBe('active');
      expect(result.get('start-date')).toBe('2024-01-01');
      expect(result.get('end-date')).toBe('2024-12-31');
      expect(result.get('funding-type')).toBe('BLR,RUN');
      expect(result.get('with-indicators')).toBe('false');
    });

    it('should build find contracts params with empty filters', () => {
      const result = (service as any).buildFindContractsParams();

      expect(result).toBeInstanceOf(HttpParams);
    });

    it('should build find contracts params with null/empty values', () => {
      const filters = {
        'current-user': true,
        'contract-code': '',
        'project-name': null,
        lever: undefined
      };

      const result = (service as any).buildFindContractsParams(filters);

      expect(result.get('current-user')).toBe('true');
      expect(result.get('contract-code')).toBeNull();
      expect(result.get('project-name')).toBeNull();
      expect(result.get('lever')).toBeNull();
    });

    it('should build find contracts params with zero and false values', () => {
      const filters = {
        limit: 0,
        'exclude-pooled-funding': false,
        'with-indicators': false
      };

      const result = (service as any).buildFindContractsParams(filters);

      expect(result.get('limit')).toBe('0');
      expect(result.get('exclude-pooled-funding')).toBe('false');
      expect(result.get('with-indicators')).toBe('false');
    });

    it('should include pool-funding-contributor in the URL when set (regression — T-BIL-TV-04 allowlist)', () => {
      const filters = {
        'current-user': false,
        'pool-funding-contributor': true,
        page: 1,
        limit: 50
      };

      const result = (service as any).buildFindContractsParams(filters);

      expect(result.get('pool-funding-contributor')).toBe('true');
    });
  });

  describe('Special methods', () => {
    it('should call saveErrors', () => {
      const error = { message: 'test error', original_error: {} } as any;
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.saveErrors(error);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('', { error }, { isAuth: environment.saveErrorsUrl });
    });

    it('should call GET_CurrentUser', () => {
      const token = 'test-token';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_CurrentUser(token);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('authorization/users/current', { isAuth: true, token });
    });

    it('should call GET_GithubVersion', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_GithubVersion();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('', { isAuth: expect.stringContaining(environment.frontVersionUrl), noCache: true });
    });
  });

  describe('Additional GET methods', () => {
    it('should call GET_Configuration', () => {
      const id = '123';
      const section = 'test';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Configuration(id, section);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('user/configuration/123?component=test', {});
    });

    it('should call GET_ConfigurationByKey with encoded path segment', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ConfigurationByKey('date-format');

      expect(mockToPromiseService.get).toHaveBeenCalledWith('configuration/date-format', {});
    });

    it('should call GET_ConfigurationByKey for dotted configuration key', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ConfigurationByKey('BULK_UPLOAD.EMBED_INFO.URL');

      expect(mockToPromiseService.get).toHaveBeenCalledWith('configuration/BULK_UPLOAD.EMBED_INFO.URL', {});
    });

    it('should call GET_AppConfigList without query string when query is empty', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_AppConfigList();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('configuration', {});
    });

    it('should call GET_AppConfigList with encoded query params', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_AppConfigList({
        search: '  term  ',
        category: 'EMAIL',
        subcategory: 'SMTP',
        sortField: 'key',
        sortOrder: 'DESC'
      });

      const url = (mockToPromiseService.get as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('configuration?');
      expect(url).toContain('search=term');
      expect(url).toContain('category=EMAIL');
      expect(url).toContain('subcategory=SMTP');
      expect(url).toContain('sort-field=key');
      expect(url).toContain('sort-order=DESC');
    });

    it('should call GET_AppConfigCategories', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_AppConfigCategories();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('configuration/categories-and-subcategories', {});
    });

    it('should call PATCH_AppConfigByKey with encoded key', async () => {
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });
      const body = { simple_value: 'updated' };

      await service.PATCH_AppConfigByKey('APP.FEATURE', body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('configuration/APP.FEATURE', body, {});
    });

    it('should call GET_UserStaff', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_UserStaff();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/staff', {});
    });

    it('should call GET_GeneralInformation', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_GeneralInformation(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/general-information', { loadingTrigger: true, useResultInterceptor: true });
    });

    it('should call GET_Versions', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Versions(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/versions/123', { useResultInterceptor: true });
    });

    it('should call GET_InnovationReadinessLevels', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InnovationReadinessLevels();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/innovation-readiness-levels', {});
    });

    it('should call GET_InnovationCharacteristics', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InnovationCharacteristics();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/innovation-characteristics', {});
    });

    it('should call GET_InnovationTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InnovationTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/innovation-types', {});
    });

    it('should call GET_InstitutionTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_InstitutionTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions-types', {});
    });

    it('should call GET_SubInstitutionTypes without code', () => {
      const depthLevel = 2;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SubInstitutionTypes(depthLevel);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions-types/depth-level/2', {});
    });

    it('should call GET_SubInstitutionTypes with code', () => {
      const depthLevel = 2;
      const code = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SubInstitutionTypes(depthLevel, code);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/institutions-types/depth-level/2?code=123', {});
    });

    it('should call GET_ActorTypes', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ActorTypes();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/actor-types', {});
    });

    it('should call GET_Partners', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Partners(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/institutions/by-result-id/123?role=partners', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_InnovationDetails', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_InnovationDetails(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/innovation-dev/123', { loadingTrigger: true, useResultInterceptor: true });
    });

    it('should call GET_ResultEvidences', () => {
      const resultId = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ResultEvidences(resultId);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/evidences/principal/123', { loadingTrigger: true, useResultInterceptor: true });
    });

    it('should call GET_Years without parameters', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Years();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/year', { params: new HttpParams() });
    });

    it('should call GET_Years with resultCode', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Years(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/year', { params: new HttpParams().set('resultCode', '123') });
    });

    it('should call GET_Years with resultCode and reportYear', () => {
      const resultCode = 123;
      const reportYear = 2024;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Years(resultCode, reportYear);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/year', {
        params: new HttpParams().set('resultCode', '123').set('reportYear', '2024')
      });
    });

    it('should call GET_IpOwners', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_IpOwners();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/intellectual-property/owners', { loadingTrigger: true });
    });

    it('should call GET_ApplicationOptions', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ApplicationOptions();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/intellectual-property/application-options', { loadingTrigger: true });
    });

    it('should call GET_DisseminationQualifications without id', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_DisseminationQualifications();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('dissemination-qualifications', {});
    });

    it('should call GET_DisseminationQualifications with id', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_DisseminationQualifications(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('dissemination-qualifications/123', {});
    });

    it('should call GET_ToolFunctions', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ToolFunctions();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tool-functions', {});
    });

    it('should call GET_ExpansionPotentials', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ExpansionPotentials();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('expansion-potentials', {});
    });

    it('should call GET_IpOwner', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_IpOwner(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/intellectual-property/123', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_CapacitySharing', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_CapacitySharing();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/capacity-sharing/by-result-id/123', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_PolicyChange', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_PolicyChange(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/policy-change/by-result-id/123', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_Alignments', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Alignments(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/alignments', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_Alignments with portfolio query params', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Alignments(id, { portfolioId: 2, return: true });

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/alignments', {
        params: expect.any(Object),
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_SessionFormat', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SessionFormat();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('session/format', {});
    });

    it('should call GET_SessionType', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SessionType();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('session/type', {});
    });

    it('should call GET_Degrees', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Degrees();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('degree', {});
    });

    it('should call GET_SessionLength', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SessionLength();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('session/length', {});
    });

    it('should call GET_Gender', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Gender();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('gender', {});
    });

    it('should call GET_Metadata', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Metadata(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/metadata', {
        useResultInterceptor: true
      });
    });

    it('should call GET_Countries without params', () => {
      (mockToPromiseService.getWithParams as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Countries();

      expect(mockToPromiseService.getWithParams).toHaveBeenCalledWith('tools/clarisa/countries', undefined);
    });

    it('should call GET_Countries with params', () => {
      const params = { 'is-sub-national': true };
      (mockToPromiseService.getWithParams as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Countries(params);

      expect(mockToPromiseService.getWithParams).toHaveBeenCalledWith('tools/clarisa/countries', {
        'is-sub-national': 'true'
      });
    });

    it('should call GET_DeliveryModalities', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_DeliveryModalities();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('delivery-modalities', {});
    });

    it('should call GET_Languages', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Languages();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/languages', {});
    });

    it('should call GET_SessionPurpose', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SessionPurpose();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('session/purpose', {});
    });

    it('should call GET_ContractsByUser', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ContractsByUser();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/results/current-user', {});
    });

    it('should call GET_FindContracts without filters', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_FindContracts();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/find-contracts', { params: new HttpParams() });
    });

    it('should call GET_FindContracts with filters', () => {
      const filters = {
        'current-user': true,
        'contract-code': 'TEST123',
        'project-name': 'Test Project'
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_FindContracts(filters);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/find-contracts', { params: expect.any(HttpParams) });
    });

    it('should call GET_FindContracts with funding-type filter', () => {
      const filters = {
        'current-user': false,
        'funding-type': 'BLR,RUN'
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_FindContracts(filters);

      const callArgs = (mockToPromiseService.get as jest.Mock).mock.calls.at(-1);
      expect(callArgs?.[0]).toBe('agresso/contracts/find-contracts');
      expect(callArgs?.[1].params.get('funding-type')).toBe('BLR,RUN');
    });

    it('should call GET_ResultsCount', () => {
      const agreementId = 'TEST123';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ResultsCount(agreementId);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/TEST123/results/count', {});
    });

    it('should call GET_TopContributorsContracts', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_TopContributorsContracts('A100', 5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-contributors-contracts?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_TopPartners', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_TopPartners('A100', 5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-partners?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_TopMainContactPersons', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_TopMainContactPersons('A100', 5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-main-contact-persons?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_TopMainContactPersons with the default limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_TopMainContactPersons('A100');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-main-contact-persons?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_TopPrimaryLevers', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_TopPrimaryLevers('A100', 5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-primary-levers?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_GeoScope', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_GeoScope('A100', 5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/geo-scope?contract-id=A100&limit=5',
        {}
      );
    });

    it('should call GET_ResultsByContractId', () => {
      const contractId = 'TEST123';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ResultsByContractId(contractId);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/contracts/TEST123', {});
    });

    it('should call GET_ResultsStatus', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ResultsStatus();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/status/result-amount/current-user', {});
    });

    it('should call GET_AllResultStatus', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AllResultStatus();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/status', {});
    });

    it('should call GET_IndicatorsResultsAmount', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_IndicatorsResultsAmount();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('indicators/results-amount/current-user', {});
    });

    it('should call GET_LatestResults', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_LatestResults();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/last-updated/current-user?limit=3', {});
    });

    it('should call GET_GeoLocation', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_GeoLocation(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/geo-location', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call GET_Regions', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_Regions();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/regions', {});
    });

    it('should call GET_GeoSearch', () => {
      const scope = 'countries';
      const search = 'test';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_GeoSearch(scope, search);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/manager/opensearch/countries/search?query=test', {});
    });

    it('should call GET_OpenSearchCountries', () => {
      const search = 'test';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_OpenSearchCountries(search);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/manager/opensearch/countries/search?query=test', {});
    });

    it('should call GET_OpenSearchSubNationals without filters', () => {
      const search = 'test';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_OpenSearchSubNationals(search);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/manager/opensearch/subnational/search?query=test', {});
    });

    it('should call GET_OpenSearchSubNationals with filters', () => {
      const search = 'test';
      const filters = { country: 'US' };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_OpenSearchSubNationals(search, filters);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/manager/opensearch/subnational/search?query=test&country=US', {});
    });

    it('should call GET_OpenSearchResult', () => {
      const search = 'test';
      const sampleSize = 10;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_OpenSearchResult(search, sampleSize);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('opensearch/result/search?query=test&sample-size=10', {});
    });

    it('should call GET_AnnouncementSettingAvailable', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AnnouncementSettingAvailable();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('announcement-setting/available', {});
    });

    it('should call GET_AllSubmitionStatus', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AllSubmitionStatus();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/green-checks/change/status', {});
    });

    it('should call GET_ReviewStatuses', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ReviewStatuses();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/status/review-statuses', {});
    });

    it('should call GET_ResultStatus with id', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_ResultStatus('456');

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/status/456', {});
    });

    it('should call GET_NextStep with only resultCode', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_NextStep(123);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/status/workflow/result/123/next-step', {});
    });

    it('should call GET_NextStep with reportingPlatforms and reportYear', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      await service.GET_NextStep(123, 'STAR', 2024);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'results/status/workflow/result/123/next-step?reportingPlatforms=STAR&reportYear=2024',
        {}
      );
    });

    it('should call GET_GreenChecks', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_GreenChecks(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/green-checks/123', {});
    });

    it('should call GET_SubmitionHistory', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_SubmitionHistory(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/green-checks/history/123', {
        useResultInterceptor: true
      });
    });

    it('should call GET_MaturityLevels', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_MaturityLevels();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('maturity-levels', {});
    });

    it('should call GET_OicrResults', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_OicrResults();

      expect(mockToPromiseService.get).toHaveBeenCalledWith('temp/oicrs', {});
    });

    it('should call GET_ValidateTitle', () => {
      const title = 'Test Title';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ValidateTitle(title);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/validate-title?title=Test Title', {});
    });

    it('should call GET_ValidateTitle with empty title', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_ValidateTitle('');

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/validate-title', {});
    });

    it('should call PATCH_Oicr', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Oicr(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/oicr/123', body, { useResultInterceptor: true });
    });

    it('should call GET_Oicr', () => {
      const id = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Oicr(id);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/oicr/123', { loadingTrigger: true, useResultInterceptor: true });
    });

    it('should call GET_AllianceStaff', () => {
      const groupId = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AllianceStaff(groupId);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/alliance-user-staff/by-groups/map?groupId=123', {});
    });

    it('should call GET_AllianceStaff without groupId', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_AllianceStaff(0);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/alliance-user-staff/by-groups/map', {});
    });

    it('should call GET_GreenChecks with platform', () => {
      const resultCode = 123;
      const platform = 'test-platform';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_GreenChecks(resultCode, platform);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/green-checks/123?reportingPlatforms=test-platform', {});
    });

    it('should call GET_Metadata with platform', () => {
      const id = 123;
      const platform = 'test-platform';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_Metadata(id, platform);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/123/metadata', {
        useResultInterceptor: true,
        platform: 'test-platform'
      });
    });

    it('should call GET_ContractsByUser with order parameters', () => {
      const orderField = 'name';
      const direction = 'asc';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ContractsByUser(orderField, direction);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/results/current-user&order-field=name&direction=asc', {});
    });

    it('should call GET_ContractsByUser with only orderField', () => {
      const orderField = 'name';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ContractsByUser(orderField);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/results/current-user&order-field=name', {});
    });

    it('should call GET_ContractsByUser with only direction', () => {
      const direction = 'asc';
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });

      service.GET_ContractsByUser(undefined, direction);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('agresso/contracts/results/current-user&direction=asc', {});
    });

    it('should call GET_OICRDetails', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_OICRDetails(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/oicr/details/123', {});
    });

    it('should call GET_OICRModal', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_OICRModal(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/oicr/123/modal', {});
    });

    it('should call GET_OICRMetadata', () => {
      const resultCode = 123;
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });

      service.GET_OICRMetadata(resultCode);

      expect(mockToPromiseService.get).toHaveBeenCalledWith('temp/oicrs/123/metadata', {});
    });

    it('should call fastResponse', () => {
      const body = { prompt: 'test', input_text: 'test input' };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });

      service.fastResponse(body);

      expect(mockToPromiseService.post).toHaveBeenCalledWith('fast-response', body, {
        isAuth: environment.fastResponseUrl,
        clarisaApiKey: true
      });
    });
  });

  describe('Additional PATCH methods', () => {
    it('should call PATCH_GeoLocation', () => {
      const id = 123;
      const body = { test: 'data' };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_GeoLocation(id, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('results/123/geo-location', body, { useResultInterceptor: true });
    });
  });

  describe('GET_Results method', () => {
    const v2Base = 'v2/results?page=1&limit=10000&sort-order=DESC&sort-field=code';
    const ownFalse = '&only-own-results=false';

    it('should call GET_Results with basic filter', async () => {
      const resultFilter = { 'indicator-codes-tabs': [101, 102] };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}&indicators=101%2C102${ownFalse}`, {});
    });

    it('should call GET_Results with indicator-codes-filter', async () => {
      const resultFilter = { 'indicator-codes-filter': [101, 102] };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}&indicators=101%2C102${ownFalse}`, {});
    });

    it('should call GET_Results with resultConfig (ignored in v2 query string)', async () => {
      const resultFilter = {};
      const resultConfig: import('../interfaces/result/result.interface').ResultConfig = { 'audit-data': true, 'result-status': false };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter, resultConfig);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}${ownFalse}`, {});
    });

    it('should call GET_Results with complex filters', async () => {
      const resultFilter: import('../interfaces/result/result.interface').ResultFilter = {
        'indicator-codes-tabs': [101],
        'status-codes': [1, 2],
        years: [2024]
      };
      const resultConfig: import('../interfaces/result/result.interface').ResultConfig = { 'audit-data': true };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter, resultConfig);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        `${v2Base}&indicators=101&status-codes=1%2C2&years=2024${ownFalse}`,
        {}
      );
    });

    it('should call GET_Results with empty arrays', async () => {
      const resultFilter = {
        'indicator-codes-tabs': [],
        status: ['active']
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter as import('../interfaces/result/result.interface').ResultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}&status=active${ownFalse}`, {});
    });

    it('should call GET_Results with no parameters', async () => {
      const resultFilter = {};
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}${ownFalse}`, {});
    });

    it('should map pagination and search query params', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results({}, undefined, {
        page: 2,
        limit: 25,
        sortField: 'result-title',
        sortOrder: 'ASC',
        search: 'hello world'
      });

      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'v2/results?page=2&limit=25&sort-order=ASC&sort-field=result-title&search=hello%20world&only-own-results=false',
        {}
      );
    });

    it('should send only-own-results true when create-user-codes filter is set', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results({ 'create-user-codes': ['356'] } as import('../interfaces/result/result.interface').ResultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'v2/results?page=1&limit=10000&sort-order=DESC&sort-field=code&only-own-results=true',
        {}
      );
    });

    it('should use indicator-codes when tabs and filter are empty', async () => {
      const resultFilter = { 'indicator-codes': [7, 8] };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0 } });

      await service.GET_Results(resultFilter);

      expect(mockToPromiseService.get).toHaveBeenCalledWith(`${v2Base}&indicators=7%2C8${ownFalse}`, {});
    });

    it('should set total from rows length when envelope has no total or pagination.total', async () => {
      const row = {
        result_id: 2,
        result_official_code: 200,
        platform_code: 'PRMS',
        title: 'Row',
        indicator_id: 1
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({
        data: {
          data: [row]
        }
      });

      const out = await service.GET_Results({});

      expect(out.data?.total).toBe(1);
      expect(out.data?.results?.length).toBe(1);
      expect(out.data?.pagination).toBeUndefined();
    });

    it('should use envelope total when data is not an array', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({
        data: {
          data: { notAnArray: true } as unknown as [],
          total: 42
        }
      });

      const out = await service.GET_Results({});

      expect(out.data?.total).toBe(42);
      expect(out.data?.results?.length).toBe(0);
    });

    it('should unwrap when raw.data is a row array', async () => {
      const row = {
        result_id: 3,
        result_official_code: 300,
        platform_code: 'STAR',
        title: 'Arr',
        indicator_id: 1
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({
        data: [row]
      });

      const out = await service.GET_Results({});

      expect(out.data?.total).toBe(1);
      expect(out.data?.results?.length).toBe(1);
    });

    it('should unwrap v2 envelope with nested pagination.total for table totalRecords', async () => {
      const row = {
        result_id: 1,
        result_official_code: 100,
        platform_code: 'PRMS',
        title: 'T',
        indicator_id: 1,
        status_id: 4,
        status_name: 'Draft'
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({
        data: {
          data: [row],
          pagination: {
            total: 3472,
            page: 1,
            limit: 25,
            pageSize: 25,
            totalPages: 139,
            hasNextPage: true,
            hasPreviousPage: false
          }
        }
      });

      const out = await service.GET_Results({}, undefined, { page: 1, limit: 25 });

      expect(out.data?.total).toBe(3472);
      expect(out.data?.results?.length).toBe(1);
      expect(out.data?.pagination?.total).toBe(3472);
      expect(out.data?.pagination?.hasNextPage).toBe(true);
    });
  });

  describe('GET_ResultCenterXlsx', () => {
    it('should call getBlob with reports path and params aligned with GET_Results (no page/limit)', async () => {
      const blob = new Blob(['x']);
      (mockToPromiseService.getBlob as jest.Mock).mockResolvedValue(blob);

      const result = await service.GET_ResultCenterXlsx(
        { 'indicator-codes-tabs': [101], 'status-codes': [1, 2] },
        { sortField: 'result-title', sortOrder: 'ASC', search: 'hello' }
      );

      expect(result).toBe(blob);
      expect(mockToPromiseService.getBlob).toHaveBeenCalledWith('reports/resultCenter/xlsx', {
        params: expect.any(HttpParams)
      });
      const params = (mockToPromiseService.getBlob as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('sort-order')).toBe('ASC');
      expect(params.get('sort-field')).toBe('result-title');
      expect(params.get('search')).toBe('hello');
      expect(params.get('indicators')).toBe('101');
      expect(params.get('status-codes')).toBe('1,2');
      expect(params.get('only-own-results')).toBe('false');
    });

    it('should send only-own-results true when create-user-codes is set', async () => {
      (mockToPromiseService.getBlob as jest.Mock).mockResolvedValue(new Blob());

      await service.GET_ResultCenterXlsx({ 'create-user-codes': ['356'] } as import('../interfaces/result/result.interface').ResultFilter, {});

      const params = (mockToPromiseService.getBlob as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('only-own-results')).toBe('true');
    });

    it('should map indicators from indicator-codes-filter when tabs are absent', async () => {
      (mockToPromiseService.getBlob as jest.Mock).mockResolvedValue(new Blob());

      await service.GET_ResultCenterXlsx({ 'indicator-codes-filter': [55, 66] }, {});

      const params = (mockToPromiseService.getBlob as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('indicators')).toBe('55,66');
    });

    it('should map indicators from indicator-codes when tabs and filter are absent', async () => {
      (mockToPromiseService.getBlob as jest.Mock).mockResolvedValue(new Blob());

      await service.GET_ResultCenterXlsx({ 'indicator-codes': [7, 8] }, {});

      const params = (mockToPromiseService.getBlob as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('indicators')).toBe('7,8');
    });
  });

  describe('GET_ResultPdfReport', () => {
    it('should request the PDF report envelope with params and return the report URL response', async () => {
      const response = {
        data: 'https://microservice-reports.s3.amazonaws.com/STAR-result-22603_20260623_1457',
        status: 200,
        description: 'PDF report sections were found correctly',
        timestamp: '2026-06-23T14:57:23.433Z',
        path: '/api/reports/19821/pdf?is-html=false&report_name=cap_sharing&reportingPlatforms=STAR'
      };
      (mockToPromiseService.get as jest.Mock).mockResolvedValue(response);

      const result = await service.GET_ResultPdfReport('STAR-22603', 'STAR');

      expect(result).toBe(response);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('reports/STAR-22603/pdf', {
        params: expect.any(HttpParams)
      });
      expect(mockToPromiseService.getBlob).not.toHaveBeenCalledWith(expect.stringContaining('reports/STAR-22603/pdf'), expect.anything());

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('is-html')).toBe('false');
      expect(params.get('report_name')).toBe('cap_sharing');
      expect(params.get('reportingPlatforms')).toBe('STAR');
    });

    it('should use STAR as the default reporting platform', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: 'pdf-url' });

      await service.GET_ResultPdfReport('STAR-8');

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('reportingPlatforms')).toBe('STAR');
    });

    it('should include reportYear when provided', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: 'pdf-url' });

      await service.GET_ResultPdfReport('8', 'STAR', 2026);

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('reportYear')).toBe('2026');
    });

    it('should omit reportYear when not provided', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: 'pdf-url' });

      await service.GET_ResultPdfReport('8', 'STAR');

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('reportYear')).toBeNull();
    });

    it('should use inn_dev as report_name when provided', async () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: 'pdf-url' });

      await service.GET_ResultPdfReport('8', 'STAR', 2026, 'inn_dev');

      const params = (mockToPromiseService.get as jest.Mock).mock.calls[0][1].params as HttpParams;
      expect(params.get('report_name')).toBe('inn_dev');
      expect(params.get('reportYear')).toBe('2026');
    });
  });

  describe('Additional GET methods', () => {
    it('should call GET_InformativeRoles', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_InformativeRoles();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('informative-roles', {});
    });

    it('should call GET_GlobalTargets with impactAreaId', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_GlobalTargets(1);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/global-targets/impact-area/1', {});
    });

    it('should call GET_ImpactAreaScores', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_ImpactAreaScores();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('impact-area-score', {});
    });

    it('should call GET_ReferencesType', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_ReferencesType();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('notable-reference-types', {});
    });

    it('should call GET_GeneralReport', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_GeneralReport();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('results/general-report/all', {});
    });

    it('should call GET_TopContributorsContracts with encoded contract id and default limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_TopContributorsContracts('A 100/1');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-contributors-contracts?contract-id=A%20100%2F1&limit=5',
        {}
      );
    });

    it('should call GET_TopPartners with encoded contract id and custom limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_TopPartners('A 100/1', 8);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-partners?contract-id=A%20100%2F1&limit=8',
        {}
      );
    });

    it('should call GET_TopPartners with the default limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_TopPartners('A 100/1');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-partners?contract-id=A%20100%2F1&limit=5',
        {}
      );
    });

    it('should call GET_TopPrimaryLevers with encoded contract id and custom limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_TopPrimaryLevers('A 100/1', 4);
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-primary-levers?contract-id=A%20100%2F1&limit=4',
        {}
      );
    });

    it('should call GET_TopPrimaryLevers with the default limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_TopPrimaryLevers('A 100/1');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/top-primary-levers?contract-id=A%20100%2F1&limit=5',
        {}
      );
    });

    it('should call GET_ContractStaff with encoded contract id', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_ContractStaff('A 100/1');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/contract-staff?contract-id=A%20100%2F1',
        {}
      );
    });

    it('should call GET_GeoScope with encoded contract id and default limit', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_GeoScope('A 100/1');
      expect(mockToPromiseService.get).toHaveBeenCalledWith(
        'agresso/contracts/reports/geo-scope?contract-id=A%20100%2F1&limit=5',
        {}
      );
    });

    it('should call GET_LinkedResults with id', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_LinkedResults(123);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('link-results/details/123', {
        loadingTrigger: true,
        useResultInterceptor: true
      });
    });

    it('should call PATCH_LinkedResults with id and body', () => {
      const body = { id: 123, linked_results: [] };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });
      service.PATCH_LinkedResults(123, body);
      expect(mockToPromiseService.patch).toHaveBeenCalledWith('link-results/details/123', body, {
        useResultInterceptor: true
      });
    });

    it('should call GET_ImpactAreas', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_ImpactAreas();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('tools/clarisa/impact-areas', {});
    });

    it('should call POST_feedback with body', () => {
      const body = { interaction_id: 1, feedback: 'positive' };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });
      service.POST_feedback(body);
      expect(mockToPromiseService.post).toHaveBeenCalledWith('interactions', body, {
        isAuth: environment.feedbackUrl
      });
    });

    it('should call GET_LeverStrategicOutcomes with leverId', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_LeverStrategicOutcomes(5);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('lever-strategic-outcome/by-lever/5', {});
    });

    it('should call GET_LeverSdgTargets with only_sdg_targets query when second arg true (default)', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_LeverSdgTargets(3, true);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('lever-sdg-targets/by-lever/3?only_sdg_targets=true', {});
    });

    it('should call GET_LeverSdgTargets with default onlySdgTargets when second arg omitted', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_LeverSdgTargets(4);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('lever-sdg-targets/by-lever/4?only_sdg_targets=true', {});
    });

    it('should call GET_LeverSdgTargets without query when onlySdgTargets is false', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_LeverSdgTargets(3, false);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('lever-sdg-targets/by-lever/3', {});
    });

    it('should call GET_LeverSdgTargetMappings on lever-sdg-targets', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: [] });
      service.GET_LeverSdgTargetMappings();
      expect(mockToPromiseService.get).toHaveBeenCalledWith('lever-sdg-targets', {});
    });

    it('should call PATCH_LeverSdgTargets with list body', () => {
      const body = { leverSdgTargetList: [{ id: 0, lever_id: 1, sdg_target_id: 2 }] };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });
      service.PATCH_LeverSdgTargets(body);
      expect(mockToPromiseService.patch).toHaveBeenCalledWith('lever-sdg-targets', body, {});
    });

    it('should call PATCH_Portfolio with id in path', () => {
      const body = {
        name: 'Portfolio',
        description: 'Description',
        start_year: 2026,
        end_year: 2030
      };
      (mockToPromiseService.patch as jest.Mock).mockResolvedValue({ data: {} });

      service.PATCH_Portfolio(7, body);

      expect(mockToPromiseService.patch).toHaveBeenCalledWith('portfolios/7', body, {});
    });

    it('should call DELETE_LeverSdgTargetMapping for id in path', () => {
      (mockToPromiseService.delete as jest.Mock).mockResolvedValue({ data: {} });
      service.DELETE_LeverSdgTargetMapping(42);
      expect(mockToPromiseService.delete).toHaveBeenCalledWith('lever-sdg-targets/42', {});
    });

    it('should call DELETE_Portfolio with id in path', () => {
      (mockToPromiseService.delete as jest.Mock).mockResolvedValue({ data: {} });

      service.DELETE_Portfolio(7);

      expect(mockToPromiseService.delete).toHaveBeenCalledWith('portfolios/7', {});
    });

    it('should call GET_AutorContact with resultCode', () => {
      (mockToPromiseService.get as jest.Mock).mockResolvedValue({ data: {} });
      service.GET_AutorContact(12345);
      expect(mockToPromiseService.get).toHaveBeenCalledWith('result-user/author-contact/by-result/12345', {
        useResultInterceptor: true
      });
    });

    it('should call POST_AutorContact with body and resultCode', () => {
      const body = { user_id: 1, informative_role_id: 2 };
      (mockToPromiseService.post as jest.Mock).mockResolvedValue({ data: {} });
      service.POST_AutorContact(body, 12345);
      expect(mockToPromiseService.post).toHaveBeenCalledWith('result-user/author-contact/save-by-result/12345', body, {});
    });

    it('should call DELETE_AutorContact with resultUserId and resultId', () => {
      (mockToPromiseService.delete as jest.Mock).mockResolvedValue({ data: {} });
      service.DELETE_AutorContact(10, 12345);
      expect(mockToPromiseService.delete).toHaveBeenCalledWith('result-user/author-contact/10/by-result/12345', {
        useResultInterceptor: true
      });
    });
  });
});
