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

// @sdd-spec docs/specs/changes/project-dashboard-v3/f3-indicator-deep-dive — T-05
//
// In-process HTTP-path integration spec for GET /reports/indicator-details
// Requirements: R-DD-001 (envelope behavior through real HTTP path, partial-failure tri-state)
// Design: §10 (HTTP-path integration spec)
//
// KZ-017 OWNER & DISQUALIFICATION GUARD:
// - Bootstraps an isolated TestingModule containing ONLY AgressoContractController + AgressoContractService.
// - Repository is mocked via TestModule provider replacement — MUST NOT import AppModule,
//   open a TypeORM DataSource, connect to MySQL/RabbitMQ/OpenSearch, or reach any remote network.
// - Real HTTP pipeline is exercised via supertest against app.getHttpServer() with real
//   ResponseInterceptor (ServerResponseDto wire envelope wrapping) and real GlobalExceptions filter.
//
// 401 AUTHENTICATION COVERAGE CITATION:
// - In accordance with the Owner decision (2026-08-23, amended T-05 & design §10), 401 unauthorized
//   rejection is a unit test on JwtMiddleware and is verified in:
//   `src/domain/shared/middlewares/jwr.middleware.spec.ts` -> 'rejects missing authorization header'.
//   The auth middleware is excluded from this isolated in-process HTTP spec to keep integration execution
//   strictly in-process, deterministic, and infra-free.

describe('T-05 — AgressoContractIndicatorDetails (HTTP-path integration, in-process)', () => {
  let app: INestApplication;
  let mockRepository: {
    getIndicatorDetailsReport: jest.Mock;
  };

  beforeAll(async () => {
    mockRepository = {
      getIndicatorDetailsReport: jest.fn(),
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
  // Case 1: Mixed-indicator contract (200 + wire envelope + section presence/omission)
  // ---------------------------------------------------------------------------
  it('Case 1: Mixed-indicator contract -> 200 with populated sections and zero-result sections omitted from data', async () => {
    const mockReportData = {
      capacity_sharing: {
        meta: { total_results: 4, n: 3 },
        total_trainees: 50,
        gender_split: [
          { gender: 'female', count: 30 },
          { gender: 'male', count: 20 },
        ],
        session_lengths: [{ id: 1, name: 'Short-term', count: 3 }],
        delivery_modalities: [{ id: 1, name: 'In person', count: 3 }],
        session_types: [{ id: 1, name: 'Group', count: 3 }],
      },
      reporting_velocity: [
        { month: '2025-01', count: 2 },
        { month: '2025-02', count: 3 },
      ],
    };

    mockRepository.getIndicatorDetailsReport.mockResolvedValueOnce({
      data: mockReportData,
      errors: [],
    });

    const res = await request(app.getHttpServer())
      .get('/reports/indicator-details')
      .query({ 'contract-id': 'A1676' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract indicator details report retrieved successfully',
      data: {
        capacity_sharing: mockReportData.capacity_sharing,
        reporting_velocity: mockReportData.reporting_velocity,
      },
      errors: [],
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/indicator-details');

    // Asserts zero-result sections are omitted from res.body.data (R-DD-001 BUT clause)
    expect('innovation_dev' in res.body.data).toBe(false);
    expect('knowledge_product' in res.body.data).toBe(false);
    expect('policy_change' in res.body.data).toBe(false);
    expect('oicr' in res.body.data).toBe(false);
    expect('innovation_use' in res.body.data).toBe(false);
    expect(res.body.data.innovation_dev).toBeUndefined();
    expect(res.body.data.knowledge_product).toBeUndefined();
    expect(res.body.data.policy_change).toBeUndefined();
    expect(res.body.data.oicr).toBeUndefined();
    expect(res.body.data.innovation_use).toBeUndefined();

    expect(mockRepository.getIndicatorDetailsReport).toHaveBeenCalledWith(
      'A1676',
    );
  });

  // ---------------------------------------------------------------------------
  // Case 2: Partial failure (one section rejected -> 200 + null section + errors entry)
  // ---------------------------------------------------------------------------
  it('Case 2: Partial failure (one section rejected) -> 200, rejected section is null, errors array has failure detail', async () => {
    const mockPartialData = {
      capacity_sharing: null,
      reporting_velocity: [{ month: '2025-01', count: 2 }],
    };
    const mockErrors = ['capacity_sharing: Connection timeout'];

    mockRepository.getIndicatorDetailsReport.mockResolvedValueOnce({
      data: mockPartialData,
      errors: mockErrors,
    });

    const res = await request(app.getHttpServer())
      .get('/reports/indicator-details')
      .query({ 'contract-id': 'A1676' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract indicator details report retrieved successfully',
      data: {
        capacity_sharing: null,
        reporting_velocity: [{ month: '2025-01', count: 2 }],
      },
      errors: ['capacity_sharing: Connection timeout'],
    });
    expect(res.body.data.capacity_sharing).toBeNull();
    expect(res.body.errors).toContain('capacity_sharing: Connection timeout');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/indicator-details');
  });

  // ---------------------------------------------------------------------------
  // Case 3: All attempted queries failed (500 via GlobalExceptions filter)
  // ---------------------------------------------------------------------------
  it('Case 3: All attempted queries failed -> 500 via GlobalExceptions filter with error details', async () => {
    mockRepository.getIndicatorDetailsReport.mockRejectedValueOnce(
      new InternalServerErrorException('All indicator detail queries failed'),
    );

    const res = await request(app.getHttpServer())
      .get('/reports/indicator-details')
      .query({ 'contract-id': 'A1676' });

    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.body).toMatchObject({
      status: 500,
      description: 'InternalServerErrorException',
      errors: 'All indicator detail queries failed',
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/indicator-details');
  });

  // ---------------------------------------------------------------------------
  // Case 4: Missing contract-id parameter (400 via GlobalExceptions filter)
  // ---------------------------------------------------------------------------
  it('Case 4: Missing contract-id parameter -> 400 Bad Request with validation error message', async () => {
    const res = await request(app.getHttpServer()).get(
      '/reports/indicator-details',
    );

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body).toMatchObject({
      status: 400,
      description: 'BadRequestException',
      errors: 'contract-id query parameter is required',
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toBe('/reports/indicator-details');
    expect(mockRepository.getIndicatorDetailsReport).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Case 5: Unknown contract / zero results (200 + empty velocity + no satellite sections)
  // ---------------------------------------------------------------------------
  it('Case 5: Unknown contract / zero results -> 200 with empty velocity and no satellite sections', async () => {
    mockRepository.getIndicatorDetailsReport.mockResolvedValueOnce({
      data: {
        reporting_velocity: [],
      },
      errors: [],
    });

    const res = await request(app.getHttpServer())
      .get('/reports/indicator-details')
      .query({ 'contract-id': 'UNKNOWN-999' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract indicator details report retrieved successfully',
      data: {
        reporting_velocity: [],
      },
      errors: [],
    });
    expect(res.body.data.reporting_velocity).toEqual([]);
    expect('capacity_sharing' in res.body.data).toBe(false);
    expect('innovation_dev' in res.body.data).toBe(false);
    expect('knowledge_product' in res.body.data).toBe(false);
    expect('policy_change' in res.body.data).toBe(false);
    expect('oicr' in res.body.data).toBe(false);
    expect('innovation_use' in res.body.data).toBe(false);
  });
});
