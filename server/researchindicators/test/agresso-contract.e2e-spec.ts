import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  UnauthorizedException,
  VersioningType,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import request from 'supertest';
import { AgressoContractController } from '../src/domain/entities/agresso-contract/agresso-contract.controller';
import { AgressoContractService } from '../src/domain/entities/agresso-contract/agresso-contract.service';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { ResponseInterceptor } from '../src/domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from '../src/domain/shared/error-management/global.exception';

const serviceMock = {
  setPoolFundingTag: jest.fn(),
};

function authStub(req: any, _res: any, next: () => void) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new UnauthorizedException('Token not found');
  }

  if (authorization === 'Bearer center-admin') {
    req.user = { sec_user_id: 9, roles: [SecRolesEnum.CENTER_ADMIN] };
    return next();
  }

  req.user = { sec_user_id: 3, roles: [SecRolesEnum.CONTRIBUTOR] };
  return next();
}

@Module({
  controllers: [AgressoContractController],
  providers: [
    {
      provide: AgressoContractService,
      useValue: serviceMock,
    },
  ],
})
class AgressoContractFeatureE2eModule {}

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'agresso/contracts',
        module: AgressoContractFeatureE2eModule,
      },
    ]),
    AgressoContractFeatureE2eModule,
  ],
})
class AgressoContractE2eModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(authStub).forRoutes('*');
  }
}

describe('AgressoContractController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AgressoContractE2eModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new GlobalExceptions());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('updates the pool funding contributor tag', async () => {
    serviceMock.setPoolFundingTag.mockResolvedValue({
      agreement_id: 'BIL-001',
      is_pool_funding_contributor: true,
    });

    await request(app.getHttpServer())
      .patch('/api/v1/agresso/contracts/BIL-001/pool-funding-tag')
      .set('Authorization', 'Bearer center-admin')
      .send({ is_pool_funding_contributor: true })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 200,
          description: 'Pool funding contributor tag updated',
          data: {
            agreement_id: 'BIL-001',
            is_pool_funding_contributor: true,
          },
        });
      });

    expect(serviceMock.setPoolFundingTag).toHaveBeenCalledWith('BIL-001', true);
  });

  it('returns 401 without credentials', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/agresso/contracts/BIL-001/pool-funding-tag')
      .send({ is_pool_funding_contributor: true })
      .expect(401)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 401,
          description: 'UnauthorizedException',
        });
      });
  });

  it('returns 403 for authenticated users without the required role', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/agresso/contracts/BIL-001/pool-funding-tag')
      .set('Authorization', 'Bearer contributor')
      .send({ is_pool_funding_contributor: true })
      .expect(403)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 403,
          description: 'ForbiddenException',
        });
      });
  });

  it('returns 400 for invalid tag payloads', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/agresso/contracts/BIL-001/pool-funding-tag')
      .set('Authorization', 'Bearer center-admin')
      .send({ is_pool_funding_contributor: 'yes' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 400,
          description: 'BadRequestException',
        });
      });
  });
});
