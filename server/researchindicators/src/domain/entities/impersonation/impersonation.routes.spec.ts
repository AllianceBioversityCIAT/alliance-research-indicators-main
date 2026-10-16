// @akili-spec changes/profile-simulation
import { INestApplication } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { route as mainRoutes } from '../../routes/main.routes';
import { ImpersonationAction } from './entities/impersonation-action.entity';
import { ImpersonationSession } from './entities/impersonation-session.entity';
import { ImpersonationModule } from './impersonation.module';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationUserRepository } from './repositories/impersonation-user.repository';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// @akili-spec changes/profile-simulation — T-04 rework attempt 2
//
// Reviewer FAIL remediation, acceptance box #2: proves the four
// impersonation handlers are actually *registered* at the real mount
// declared in `main.routes.ts`, not merely present as decorators on the
// controller class. K-004: a decorator-presence grep cannot evaluate route
// registration, and neither can `impersonation.controller.spec.ts`'s
// `Test.createTestingModule({ controllers: [ImpersonationController] })`
// harness — it has no `RouterModule.register`, no `EntitiesModule`, and no
// `setGlobalPrefix('api')`, so a wrong mount path or a deleted
// `main.routes.ts` node would leave those 21+ tests green.
//
// Two proofs, deliberately not merged into one, because they cover
// different failure modes and only one of them is reachable without
// dragging in the ~90 other modules `main.routes.ts` registers:
//
// 1. `main.routes.ts registers ...` below — a STATIC assertion over the
//    real `route` array *imported* from `main.routes.ts` (not retyped/
//    duplicated here). This is the presence-style check the Reviewer
//    flagged as weaker on its own, kept only because it is the one whose
//    target is exactly the node the K-004 failing input deletes (see the
//    report's K-004 evidence: deleting the node reddens this assertion and
//    nothing else in this file, because...
// 2. ...the `describe('live HTTP mount ...)` block below does NOT import
//    the full `mainRoutes` array into its `RouterModule.register` call
//    (that would require every one of ~90 sibling modules — Agresso,
//    Clarisa, OpenSearch, etc. — to instantiate under test, which this
//    unit-tier spec has no DB/secrets for). It registers only the single
//    `impersonationRouteEntry` object found by proof #1 above, alongside
//    the real `ImpersonationModule` (its TypeORM-repository-token and
//    `ImpersonationUserRepository` providers mocked out — this spec has no
//    MySQL connection, KZ-017). If the mount path drifted, the module
//    were missing a controller, or `setGlobalPrefix('api')` weren't
//    applied, these requests would 404, not merely fail to find a
//    decorator — that is the behavioural proof the FAIL called for.
//
// Scope note (KZ-017): this still cannot reach the real `JwtMiddleware`/
// `applyImpersonation` wiring (T-03) that populates `request.user`/
// `request.actor` in production — a tiny test middleware stands in for it,
// exactly as in `impersonation.controller.spec.ts`'s RolesGuard-enforcement
// block. Role gating and DTO validation are proven there and in
// `impersonation.controller.spec.ts`'s unit tests; this file's job is only
// "is this handler reachable at this path", so requests here always carry
// a SYSTEM_ADMIN identity.

const impersonationRouteEntry = mainRoutes.find(
  (entry) => entry.path === 'impersonation',
);

describe('impersonation route mount (T-04 acceptance #2)', () => {
  it('main.routes.ts registers { path: "impersonation", module: ImpersonationModule }', () => {
    // K-004 failing input: delete this node from main.routes.ts and this
    // assertion reddens (`impersonationRouteEntry` becomes `undefined`,
    // `.module` throws `TypeError: Cannot read properties of undefined`)
    // while the DTO/guard/service unit specs in
    // `impersonation.controller.spec.ts` stay green — see report.
    expect(impersonationRouteEntry).toBeDefined();
    expect(impersonationRouteEntry.module).toBe(ImpersonationModule);
  });

  describe('live HTTP mount (real RouterModule.register + real ImpersonationModule)', () => {
    let app: INestApplication;
    let service: {
      searchUsers: jest.Mock;
      start: jest.Mock;
      end: jest.Mock;
      current: jest.Mock;
    };

    beforeAll(async () => {
      service = {
        searchUsers: jest.fn().mockResolvedValue([]),
        start: jest.fn().mockResolvedValue({
          session: {
            session_id: 's',
            started_at: new Date(),
            expires_at: new Date(),
          },
          user: {
            sec_user_id: 55,
            first_name: 'Target',
            last_name: 'User',
            email: 'target@example.com',
            is_active: true,
            status_id: 1,
            user_role_list: [],
          },
        }),
        end: jest.fn().mockResolvedValue({}),
        current: jest.fn().mockResolvedValue({ active: false }),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          ImpersonationModule,
          RouterModule.register([impersonationRouteEntry] as Routes),
        ],
      })
        .overrideProvider(ImpersonationService)
        .useValue(service)
        .overrideProvider(getRepositoryToken(ImpersonationSession))
        .useValue({})
        .overrideProvider(getRepositoryToken(ImpersonationAction))
        .useValue({})
        .overrideProvider(ImpersonationUserRepository)
        .useValue({})
        .compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api');
      // Stands in for JwtMiddleware (T-03, out of reach here — KZ-017).
      // Always an authenticated SYSTEM_ADMIN: this block proves reachability,
      // not authorization (that's impersonation.controller.spec.ts's job).
      app.use((req, _res, next) => {
        req.user = { sec_user_id: 1, roles: [SecRolesEnum.SYSTEM_ADMIN] };
        next();
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('GET /api/impersonation/users does not 404 (resolves 200)', async () => {
      await request(app.getHttpServer())
        .get('/api/impersonation/users?search=abc')
        .expect(200);

      expect(service.searchUsers).toHaveBeenCalled();
    });

    it('POST /api/impersonation/start does not 404 (resolves 201)', async () => {
      await request(app.getHttpServer())
        .post('/api/impersonation/start')
        .send({ target_user_id: 55 })
        .expect(201);

      expect(service.start).toHaveBeenCalled();
    });

    it('POST /api/impersonation/end without the session header does not 404 (resolves 400)', async () => {
      await request(app.getHttpServer())
        .post('/api/impersonation/end')
        .expect(400);

      expect(service.end).not.toHaveBeenCalled();
    });

    it('GET /api/impersonation/current does not 404 (resolves 200)', async () => {
      await request(app.getHttpServer())
        .get('/api/impersonation/current')
        .expect(200);

      expect(service.current).toHaveBeenCalled();
    });

    it('GET /api/v1/impersonation/users 404s — there is no /v1 segment in this app (main.ts enables URI versioning with no default version, and no controller here declares one)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/impersonation/users?search=abc')
        .expect(404);
    });
  });
});
