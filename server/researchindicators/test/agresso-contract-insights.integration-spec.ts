import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  INestApplication,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AgressoContractController } from '../src/domain/entities/agresso-contract/agresso-contract.controller';
import { AgressoContractService } from '../src/domain/entities/agresso-contract/agresso-contract.service';
import { AgressoContractRepository } from '../src/domain/entities/agresso-contract/repositories/agresso-contract.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { AppConfig } from '../src/domain/shared/utils/app-config.util';
import { ClarisaLeversService } from '../src/domain/tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { ResponseInterceptor } from '../src/domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from '../src/domain/shared/error-management/global.exception';
import { ContractInsightsReportDto } from '../src/domain/entities/agresso-contract/dto/contract-insights-report.dto';

// @sdd-spec docs/specs/changes/project-dashboard-v3/f4-advanced-insights — T-05
//
// In-process HTTP-path integration spec for GET /reports/insights
// Requirements: R-IN-001 (envelope behavior through the real HTTP path,
// six-section tri-state: fulfilled / null+error / all-fail 500)
// Design: §10 (HTTP-path integration spec)
//
// KZ-017 OWNER & DISQUALIFICATION GUARD:
// - Bootstraps an isolated TestingModule containing ONLY AgressoContractController
//   + AgressoContractService.
// - Repository is mocked via TestModule provider replacement — MUST NOT import
//   AppModule, open a TypeORM DataSource, connect to MySQL/RabbitMQ/OpenSearch,
//   or reach any remote network (K-021).
// - Real HTTP pipeline is exercised via supertest against app.getHttpServer()
//   with the real ResponseInterceptor (ServerResponseDto wire envelope wrapping)
//   and the real GlobalExceptions filter.
//
// 401 AUTHENTICATION COVERAGE CITATION:
// - As for F3's T-05 (design §10), 401 unauthorized rejection is a unit test on
//   JwtMiddleware, verified in `src/domain/shared/middlewares/jwr.middleware.spec.ts`
//   -> 'rejects missing authorization header'. The auth middleware is excluded
//   from this isolated in-process HTTP spec to keep integration execution
//   strictly in-process, deterministic, and infra-free.
//
// D-F4-3: unlike F3, sections are NEVER omitted — all six keys are always
// present in `data`; a rejected section resolves to `null` + an envelope
// `errors` entry, and only a rejection of ALL six sections escalates to 500
// (the controller's own repository call, per as-built T-04, throws
// InternalServerErrorException in that case; `getInsightsReport` here mocks
// AgressoContractRepository.getInsightsReport directly, matching the
// service's pass-through).

