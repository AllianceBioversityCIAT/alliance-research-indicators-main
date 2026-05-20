import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  BadRequestException,
  ConflictException,
  MiddlewareConsumer,
  Module,
  NestModule,
  NotFoundException,
  UnauthorizedException,
  VersioningType,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { BilateralController } from '../src/domain/entities/bilateral/bilateral.controller';
import { BilateralService } from '../src/domain/entities/bilateral/bilateral.service';
import { ResultUsersService } from '../src/domain/entities/result-users/result-users.service';
import { ResponseInterceptor } from '../src/domain/shared/Interceptors/response.interceptor';
import { SetUpInterceptor } from '../src/domain/shared/Interceptors/setup.interceptor';
import { GlobalExceptions } from '../src/domain/shared/error-management/global.exception';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  ResultsUtil,
  RESULT_CODE,
} from '../src/domain/shared/utils/results.util';

const serviceMock = {
  deleteContribution: jest.fn(),
  getAlignment: jest.fn(),
  listIndicators: jest.fn(),
  updateAlignment: jest.fn(),
  upsertContribution: jest.fn(),
};

const resultUsersServiceMock = {
  isUserOnResult: jest.fn((_resultId: number, userId: number) => userId !== 3),
};

const resultRepositoryMock = {
  findOne: jest.fn((options) =>
    Promise.resolve({
      report_year_id: 2026,
      result_official_code: options.where.result_official_code,
      result_id: 77,
      indicator_id: 1,
      result_status_id: 1,
      platform_code: options.where.platform_code,
    }),
  ),
};

const dataSourceMock = {
  getRepository: jest.fn(() => resultRepositoryMock),
};

function authStub(req: any, _res: any, next: () => void) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new UnauthorizedException('Token not found');
  }

  if (authorization === 'Bearer not-owner') {
    req.user = { sec_user_id: 3, roles: [SecRolesEnum.CONTRIBUTOR] };
    return next();
  }

  if (authorization === 'Bearer technical') {
    req.user = { sec_user_id: 7, roles: [SecRolesEnum.TECHNICAL_SUPPORT] };
    return next();
  }

  req.user = { sec_user_id: 9, roles: [SecRolesEnum.CONTRIBUTOR] };
  return next();
}

@Module({
  controllers: [BilateralController],
  providers: [
    SetUpInterceptor,
    ResultsUtil,
    {
      provide: DataSource,
      useValue: dataSourceMock,
    },
    {
      provide: BilateralService,
      useValue: serviceMock,
    },
    {
      provide: ResultUsersService,
      useValue: resultUsersServiceMock,
    },
  ],
})
class BilateralFeatureE2eModule {}

@Module({
  imports: [
    RouterModule.register([
      {
        path: `results/${RESULT_CODE}/pool-funding-alignment`,
        module: BilateralFeatureE2eModule,
      },
    ]),
    BilateralFeatureE2eModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptions,
    },
  ],
})
class BilateralE2eModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(authStub).forRoutes('*');
  }
}

