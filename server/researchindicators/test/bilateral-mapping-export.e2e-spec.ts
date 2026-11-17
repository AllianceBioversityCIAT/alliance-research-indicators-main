// @akili-spec docs/specs/bilateral/mapping-filtered-export — T-04 / R-MFE-001
//
// Boots the real AppModule. JwtMiddleware is stubbed only when the test
// supplies x-test-roles, so the guard and the route are the real ones.
// A request with x-test-roles: passthrough and the local auth bypass turned
// off for that call hits the real middleware (no token → 401).

import { HttpStatus, INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Response } from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { BilateralMappingWorkbookHandler } from '../src/domain/entities/reports/handlers/bilateral-mapping-workbook.handler';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import { JwtMiddleware } from '../src/domain/shared/middlewares/jwr.middleware';
import { RequestWithUser } from '../src/domain/shared/global-dto/request-with-user.dto';

const EXPORT_PATH = '/api/reports/bilateralMapping/xlsx';

describe('GET /api/reports/bilateralMapping/xlsx (e2e)', () => {
  let app: INestApplication;
  let build: jest.SpiedFunction<BilateralMappingWorkbookHandler['build']>;

  beforeAll(async () => {
    const realUse = JwtMiddleware.prototype.use;
    jest
      .spyOn(JwtMiddleware.prototype, 'use')
      .mockImplementation(async function (
        this: JwtMiddleware,
        req: RequestWithUser,
        res: Response,
        next: NextFunction,
      ) {
        const marker = req.headers['x-test-roles'];
        if (marker === 'passthrough') {
          const previous = process.env.ARI_LOCAL_AUTH_BYPASS;
          process.env.ARI_LOCAL_AUTH_BYPASS = 'false';
          try {
            return await realUse.call(this, req, res, next);
          } finally {
            if (previous === undefined) {
              delete process.env.ARI_LOCAL_AUTH_BYPASS;
            } else {
              process.env.ARI_LOCAL_AUTH_BYPASS = previous;
            }
          }
        }
        if (typeof marker === 'string') {
          req.user = {
            sec_user_id: 42,
            email: 'bilateral-export-e2e@example.org',
            first_name: 'E2E',
            last_name: 'Export',
            roles: JSON.parse(marker) as number[],
          };
          return next();
        }
        return realUse.call(this, req, res, next);
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    build = jest.spyOn(BilateralMappingWorkbookHandler.prototype, 'build');
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    build?.mockClear();
  });

  it('gives a Center Admin an xlsx attachment', async () => {
    const response = await request(app.getHttpServer())
      .get(EXPORT_PATH)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CENTER_ADMIN]))
      .buffer(true);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(build).toHaveBeenCalled();
  });

  it('forbids a user without the role and does not build the file', async () => {
    const response = await request(app.getHttpServer())
      .get(EXPORT_PATH)
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]));

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(build).not.toHaveBeenCalled();
  });

  it('returns 401 when no token is sent', async () => {
    const response = await request(app.getHttpServer())
      .get(EXPORT_PATH)
      .set('x-test-roles', 'passthrough');

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(build).not.toHaveBeenCalled();
  });
});
