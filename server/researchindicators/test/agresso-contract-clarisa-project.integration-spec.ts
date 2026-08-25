import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AgressoContractController } from '../src/domain/entities/agresso-contract/agresso-contract.controller';
import { AgressoContractService } from '../src/domain/entities/agresso-contract/agresso-contract.service';
import { AgressoContractRepository } from '../src/domain/entities/agresso-contract/repositories/agresso-contract.repository';
import { CurrentUserUtil } from '../src/domain/shared/utils/current-user.util';
import { AppConfig } from '../src/domain/shared/utils/app-config.util';
import { ClarisaLeversService } from '../src/domain/tools/clarisa/entities/clarisa-levers/clarisa-levers.service';
import { BilateralProjectMappingRepository } from '../src/domain/entities/bilateral-project-mapping/repositories/bilateral-project-mapping.repository';
import { ResponseInterceptor } from '../src/domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from '../src/domain/shared/error-management/global.exception';

// @sdd-spec docs/specs/changes/executive-overview-grounded-context — T-01 / R-EOC-001
//
// In-process HTTP-path integration spec for
// GET /:agreementId/clarisa-project
//
// KZ-017 OWNER & DISQUALIFICATION GUARD (K-021):
// - Bootstraps an isolated TestingModule containing ONLY
//   AgressoContractController + AgressoContractService.
// - AgressoContractRepository, BilateralProjectMappingRepository, and
//   ClarisaProjectsService are all replaced with jest.fn() doubles via
//   TestingModule provider overrides — this suite MUST NOT import AppModule,
//   open a TypeORM DataSource, or reach MySQL/RabbitMQ/OpenSearch/CLARISA
//   over the network.
// - ModuleRef.resolve is stubbed directly (rather than exercising Nest's
//   real DI resolution) so the CLARISA cold-cache degrade path (R-EOC-001
//   AC.4) can be driven deterministically through the real HTTP pipeline
//   (ResponseInterceptor + GlobalExceptions), matching the envelope a real
//   client receives.
//
// WHAT THIS SUITE CANNOT REACH (KZ-017):
// - JwtMiddleware / 401 behavior — out of scope here, same citation as the
//   sibling agresso-contract-insights.integration-spec.ts: covered by
//   src/domain/shared/middlewares/jwr.middleware.spec.ts.
// - Real NestJS module-graph wiring (whether AgressoContractModule actually
//   resolves a real ClarisaProjectsService instance without a circular
//   dependency) — verified by reading the module import/export graph
//   (ClarisaProjectsModule exports ClarisaProjectsService;
//   BilateralProjectMappingModule exports the repository and does not import
//   AgressoContractModule); NOT exercised by any running test — `nest build`
//   only compiles, DI resolution happens at bootstrap — and this suite
//   replaces ModuleRef.resolve outright.
// - Route-registration ordering against sibling static routes
//   (e.g. `find-contracts`) — this suite only ever calls the one path under
//   test; it does not assert on Express's route-matching order.
// - The bilateral_project_mapping repository's real SQL query shape (the
//   `findOne({ where, order })` call is asserted on the mock, not against a
//   real query builder/SQL string).

