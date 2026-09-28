// @akili-spec changes/profile-simulation
import {
  BadRequestException,
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';
import { SearchUsersDto } from './dto/search-users.dto';
import { StartImpersonationDto } from './dto/start-impersonation.dto';
import { ImpersonationErrorCodeEnum } from './enum/impersonation-error-code.enum';
import { ImpersonationServiceError } from './errors/impersonation-service.error';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RequestWithUser } from '../../shared/global-dto/request-with-user.dto';
import {
  CurrentResult,
  ImpersonationUserSearchResult,
  StartResult,
  TargetProfile,
} from './types/impersonation.types';

// @akili-spec changes/profile-simulation — T-04
//
// Scope note (KZ-017): this spec proves handler wiring, DTO validation, the
// role-gate behaviour and the actor-resolution/`current`/`end` branching
// with a mocked `ImpersonationService`. It cannot reach: the real
// `JwtMiddleware`/`applyImpersonation` wiring that populates
// `request.actor`/`request.impersonation` (T-03), the real HTTP envelope
// end-to-end (`ResponseInterceptor` + `GlobalExceptions` fully wired), or
// the Swagger document generation — those are T-06's (e2e).

const targetProfileFixture: TargetProfile = {
  sec_user_id: 55,
  first_name: 'Target',
  last_name: 'User',
  email: 'target@example.com',
  // Raw MySQL tinyint(1) shape — deliberately numbers, not booleans, to
  // prove the DTO mapping coerces them (T-04 review advisory).
  is_active: 1 as unknown as boolean,
  status_id: 1,
  user_role_list: [
    {
      is_active: 1 as unknown as boolean,
      user_id: 55,
      role_id: 3,
      role: {
        role_id: 3,
        sec_role_id: 3,
        focus_id: 7,
        name: 'Contributor',
        is_active: 1 as unknown as boolean,
        justification_update: null,
      },
    },
    {
      is_active: 0 as unknown as boolean,
      user_id: 55,
      role_id: 9,
      role: {
        role_id: 9,
        sec_role_id: 9,
        focus_id: 7,
        name: 'Center Admin',
        is_active: 0 as unknown as boolean,
        justification_update: 'revoked',
      },
    },
  ],
};