describe('T-05 — AgressoContractInsights (HTTP-path integration, in-process)', () => {
  let app: INestApplication;
  let mockRepository: {
    getInsightsReport: jest.Mock;
  };

  beforeAll(async () => {
    mockRepository = {
      getInsightsReport: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AgressoContractController],
      providers: [
        AgressoContractService,
        {
          provide: AgressoContractRepository,
          useValue: mockRepository,
        },
        {
          provide: CurrentUserUtil,
          useValue: { user_id: 1, user: { sec_user_id: 1 } },
        },
        {
          provide: AppConfig,
          useValue: { BUCKET_URL: 'https://test-bucket' },
        },
        {
          provide: ClarisaLeversService,
          useValue: {
            homologatedData: jest.fn(),
            findByShortName: jest.fn(),
            resolveIconUrl: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptions());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Live-shaped fixtures (KZ-001) — six real section DTO shapes, including the
  // label fields on review_flow rows (R-IN-001 C-3 — no bare ids).
  // ---------------------------------------------------------------------------
  const fullReport: ContractInsightsReportDto = {
    reach: {
      meta: { total_results: 20, n: 20 },
      overall: {
        women_youth: 30,
        women_not_youth: 45,
        men_youth: 22,
        men_not_youth: 18,
        total: 115,
      },
      by_actor_type: [
        {
          actor_type_id: 1,
          actor_type_name: 'Farmer',
          women_youth: 20,
          women_not_youth: 25,
          men_youth: 12,
          men_not_youth: 10,
          total: 67,
        },
        {
          actor_type_id: 5,
          actor_type_name: 'Cooperative extension agent',
          women_youth: 10,
          women_not_youth: 20,
          men_youth: 10,
          men_not_youth: 8,
          total: 48,
        },
      ],
      not_disaggregated_rows: 3,
    },
    sdg_coverage: {
      meta: { total_results: 20, n: 14 },
      sdgs: [
        {
          sdg_id: 2,
          short_name: 'SDG 2',
          full_name: 'Zero Hunger',
          count: 9,
        },
        {
          sdg_id: 13,
          short_name: 'SDG 13',
          full_name: 'Climate Action',
          count: 5,
        },
      ],
    },
    evidence: {
      meta: { total_results: 20, n: 11 },
      results_with_evidence: 11,
      evidences_total: 16,
      public_count: 12,
      private_count: 4,
      by_role: [
        { evidence_role_id: 1, name: 'Publication', count: 9 },
        { evidence_role_id: 2, name: 'Data source', count: 7 },
      ],
    },
    review_flow: {
      meta: { total_results: 20, n: 8 },
      by_event_type: [
        {
          event_type: 'RESULT_SUBMITTED',
          label: 'Result submitted',
          count: 8,
        },
        {
          event_type: 'REVIEW_DECISION',
          label: 'Review decision',
          count: 6,
        },
      ],
      by_decision: [
        { decision: 'APPROVE', label: 'Approved', count: 5 },
        { decision: 'REJECT', label: 'Rejected', count: 1 },
      ],
      cycle_time: { median_days: 4, p90_days: 9, sample_size: 5 },
      excluded_for_incomplete_history: 3,
    },
    contributing_levers: {
      meta: { total_results: 20, n: 6 },
      levers: [
        {
          lever_id: 3,
          short_name: 'Livestock and Aquatic Foods',
          full_name: 'Sustainable Animal and Aquatic Foods',
          count: 4,
        },
      ],
    },
    keywords: {
      meta: { total_results: 20, n: 17 },
      keywords: [
        { keyword: 'soil health', count: 6 },
        { keyword: 'climate resilience', count: 4 },
        { keyword: 'gender equity', count: 3 },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Case 1: All six sections present -> 200 with all six keys carrying data
  // ---------------------------------------------------------------------------
  it('Case 1: All six sections present -> 200 with full envelope and all six data keys', async () => {
    mockRepository.getInsightsReport.mockResolvedValueOnce({
      data: fullReport,
      errors: [],
    });

    const res = await request(app.getHttpServer())
      .get('/reports/insights')
      .query({ 'contract-id': 'A511' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract insights report retrieved successfully',
      data: fullReport,
      errors: [],
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/insights');

    // R-IN-001: sections are NEVER omitted — all six keys present, none undefined.
    for (const key of [
      'reach',
      'sdg_coverage',
      'evidence',
      'review_flow',
      'contributing_levers',
      'keywords',
    ] as const) {
      expect(key in res.body.data).toBe(true);
      expect(res.body.data[key]).not.toBeNull();
      expect(res.body.data[key]).not.toBeUndefined();
    }

    expect(mockRepository.getInsightsReport).toHaveBeenCalledWith('A511');
  });

  // ---------------------------------------------------------------------------
  // Case 2: One section null (rejected) -> 200 (NOT 500), null section + errors
  // entry, other five sections still present and populated.
  //
  // Named failing input (design §10 / T-05 brief): a rethrow-on-first-rejection
  // composition (instead of Promise.allSettled) would 500 this exact case —
  // see the K-004 red demonstrated in execution.md before this file was
  // finalized.
  // ---------------------------------------------------------------------------
  it('Case 2: One section rejected (review_flow) -> 200, review_flow is null, errors array has failure detail, other five sections intact', async () => {
    const partialData: ContractInsightsReportDto = {
      ...fullReport,
      review_flow: null,
    };
    const errors = ['review_flow: Connection timeout'];

    mockRepository.getInsightsReport.mockResolvedValueOnce({
      data: partialData,
      errors,
    });

    const res = await request(app.getHttpServer())
      .get('/reports/insights')
      .query({ 'contract-id': 'A511' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract insights report retrieved successfully',
      data: partialData,
      errors: ['review_flow: Connection timeout'],
    });
    expect(res.body.data.review_flow).toBeNull();
    expect('review_flow' in res.body.data).toBe(true);
    expect(res.body.errors).toContain('review_flow: Connection timeout');

    // The other five sections are unaffected by the one rejection.
    expect(res.body.data.reach).toEqual(fullReport.reach);
    expect(res.body.data.sdg_coverage).toEqual(fullReport.sdg_coverage);
    expect(res.body.data.evidence).toEqual(fullReport.evidence);
    expect(res.body.data.contributing_levers).toEqual(
      fullReport.contributing_levers,
    );
    expect(res.body.data.keywords).toEqual(fullReport.keywords);

    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/insights');
  });

  // ---------------------------------------------------------------------------
  // Case 3: All six sections failed -> 500 via GlobalExceptions filter
  // ---------------------------------------------------------------------------
  it('Case 3: All six sections failed -> 500 via GlobalExceptions filter with error details', async () => {
    mockRepository.getInsightsReport.mockRejectedValueOnce(
      new InternalServerErrorException('All insight section queries failed'),
    );

    const res = await request(app.getHttpServer())
      .get('/reports/insights')
      .query({ 'contract-id': 'A511' });

    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.body).toMatchObject({
      status: 500,
      description: 'InternalServerErrorException',
      errors: 'All insight section queries failed',
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/insights');
  });

  // ---------------------------------------------------------------------------
  // Case 4: Missing / blank contract-id -> 400 via the controller guard,
  // repository never invoked (matches as-built T-04: the controller validates
  // before calling the service/repository).
  // ---------------------------------------------------------------------------
  it('Case 4a: Missing contract-id parameter -> 400 Bad Request, repository not called', async () => {
    const res = await request(app.getHttpServer()).get('/reports/insights');

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body).toMatchObject({
      status: 400,
      description: 'BadRequestException',
      errors: 'contract-id query parameter is required',
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toBe('/reports/insights');
    expect(mockRepository.getInsightsReport).not.toHaveBeenCalled();
  });

  it('Case 4b: Blank/whitespace-only contract-id -> 400 Bad Request, repository not called', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/insights')
      .query({ 'contract-id': '   ' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body).toMatchObject({
      status: 400,
      description: 'BadRequestException',
      errors: 'contract-id query parameter is required',
    });
    expect(mockRepository.getInsightsReport).not.toHaveBeenCalled();
  });
});
