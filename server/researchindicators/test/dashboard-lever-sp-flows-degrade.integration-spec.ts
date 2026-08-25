import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
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

// @sdd-spec docs/specs/changes/dashboard-chart-refinements — R-DCR-001 Degrade
//
// In-process HTTP-path integration spec for GET /reports/dashboard, mirroring
// test/agresso-contract-insights.integration-spec.ts (same controller
// family). Requirement: R-DCR-001 Degrade scenario — the sub-report query
// for lever_sp_flows fails, `lever_sp_flows` resolves to null with an
// `errors[]` entry, HTTP status and every sibling block stay untouched.
//
// KZ-017 / K-021 DISQUALIFICATION GUARD:
// - Bootstraps an isolated TestingModule containing ONLY
//   AgressoContractController + AgressoContractService. AgressoContractRepository
//   is replaced by a plain object; it MUST NOT import AppModule, open a real
//   TypeORM DataSource, or reach MySQL/RabbitMQ/OpenSearch.
// - Unlike agresso-contract-insights.integration-spec.ts (which stubs the
//   whole top-level report method), this spec runs the REAL
//   AgressoContractRepository.prototype.getContractDashboard composition
//   (Promise.allSettled + per-section errors[] formatting) bound to a fake
//   `this` whose 8 getXxxReport methods are individually stubbed. That is
//   the only part of the production Degrade behavior this spec can reach
//   without a live DB — it cannot see a real SQL failure mode, only the
//   composition's reaction to a rejected promise.
describe('R-DCR-001 Degrade — GET /reports/dashboard lever_sp_flows (HTTP-path integration, in-process)', () => {
  let app: INestApplication;
  let repoStub: Record<string, jest.Mock>;

  const summaryFixture = {
    total: 5,
    by_status: [{ status_id: 1, name: 'Ongoing', count: 5 }],
    by_year: [{ year: 2026, count: 5 }],
    partner_institutions: 2,
    by_indicator_year: [{ indicator_id: 1, year: 2026, count: 5 }],
  };
  const geoScopeFixture = {
    contract_id: 'D514',
    limit: 5,
    geo_scope_summary: {
      global: 1,
      regional: 0,
      countries: 3,
      sub_national: 1,
      yet_to_be_determined: 0,
    },
    top_regions: [],
    top_countries: [],
  };
  const spAlignmentFixture = {
    sps: [
      {
        sp_code: 'SP01',
        name: 'SP01 name',
        category: 'cat',
        icon_key: null,
        links: [],
      },
    ],
    results_with_alignment: 4,
    results_without_alignment: 1,
  };

  beforeAll(async () => {
    repoStub = {
      getResultsSummaryReport: jest.fn().mockResolvedValue(summaryFixture),
      getTopPartnersReport: jest.fn().mockResolvedValue({
        top_partners: [
          { institution_id: 1, institution_name: 'CGIAR', count: 3 },
        ],
      }),
      getTopPrimaryLeversReport: jest.fn().mockResolvedValue({
        top_primary_levers: [
          { lever_id: 3, short_name: 'Livestock', count: 2 },
        ],
      }),
      getTopMainContactPersonsReport: jest.fn().mockResolvedValue({
        top_main_contact_persons: [
          { user_id: '9', first_name: 'A', last_name: 'B', count: 1 },
        ],
      }),
      getTopContributorsReport: jest.fn().mockResolvedValue({
        top_contributors: [{ contract_id: 'A631', count: 1 }],
      }),
      getGeoScopeReport: jest.fn().mockResolvedValue(geoScopeFixture),
      getSpAlignmentReport: jest.fn().mockResolvedValue(spAlignmentFixture),
      // The Degrade arrangement: only this sub-report rejects.
      getLeverSpFlowsReport: jest
        .fn()
        .mockRejectedValue(new Error('flows query failed')),
    };
    // Real production composition, bound to the stub — see KZ-017 note above.
    repoStub.getContractDashboard =
      AgressoContractRepository.prototype.getContractDashboard.bind(repoStub);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AgressoContractController],
      providers: [
        AgressoContractService,
        { provide: AgressoContractRepository, useValue: repoStub },
        { provide: DataSource, useValue: {} },
        {
          provide: CurrentUserUtil,
          useValue: { user_id: 1, user: { sec_user_id: 1 } },
        },
        { provide: ModuleRef, useValue: {} },
        { provide: AppConfig, useValue: { BUCKET_URL: 'https://test-bucket' } },
        {
          provide: ClarisaLeversService,
          useValue: {
            homologatedData: jest.fn(),
            findByShortName: jest.fn(),
            resolveIconUrl: jest.fn(),
          },
        },
        { provide: BilateralProjectMappingRepository, useValue: {} },
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

  it('lever_sp_flows sub-report rejecting -> 200, lever_sp_flows null with an errors[] entry, siblings intact, envelope unchanged', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/dashboard')
      .query({ 'contract-id': 'D514' });

    // HTTP status and envelope shape must NOT change on a sub-report failure.
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toMatchObject({
      status: 200,
      description: 'Contract dashboard report retrieved successfully',
    });
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.path).toContain('/reports/dashboard');

    // lever_sp_flows degrades to null with a prefixed errors[] entry.
    expect(res.body.data.lever_sp_flows).toBeNull();
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/^lever_sp_flows: /)]),
    );

    // Siblings stay populated — the one rejection does not cascade.
    expect(res.body.data.summary).toEqual(summaryFixture);
    expect(res.body.data.tops.partners).toEqual([
      { institution_id: 1, institution_name: 'CGIAR', count: 3 },
    ]);
    expect(res.body.data.geo_scope).toEqual(geoScopeFixture);
    expect(res.body.data.sp_alignment).toEqual(spAlignmentFixture);

    expect(repoStub.getLeverSpFlowsReport).toHaveBeenCalledWith('D514');
  });
});