describe('ImpersonationController', () => {
  let controller: ImpersonationController;
  let service: jest.Mocked<
    Pick<ImpersonationService, 'searchUsers' | 'start' | 'end' | 'current'>
  >;

  const buildRequest = (
    overrides: Partial<{
      user: { sec_user_id: number };
      actor: { sec_user_id: number };
      impersonation: { session_id: string; invalid?: 'ended' };
      header: string | undefined;
    }> = {},
  ): RequestWithUser =>
    ({
      user: overrides.user,
      actor: overrides.actor,
      impersonation: overrides.impersonation,
      header: jest.fn().mockReturnValue(overrides.header),
    }) as unknown as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpersonationController],
      providers: [
        {
          provide: ImpersonationService,
          useValue: {
            searchUsers: jest.fn(),
            start: jest.fn(),
            end: jest.fn(),
            current: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ImpersonationController);
    service = module.get(ImpersonationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('searchUsers (R-IMP-001)', () => {
    const rowFixture: ImpersonationUserSearchResult = {
      sec_user_id: 10,
      first_name: 'Rosa',
      last_name: 'Rojas',
      email: 'rosa.rojas@example.com',
      is_active: 1 as unknown as boolean,
      roles: [{ role_id: 3, name: 'Contributor' }],
      simulable: true,
      blocked_reason: undefined,
    };

    it('delegates to service.searchUsers with the actor id and wraps the envelope, coercing is_active', async () => {
      service.searchUsers.mockResolvedValue([rowFixture]);
      const req = buildRequest({ actor: { sec_user_id: 1 } });

      const out = await controller.searchUsers(
        { search: 'rojas' } as SearchUsersDto,
        req,
      );

      expect(service.searchUsers).toHaveBeenCalledWith('rojas', 1);
      expect(out.status).toBe(HttpStatus.OK);
      expect(out.data).toHaveLength(1);
      expect(out.data[0].is_active).toBe(true);
      expect(typeof out.data[0].is_active).toBe('boolean');
    });

    it('resolves the actor from request.user when request.actor is absent', async () => {
      service.searchUsers.mockResolvedValue([]);
      const req = buildRequest({ user: { sec_user_id: 7 } });

      await controller.searchUsers({ search: 'abc' } as SearchUsersDto, req);

      expect(service.searchUsers).toHaveBeenCalledWith('abc', 7);
    });

    it('throws UnauthorizedException when neither request.actor nor request.user carries sec_user_id (T-04 rework: RequestWithUser narrowing)', async () => {
      const req = buildRequest({});

      await expect(
        controller.searchUsers({ search: 'abc' } as SearchUsersDto, req),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(service.searchUsers).not.toHaveBeenCalled();
    });

    it('escapes SQL LIKE wildcards before calling the service (T-02 review advisory)', async () => {
      service.searchUsers.mockResolvedValue([]);
      const req = buildRequest({ actor: { sec_user_id: 1 } });

      await controller.searchUsers(
        { search: '50%_off' } as SearchUsersDto,
        req,
      );

      expect(service.searchUsers).toHaveBeenCalledWith('50\\%\\_off', 1);
    });

    it('rejects search="ro" (< 3 chars) with 400 via ValidationPipe', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await expect(
        pipe.transform({ search: 'ro' }, {
          type: 'query',
          metatype: SearchUsersDto,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('SearchUsersDto trims before validating length (class-validator direct)', async () => {
      const dto = plainToInstance(SearchUsersDto, { search: '  ro  ' });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'search')).toBeDefined();
    });

    it('SearchUsersDto accepts a trimmed 3-char search', async () => {
      const dto = plainToInstance(SearchUsersDto, { search: '  abc  ' });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'search')).toBeUndefined();
      expect(dto.search).toBe('abc');
    });
  });

  describe('start (R-IMP-002)', () => {
    const startResultFixture: StartResult = {
      session: {
        session_id: 'sess-1',
        started_at: new Date('2026-08-25T00:00:00Z'),
        expires_at: new Date('2026-08-25T04:00:00Z'),
      },
      user: targetProfileFixture,
    };

    it('delegates to service.start with actorId/target/reason, 201, and maps TargetProfileDto with coerced is_active', async () => {
      service.start.mockResolvedValue(startResultFixture);
      const req = buildRequest({ actor: { sec_user_id: 1 } });

      const out = await controller.start(
        {
          target_user_id: 55,
          reason: 'support ticket',
        } as StartImpersonationDto,
        req,
      );

      expect(service.start).toHaveBeenCalledWith(1, 55, 'support ticket');
      expect(out.status).toBe(HttpStatus.CREATED);
      expect(out.data.session.session_id).toBe('sess-1');
      expect(out.data.user.is_active).toBe(true);
      expect(out.data.user.user_role_list[0].is_active).toBe(true);
      expect(out.data.user.user_role_list[0].role.is_active).toBe(true);
      expect(out.data.user.user_role_list[1].is_active).toBe(false);
      expect(out.data.user.user_role_list[1].role.is_active).toBe(false);
      // roleName is deliberately absent (D-imp-16).
      const userAsRecord = out.data.user as unknown as Record<string, unknown>;
      expect(userAsRecord.roleName).toBeUndefined();
      expect(userAsRecord.roles).toBeUndefined();
    });

    it('rejects target_user_id=0 (not positive) via ValidationPipe', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
      await expect(
        pipe.transform({ target_user_id: 0 }, {
          type: 'body',
          metatype: StartImpersonationDto,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a reason longer than 500 chars via ValidationPipe', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
      await expect(
        pipe.transform({ target_user_id: 1, reason: 'x'.repeat(501) }, {
          type: 'body',
          metatype: StartImpersonationDto,
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('end (R-IMP-004)', () => {
    it('throws ImpersonationServiceError SESSION_HEADER_REQUIRED (400) when the header is absent', async () => {
      const req = buildRequest({
        actor: { sec_user_id: 1 },
        header: undefined,
      });

      await expect(controller.end(req)).rejects.toMatchObject({
        code: ImpersonationErrorCodeEnum.SESSION_HEADER_REQUIRED,
        status: HttpStatus.BAD_REQUEST,
      });
      await expect(controller.end(req)).rejects.toBeInstanceOf(
        ImpersonationServiceError,
      );
    });

    it('defaults to end_reason="manual" when no body reason is given', async () => {
      service.end.mockResolvedValue({
        session_id: 'sess-1',
        started_at: new Date(),
        expires_at: new Date(),
        ended_at: new Date(),
      } as never);
      const req = buildRequest({ actor: { sec_user_id: 1 }, header: 'sess-1' });

      const out = await controller.end(req);

      expect(service.end).toHaveBeenCalledWith('sess-1', 1, 'manual');
      expect(out.status).toBe(HttpStatus.OK);
    });

    it('passes end_reason="logout" when body.reason is "logout"', async () => {
      service.end.mockResolvedValue({} as never);
      const req = buildRequest({ actor: { sec_user_id: 1 }, header: 'sess-1' });

      await controller.end(req, { reason: 'logout' });

      expect(service.end).toHaveBeenCalledWith('sess-1', 1, 'logout');
    });

    it('falls back to "manual" for an unrecognized body reason', async () => {
      service.end.mockResolvedValue({} as never);
      const req = buildRequest({ actor: { sec_user_id: 1 }, header: 'sess-1' });

      await controller.end(req, { reason: 'bogus' } as unknown as {
        reason?: 'manual' | 'logout';
      });

      expect(service.end).toHaveBeenCalledWith('sess-1', 1, 'manual');
    });
  });

  describe('current (R-IMP-004)', () => {
    it('returns {active:false} without calling the service when impersonation.invalid === "ended"', async () => {
      const req = buildRequest({
        user: { sec_user_id: 1 },
        impersonation: { session_id: 'sess-1', invalid: 'ended' },
        header: 'sess-1',
      });

      const out = await controller.current(req);

      expect(service.current).not.toHaveBeenCalled();
      expect(out.data).toEqual({ active: false });
      expect(out.status).toBe(HttpStatus.OK);
    });

    it('calls service.current(sessionId, actorId) and returns {active:false} verbatim when inactive', async () => {
      service.current.mockResolvedValue({ active: false } as CurrentResult);
      const req = buildRequest({ user: { sec_user_id: 1 }, header: undefined });

      const out = await controller.current(req);

      expect(service.current).toHaveBeenCalledWith(undefined, 1);
      expect(out.data).toEqual({ active: false });
    });

    it('maps TargetProfileDto (with coerced is_active) when active', async () => {
      service.current.mockResolvedValue({
        active: true,
        session: {
          session_id: 'sess-1',
          started_at: new Date(),
          expires_at: new Date(),
        },
        actor: {
          sec_user_id: 1,
          first_name: 'Admin',
          last_name: 'A',
          email: 'admin@example.com',
        },
        user: targetProfileFixture,
      });
      const req = buildRequest({ actor: { sec_user_id: 1 }, header: 'sess-1' });

      const out = await controller.current(req);

      expect(service.current).toHaveBeenCalledWith('sess-1', 1);
      const data = out.data as unknown as {
        active: boolean;
        user: { is_active: boolean };
      };
      expect(data.active).toBe(true);
      expect(data.user.is_active).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Role gating — exercised through the real RolesGuard pipeline (K-004
// mutation target). Presence-of-decorator assertions are NOT accepted proof
// per the T-04 work order: these tests build a real Nest HTTP app so the
// guard actually runs. Deleting `@UseGuards(RolesGuard)` from `start` (or
// `users`) makes the "Contributor -> 403" test in this block go green->red;
// this was verified manually and reverted (see report).
// ---------------------------------------------------------------------------
describe('ImpersonationController — RolesGuard enforcement (real guard, HTTP)', () => {
  let app: INestApplication;
  let service: {
    searchUsers: jest.Mock;
    start: jest.Mock;
    end: jest.Mock;
    current: jest.Mock;
  };

  // Single shared app for this describe block (not per-test) — matches
  // automapper.controller.spec.ts's convention and avoids the socket-teardown
  // flakiness observed with a fresh app.init()/app.close() per test.
  beforeAll(async () => {
    service = {
      searchUsers: jest.fn().mockResolvedValue([]),
      start: jest.fn().mockResolvedValue({
        session: {
          session_id: 's',
          started_at: new Date(),
          expires_at: new Date(),
        },
        user: targetProfileFixture,
      }),
      end: jest.fn(),
      current: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ImpersonationController],
      providers: [
        { provide: ImpersonationService, useValue: service },
        Reflector,
        RolesGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Stands in for JwtMiddleware (T-03, out of this spec's reach — KZ-017):
    // sets req.user from a test-only header so RolesGuard sees a real role
    // array, exactly as it would from the real middleware.
    app.use((req, _res, next) => {
      const rolesHeader = req.headers['x-test-roles'];
      req.user = {
        sec_user_id: 99,
        roles: rolesHeader ? JSON.parse(rolesHeader as string) : [],
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  it('declares @Roles(SYSTEM_ADMIN) on start (metadata sanity check, not the sole proof)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ImpersonationController.prototype.start,
    );
    expect(roles).toEqual([SecRolesEnum.SYSTEM_ADMIN]);
  });

  it('returns 403 for a Contributor on POST /start', async () => {
    await request(app.getHttpServer())
      .post('/start')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .send({ target_user_id: 55 })
      .expect(HttpStatus.FORBIDDEN);

    expect(service.start).not.toHaveBeenCalled();
  });

  it('allows a SYSTEM_ADMIN through on POST /start (201)', async () => {
    await request(app.getHttpServer())
      .post('/start')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.SYSTEM_ADMIN]))
      .send({ target_user_id: 55 })
      .expect(HttpStatus.CREATED);

    expect(service.start).toHaveBeenCalled();
  });

  it('returns 403 for a Contributor on GET /users', async () => {
    await request(app.getHttpServer())
      .get('/users?search=abc')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.CONTRIBUTOR]))
      .expect(HttpStatus.FORBIDDEN);

    expect(service.searchUsers).not.toHaveBeenCalled();
  });

  it('allows a SYSTEM_ADMIN through on GET /users (200)', async () => {
    await request(app.getHttpServer())
      .get('/users?search=abc')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.SYSTEM_ADMIN]))
      .expect(HttpStatus.OK);

    expect(service.searchUsers).toHaveBeenCalled();
  });

  // T-04 rework (Reviewer FAIL remediation step 3): the mocked-service
  // controller unit tests above call `pipe.transform(...)` directly, which
  // proves the DTO validates but not that the pipe is actually wired to
  // this handler. This exercises the real `@UsePipes(new ValidationPipe(...))`
  // on `searchUsers` through the real HTTP stack built in this describe
  // block, past a SYSTEM_ADMIN role check that a Contributor could not
  // clear — so a passed guard reaching a 400 proves the pipe, not the
  // guard.
  it('returns 400 for a SYSTEM_ADMIN on GET /users?search=ro (below the 3-char minimum, proves ValidationPipe is attached)', async () => {
    await request(app.getHttpServer())
      .get('/users?search=ro')
      .set('x-test-roles', JSON.stringify([SecRolesEnum.SYSTEM_ADMIN]))
      .expect(HttpStatus.BAD_REQUEST);

    expect(service.searchUsers).not.toHaveBeenCalled();
  });
});