describe('BilateralController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    resultUsersServiceMock.isUserOnResult.mockImplementation(
      (_resultId: number, userId: number) => userId !== 3,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BilateralE2eModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.listen(0);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns tagged project alignment', async () => {
    serviceMock.getAlignment.mockResolvedValue({
      result_code: '123',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      is_synced_to_prms: false,
      is_read_only: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding alignment found',
          data: {
            eligible: true,
            has_contribution: true,
            selected_levers: [
              { lever_code: 'SP01', lever_name: 'Adaptive crops' },
            ],
            is_read_only: false,
          },
        });
      });

    expect(serviceMock.getAlignment).toHaveBeenCalledWith(
      '123',
      expect.objectContaining({ sec_user_id: 9 }),
    );
  });

  it('returns ineligible shape for untagged projects', async () => {
    serviceMock.getAlignment.mockResolvedValue({
      result_code: '123',
      eligible: false,
      has_pool_funding_alignment_eligible: false,
      has_contribution: null,
      selected_levers: [],
      is_synced_to_prms: false,
      is_read_only: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          eligible: false,
          has_pool_funding_alignment_eligible: false,
          has_contribution: null,
          selected_levers: [],
        });
      });
  });

  it('returns read-only state for synced results', async () => {
    serviceMock.getAlignment.mockResolvedValue({
      result_code: '123',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: false,
      selected_levers: [],
      is_synced_to_prms: true,
      is_read_only: true,
    });

    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          eligible: true,
          is_synced_to_prms: true,
          is_read_only: true,
        });
      });
  });

  it('returns selected SP groups with empty indicators before ToC sync exists', async () => {
    serviceMock.listIndicators.mockResolvedValue([
      {
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
        indicators: [],
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment/indicators')
      .query({ search: 'rice', 'indicator-type': 'outcome' })
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding indicators found',
          data: [
            {
              lever_code: 'SP01',
              lever_name: 'Adaptive crops',
              indicators: [],
            },
          ],
        });
      });

    expect(serviceMock.listIndicators).toHaveBeenCalledWith(
      '123',
      { search: 'rice', indicator_type: 'outcome' },
      expect.objectContaining({ sec_user_id: 9 }),
    );
  });

  it('returns stale mapped indicators for selected SPs', async () => {
    serviceMock.listIndicators.mockResolvedValue([
      {
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
        indicators: [
          {
            indicator_code: 'IND-1',
            indicator_name: 'IND-1',
            indicator_type: 'capacity_sharing',
            target_description: null,
            is_active: false,
            is_mapped: true,
            is_stale: true,
          },
        ],
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment/indicators')
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toEqual([
          {
            lever_code: 'SP01',
            lever_name: 'Adaptive crops',
            indicators: [
              expect.objectContaining({
                indicator_code: 'IND-1',
                is_active: false,
                is_mapped: true,
                is_stale: true,
              }),
            ],
          },
        ]);
      });
  });

  it('serves 50 concurrent empty-catalog indicator requests under the p95 target', async () => {
    serviceMock.listIndicators.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/api/v1/results/123/pool-funding-alignment/indicators')
      .set('Authorization', 'Bearer contributor')
      .expect(200);

    const durations = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const startedAt = Date.now();
        await request(app.getHttpServer())
          .get('/api/v1/results/123/pool-funding-alignment/indicators')
          .set('Authorization', 'Bearer contributor')
          .expect(200);

        return Date.now() - startedAt;
      }),
    );

    const p95 = durations.sort((a, b) => a - b)[Math.floor(0.95 * 49)];
    expect(p95).toBeLessThanOrEqual(300);
  });

  it('updates pool funding alignment for an owner', async () => {
    serviceMock.updateAlignment.mockResolvedValue({
      result_code: '123',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      is_synced_to_prms: false,
      is_read_only: false,
    });

    await request(app.getHttpServer())
      .patch('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer contributor')
      .send({ has_contribution: true, lever_codes: ['SP01'] })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding alignment updated',
          data: {
            eligible: true,
            has_contribution: true,
            selected_levers: [
              { lever_code: 'SP01', lever_name: 'Adaptive crops' },
            ],
          },
        });
      });

    expect(serviceMock.updateAlignment).toHaveBeenCalledWith(
      '123',
      { has_contribution: true, lever_codes: ['SP01'] },
      expect.objectContaining({ sec_user_id: 9 }),
    );
  });

  it('creates a capacity sharing contribution for an owner', async () => {
    serviceMock.upsertContribution.mockResolvedValue({
      result_code: '123',
      lever_code: 'SP01',
      lever_name: 'Adaptive crops',
      indicator_code: 'IND-1',
      indicator_type: 'capacity_sharing',
      is_stale: false,
    });

    await request(app.getHttpServer())
      .post(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .send({ indicator_type: 'capacity_sharing', women: 1 })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding indicator contribution saved',
          data: {
            lever_code: 'SP01',
            indicator_code: 'IND-1',
            indicator_type: 'capacity_sharing',
          },
        });
      });

    expect(serviceMock.upsertContribution).toHaveBeenCalledWith(
      '123',
      'IND-1',
      { indicator_type: 'capacity_sharing', women: 1 },
      expect.objectContaining({ sec_user_id: 9 }),
      'SP01',
    );
  });

  it.each([
    ['knowledge_product', { handle: 'hdl:10568/1' }],
    ['policy_change', { policy_type_id: 1, policy_stage_id: 2 }],
    ['innovation_development', { readinness_level_id: 3 }],
    ['NOOP', { narrative: 'Other contribution narrative' }],
  ])(
    'creates a %s contribution for an owner',
    async (indicatorType, payload) => {
      serviceMock.upsertContribution.mockResolvedValue({
        result_code: '123',
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
        indicator_code: 'IND-1',
        indicator_type: indicatorType,
        is_stale: false,
      });

      await request(app.getHttpServer())
        .post(
          '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
        )
        .query({ 'lever-code': 'SP01' })
        .set('Authorization', 'Bearer contributor')
        .send({ indicator_type: indicatorType, ...payload })
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toMatchObject({
            lever_code: 'SP01',
            indicator_code: 'IND-1',
            indicator_type: indicatorType,
          });
        });

      expect(serviceMock.upsertContribution).toHaveBeenCalledWith(
        '123',
        'IND-1',
        { indicator_type: indicatorType, ...payload },
        expect.objectContaining({ sec_user_id: 9 }),
        'SP01',
      );
    },
  );

  it('updates a contribution for an owner', async () => {
    serviceMock.upsertContribution.mockResolvedValue({
      result_code: '123',
      lever_code: 'SP01',
      lever_name: 'Adaptive crops',
      indicator_code: 'IND-1',
      indicator_type: 'capacity_sharing',
      is_stale: false,
    });

    await request(app.getHttpServer())
      .patch(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .send({ indicator_type: 'capacity_sharing', women: 2 })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding indicator contribution updated',
        });
      });
  });

  it('deletes a contribution for an owner', async () => {
    serviceMock.deleteContribution.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding indicator contribution deleted',
          data: null,
        });
      });

    expect(serviceMock.deleteContribution).toHaveBeenCalledWith(
      '123',
      'IND-1',
      expect.objectContaining({ sec_user_id: 9 }),
      'SP01',
    );
  });

  it('returns 403 when a contributor is not owner for contribution saves', async () => {
    await request(app.getHttpServer())
      .post(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer not-owner')
      .send({ indicator_type: 'capacity_sharing', women: 1 })
      .expect(403);
  });

  it('returns 400 when contribution payload validation fails', async () => {
    serviceMock.upsertContribution.mockRejectedValue(
      new BadRequestException('Unsupported indicator type'),
    );

    await request(app.getHttpServer())
      .post(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .send({ indicator_type: 'unsupported' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 400,
          description: 'BadRequestException',
        });
      });
  });

  it('returns 409 when contribution edits are blocked after PRMS sync', async () => {
    serviceMock.upsertContribution.mockRejectedValue(
      new ConflictException('Result is already synced to PRMS'),
    );

    await request(app.getHttpServer())
      .patch(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .send({ indicator_type: 'capacity_sharing', women: 1 })
      .expect(409)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 409,
          description: 'ConflictException',
        });
      });
  });

  it('returns 404 when deleting a missing contribution mapping', async () => {
    serviceMock.deleteContribution.mockRejectedValue(
      new NotFoundException('Pool funding indicator mapping not found'),
    );

    await request(app.getHttpServer())
      .delete(
        '/api/v1/results/123/pool-funding-alignment/indicators/IND-1/contribution',
      )
      .query({ 'lever-code': 'SP01' })
      .set('Authorization', 'Bearer contributor')
      .expect(404)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 404,
          description: 'NotFoundException',
        });
      });
  });

  it('returns 403 when a contributor is not a result owner', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer not-owner')
      .send({ has_contribution: false })
      .expect(403)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 403,
          description: 'ForbiddenException',
        });
      });
  });

  it('returns 403 when the role is not allowed to edit', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer technical')
      .send({ has_contribution: false })
      .expect(403)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 403,
          description: 'ForbiddenException',
        });
      });
  });

  it('returns 400 for invalid update payloads', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/results/123/pool-funding-alignment')
      .set('Authorization', 'Bearer contributor')
      .send({ has_contribution: 'yes' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 400,
          description: 'BadRequestException',
        });
      });
  });
});