describe('T-01 — AgressoContract clarisa-project (HTTP-path integration, in-process)', () => {
  let app: INestApplication;
  let mockRepository: {
    findAllContracts: jest.Mock;
  };
  let mockBilateralProjectMappingRepository: {
    findOne: jest.Mock;
  };
  let mockClarisaProjectsService: {
    findProjectById: jest.Mock;
  };
  let mockModuleRef: {
    resolve: jest.Mock;
  };

  beforeAll(async () => {
    mockRepository = {
      findAllContracts: jest.fn(),
    };
    mockBilateralProjectMappingRepository = {
      findOne: jest.fn(),
    };
    mockClarisaProjectsService = {
      findProjectById: jest.fn(),
    };
    mockModuleRef = {
      resolve: jest.fn().mockResolvedValue(mockClarisaProjectsService),
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
          provide: BilateralProjectMappingRepository,
          useValue: mockBilateralProjectMappingRepository,
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
          provide: ModuleRef,
          useValue: mockModuleRef,
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
    mockModuleRef.resolve.mockResolvedValue(mockClarisaProjectsService);
  });

  const clarisaProjectFixture = {
    id: 501,
    short_name: 'Short Name',
    full_name: 'Full Project Name',
    summary: 'Summary text',
    description: 'Description text',
    start_date: '2024-01-01',
    end_date: '2026-12-31',
    total_budget: '1000000',
    annual: '250000',
    source_of_funding: 'Bilateral',
    funder_institution_object: { id: 10, name: 'Funder Org', acronym: 'FO' },
    lead_institution_object: { id: 20, name: 'Lead Org', acronym: 'LO' },
    external_code: 'EXT-1',
    phase: '2025',
    project_mappings_array: [
      {
        id: 1,
        project_id: 501,
        program_id: 9,
        allocation: 60,
        status: 'Confirmed',
        global_unit_object: {
          id: 9,
          name: 'SP09 name',
          smo_code: 'SP09',
          cgiar_entity_type_object: { code: 22, name: 'Science programs' },
        },
      },
    ],
  };

  // ---------------------------------------------------------------------
  // Case 1: mapped contract -> 200, full CLARISA project projection.
  // ---------------------------------------------------------------------
  it('Case 1: mapped contract -> 200 with the projected CLARISA project and empty errors', async () => {
    mockBilateralProjectMappingRepository.findOne.mockResolvedValue({
      clarisa_project_id: 501,
    });
    mockClarisaProjectsService.findProjectById.mockResolvedValue(
      clarisaProjectFixture,
    );

    const res = await request(app.getHttpServer()).get(
      '/AGR-1/clarisa-project',
    );

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Clarisa project context retrieved successfully',
      errors: [],
    });
    expect(res.body.data).toMatchObject({
      id: 501,
      short_name: 'Short Name',
      funder_institution: { id: 10, name: 'Funder Org', acronym: 'FO' },
      lead_institution: { id: 20, name: 'Lead Org', acronym: 'LO' },
      science_programs: [{ code: 'SP09', name: 'SP09 name', allocation: 60 }],
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/clarisa-project');

    expect(mockBilateralProjectMappingRepository.findOne).toHaveBeenCalledWith({
      where: { agresso_agreement_id: 'AGR-1', is_active: true },
      order: { updated_at: 'DESC' },
    });
    expect(mockClarisaProjectsService.findProjectById).toHaveBeenCalledWith(
      501,
    );
  });

  // ---------------------------------------------------------------------
  // Case 2: unmapped contract -> 200, data: null, NOT 404 (R-EOC-001 AC.2).
  // ---------------------------------------------------------------------
  it('Case 2: unmapped contract -> 200 with data: null (not 404), repository has no active mapping row', async () => {
    mockBilateralProjectMappingRepository.findOne.mockResolvedValue(null);

    const res = await request(app.getHttpServer()).get(
      '/AGR-UNMAPPED/clarisa-project',
    );

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Clarisa project context retrieved successfully',
      data: null,
      errors: [],
    });
    expect(mockClarisaProjectsService.findProjectById).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // Case 3: CLARISA cold-cache failure -> 200, data: null,
  // errors: ['clarisa_unavailable'] — never a 5xx (R-EOC-001 AC.4, NFR-2).
  // ---------------------------------------------------------------------
  it('Case 3: CLARISA cold-cache ServiceUnavailableException -> 200 with data: null and errors: ["clarisa_unavailable"], never a 5xx', async () => {
    mockBilateralProjectMappingRepository.findOne.mockResolvedValue({
      clarisa_project_id: 501,
    });
    mockClarisaProjectsService.findProjectById.mockRejectedValue(
      new ServiceUnavailableException(
        'CLARISA /api/projects temporarily unreachable',
      ),
    );

    const res = await request(app.getHttpServer()).get(
      '/AGR-1/clarisa-project',
    );

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Clarisa project context retrieved successfully',
      data: null,
      errors: ['clarisa_unavailable'],
    });
  });

  // ---------------------------------------------------------------------
  // Case 4: an unexpected (non-ServiceUnavailableException) CLARISA error
  // is NOT swallowed — it still surfaces through GlobalExceptions as a 500,
  // proving the degrade path is scoped to the cold-cache case only.
  // ---------------------------------------------------------------------
  it('Case 4: an unexpected CLARISA error (not ServiceUnavailableException) surfaces as 500 via GlobalExceptions, not a silent data: null', async () => {
    mockBilateralProjectMappingRepository.findOne.mockResolvedValue({
      clarisa_project_id: 501,
    });
    mockClarisaProjectsService.findProjectById.mockRejectedValue(
      new Error('unexpected failure'),
    );

    const res = await request(app.getHttpServer()).get(
      '/AGR-1/clarisa-project',
    );

    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.body.status).toBe(500);
  });
});
