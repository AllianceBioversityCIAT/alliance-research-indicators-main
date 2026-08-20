import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, Type } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AutomapperController } from './automapper.controller';
import {
  AutomapperApplyResult,
  AutomapperCandidate,
  AutomapperClassification,
  AutomapperCoverage,
  AutomapperResolution,
  AutomapperService,
} from './automapper.service';
import { BilateralProjectMappingController } from './bilateral-project-mapping.controller';
import { BilateralProjectMappingModule } from './bilateral-project-mapping.module';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 / R-CAM-002
// (scenario, AC.1, AC.3, and its `BUT it must NOT` on cron); design.md §4,
// §8, DD-3.
//
// Falsifiers F1-F4 are named verbatim below so the corresponding assertion
// is easy to find and re-run as a mutation gate:
//   F1 — make preview() call apply() -> the write-avoidance assertion reds
//   F2 — remove @Roles -> the denied-role assertion reds
//   F3 — make apply() accept/use a candidate list from the body -> the
//        body-cannot-inject-pairs assertion reds
//   F4 — declare GET coverage below :id in the module -> the route
//        registration-order test reds with a 400 (ParseIntPipe), not 200

const fakeUser = {
  sec_user_id: 42,
  roles: [SecRolesEnum.CENTER_ADMIN],
} as User;
const reqUser = { user: fakeUser } as { user: User };

const makeCandidate = (
  overrides: Partial<AutomapperCandidate> = {},
): AutomapperCandidate => ({
  clarisaProjectId: 1516,
  clarisaProjectFullName: 'Full Name 1516',
  clarisaProjectShortName: 'Short 1516',
  externalCode: 'C-D514',
  derivedContractId: 'D514',
  ...overrides,
});

describe('AutomapperController', () => {
  let controller: AutomapperController;
  let service: jest.Mocked<
    Pick<
      AutomapperService,
      'resolve' | 'classify' | 'apply' | 'coverage' | 'getFeedFetchedAt'
    >
  >;

  const emptyResolution: AutomapperResolution = {
    resolved: [],
    ambiguous: [],
    unresolved: [],
  };
  const emptyClassification: AutomapperClassification = {
    toCreate: [],
    alreadyMapped: [],
    divergent: [],
    supersede: [],
  };
  const emptyApplyResult: AutomapperApplyResult = {
    created: 0,
    alreadyMapped: 0,
    divergent: 0,
    superseded: 0,
  };
  const coverageFixture: AutomapperCoverage = {
    mapped: 4,
    pending: 194,
    reachable: 198,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomapperController],
      providers: [
        {
          provide: AutomapperService,
          useValue: {
            resolve: jest.fn().mockResolvedValue(emptyResolution),
            classify: jest.fn().mockResolvedValue(emptyClassification),
            apply: jest.fn().mockResolvedValue(emptyApplyResult),
            coverage: jest.fn().mockResolvedValue(coverageFixture),
            getFeedFetchedAt: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    controller = module.get(AutomapperController);
    service = module.get(AutomapperService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('role gating metadata', () => {
    it('declares @Roles(CENTER_ADMIN, SYSTEM_ADMIN) at controller level', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, AutomapperController);
      expect(roles).toEqual([
        SecRolesEnum.CENTER_ADMIN,
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
    });

    it('declares @UseGuards(RolesGuard) at controller level', () => {
      const guards = Reflect.getMetadata('__guards__', AutomapperController);
      expect(guards).toBeDefined();
      expect(
        (guards as ReadonlyArray<new (...args: unknown[]) => unknown>).some(
          (g) => g === RolesGuard,
        ),
      ).toBe(true);
    });
  });

  // F2 — role gating BEHAVIOUR, not just declared metadata: a real
  // RolesGuard + real Reflector reading AutomapperController's actual
  // decorators. Removing @Roles from the controller makes
  // Reflector.getAllAndOverride return undefined, RolesGuard.canActivate's
  // own "if (!requiredRoles) return true" branch fires, and the "denies"
  // case below flips from false to true — reddening this test.
  describe('role gating behaviour (F2)', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const contextFor = (
      handler: (...args: unknown[]) => unknown,
      user?: Partial<User>,
    ) =>
      ({
        getHandler: () => handler,
        getClass: () => AutomapperController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as never;

    it('allows CENTER_ADMIN on preview', () => {
      const ctx = contextFor(AutomapperController.prototype.preview, {
        roles: [SecRolesEnum.CENTER_ADMIN],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows SYSTEM_ADMIN on apply (bypass role)', () => {
      const ctx = contextFor(AutomapperController.prototype.apply, {
        roles: [SecRolesEnum.SYSTEM_ADMIN],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('DENIES a role with no admin privilege on preview', () => {
      const ctx = contextFor(AutomapperController.prototype.preview, {
        roles: [SecRolesEnum.CONTRIBUTOR],
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('DENIES an unauthenticated request (no user) on apply', () => {
      const ctx = contextFor(AutomapperController.prototype.apply, undefined);
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('preview — writes nothing (R-CAM-002 AC.1)', () => {
    it('calls resolve() + classify() and never apply() (F1)', async () => {
      await controller.preview({ phase: 2026 });

      expect(service.resolve).toHaveBeenCalledWith(2026);
      expect(service.classify).toHaveBeenCalledWith(emptyResolution.resolved);
      // The gate: a row/write count taken before and after, proxied here
      // (no DB in this suite, per the T-05 brief) by asserting the ONLY
      // mutating service method was never invoked. Making preview() call
      // apply() must redden this specific assertion, not a status code.
      expect(service.apply).not.toHaveBeenCalled();
    });

    it('wraps the four counts, extra buckets, and feed timestamp in the envelope', async () => {
      const toCreate = [{ ...makeCandidate(), action: 'toCreate' as const }];
      const alreadyMapped = [
        {
          ...makeCandidate({ clarisaProjectId: 1 }),
          action: 'alreadyMapped' as const,
          existingMappingId: 10,
          existingClarisaProjectId: 1,
        },
      ];
      const ambiguous = [makeCandidate({ clarisaProjectId: 2 })];
      const unresolved = [makeCandidate({ clarisaProjectId: 3 })];
      const divergent = [
        {
          ...makeCandidate({ clarisaProjectId: 4 }),
          action: 'divergent' as const,
          existingMappingId: 11,
          existingClarisaProjectId: 40,
        },
      ];
      const supersede = [
        {
          ...makeCandidate({ clarisaProjectId: 5 }),
          action: 'supersede' as const,
          existingMappingId: 12,
          existingClarisaProjectId: 50,
        },
      ];

      service.resolve.mockResolvedValueOnce({
        resolved: [...toCreate, ...alreadyMapped, ...divergent, ...supersede],
        ambiguous,
        unresolved,
      });
      service.classify.mockResolvedValueOnce({
        toCreate,
        alreadyMapped,
        divergent,
        supersede,
      });
      service.getFeedFetchedAt.mockReturnValueOnce(1_700_000_000_000);

      const out = await controller.preview();

      expect(out.status).toBe(HttpStatus.OK);
      expect(out.description).toMatch(/no rows written/i);
      expect(out.data.counts).toEqual({
        toCreate: 1,
        alreadyMapped: 1,
        ambiguous: 1,
        unresolved: 1,
        divergent: 1,
        supersede: 1,
      });
      expect(out.data.feedFetchedAt).toBe(
        new Date(1_700_000_000_000).toISOString(),
      );
      expect(out.data.toCreate).toEqual(toCreate);
      expect(out.data.ambiguous).toEqual(ambiguous);
      expect(out.data.unresolved).toEqual(unresolved);
      expect(out.data.divergent).toEqual(divergent);
      expect(out.data.supersede).toEqual(supersede);
    });

    it('handles a null feed timestamp (cold cache) without throwing', async () => {
      service.getFeedFetchedAt.mockReturnValueOnce(null);
      const out = await controller.preview();
      expect(out.data.feedFetchedAt).toBeNull();
    });

    // design.md §9 — one LoggerUtil summary per run: cohort size, the four
    // bucket counts, feed timestamp, and preview vs apply.
    it('logs one summary line with cohort size, the four counts, and the feed timestamp (§9, RB-3)', async () => {
      const logSpy = jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);

      // try/finally: if an assertion below throws, the spy is restored
      // anyway. Without this, LoggerUtil.prototype._log stays mocked for
      // every later test in the file — jest.clearAllMocks() clears call
      // history but does not restore a spy's implementation (T-05 rework,
      // closer #3).
      try {
        const resolved = [makeCandidate({ clarisaProjectId: 1 })];
        const ambiguous = [makeCandidate({ clarisaProjectId: 2 })];
        const unresolved = [makeCandidate({ clarisaProjectId: 3 })];
        service.resolve.mockResolvedValueOnce({
          resolved,
          ambiguous,
          unresolved,
        });
        service.classify.mockResolvedValueOnce({
          toCreate: [{ ...resolved[0], action: 'toCreate' as const }],
          alreadyMapped: [],
          divergent: [],
          supersede: [],
        });
        const fetchedAt = 1_700_000_000_000;
        service.getFeedFetchedAt.mockReturnValueOnce(fetchedAt);

        await controller.preview();

        // Exact string, not a `.+` wildcard — a wildcard is satisfied by a
        // hardcoded `feedFetchedAt=unknown`, which would pass even if the
        // real timestamp were never interpolated (T-05 rework, closer #2).
        expect(logSpy).toHaveBeenCalledWith(
          'automapper preview: cohort=3, toCreate=1, alreadyMapped=0, ambiguous=1, unresolved=1, ' +
            `feedFetchedAt=${new Date(fetchedAt).toISOString()}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('apply — the only mutating endpoint (R-CAM-002 AC.2)', () => {
    it('derives `resolved` by calling resolve() itself, then passes it to apply() (Finding 1)', async () => {
      const resolvedCandidates = [makeCandidate()];
      service.resolve.mockResolvedValueOnce({
        resolved: resolvedCandidates,
        ambiguous: [],
        unresolved: [],
      });

      await controller.apply(reqUser as never, { phase: 2026 });

      expect(service.resolve).toHaveBeenCalledWith(2026);
      expect(service.apply).toHaveBeenCalledWith(resolvedCandidates, fakeUser);
    });

    // F3 — the body cannot inject arbitrary pairs. AutomapperRunRequestDto
    // has no field for a candidate list, so even a body carrying an extra
    // `resolved`/`candidates` property must be ignored: apply() is called
    // with whatever service.resolve() itself returned, never with the
    // body's own payload. Mutating apply() to read `body.resolved` (or
    // similar) and hand it to service.apply() must redden this test.
    it('IGNORES a caller-supplied candidate list smuggled onto the body (F3)', async () => {
      const legitimateResolved = [makeCandidate({ clarisaProjectId: 999 })];
      service.resolve.mockResolvedValueOnce({
        resolved: legitimateResolved,
        ambiguous: [],
        unresolved: [],
      });

      const maliciousBody = {
        phase: 2026,
        resolved: [{ clarisaProjectId: 1, derivedContractId: 'FORGED' }],
        candidates: [{ clarisaProjectId: 2, derivedContractId: 'ALSO-FORGED' }],
      } as never;

      await controller.apply(reqUser as never, maliciousBody);

      expect(service.apply).toHaveBeenCalledTimes(1);
      const [passedResolved] = service.apply.mock.calls[0];
      expect(passedResolved).toBe(legitimateResolved);
      expect(passedResolved).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ derivedContractId: 'FORGED' }),
        ]),
      );
    });

    it('wraps created/alreadyMapped/divergent/superseded plus ambiguous+unresolved from resolve()', async () => {
      const ambiguous = [makeCandidate({ clarisaProjectId: 7 })];
      const unresolved = [makeCandidate({ clarisaProjectId: 8 })];
      service.resolve.mockResolvedValueOnce({
        resolved: [makeCandidate()],
        ambiguous,
        unresolved,
      });
      service.apply.mockResolvedValueOnce({
        created: 1,
        alreadyMapped: 2,
        divergent: 3,
        superseded: 4,
      });
      service.getFeedFetchedAt.mockReturnValueOnce(1_700_000_000_000);

      const out = await controller.apply(reqUser as never, { phase: 2026 });

      expect(out.status).toBe(HttpStatus.OK);
      expect(out.data.counts).toEqual({
        created: 1,
        alreadyMapped: 2,
        ambiguous: 1,
        unresolved: 1,
        divergent: 3,
        superseded: 4,
      });
      expect(out.data.ambiguous).toEqual(ambiguous);
      expect(out.data.unresolved).toEqual(unresolved);
      expect(out.data.feedFetchedAt).toBe(
        new Date(1_700_000_000_000).toISOString(),
      );
    });

    // design.md §9 — same summary-line requirement as preview, for apply.
    // divergent/superseded are non-zero here deliberately: RB-3's stated
    // purpose is "why do I have 194 new rows", and a supersede deactivates
    // one row AND inserts another, so an apply log line that drops
    // superseded undercounts what the run actually wrote (T-05 rework,
    // closer #1). Zero values would not catch a dropped interpolation.
    it('logs one summary line with cohort size, all six counts (incl. divergent/superseded), and the feed timestamp (§9, RB-3)', async () => {
      const logSpy = jest
        .spyOn(LoggerUtil.prototype, '_log')
        .mockImplementation(() => undefined);

      // try/finally: see the preview test's comment above — a failed
      // assertion here must not leave LoggerUtil.prototype._log mocked for
      // every later test in the file (T-05 rework, closer #3).
      try {
        service.resolve.mockResolvedValueOnce({
          resolved: [makeCandidate({ clarisaProjectId: 1 })],
          ambiguous: [makeCandidate({ clarisaProjectId: 2 })],
          unresolved: [],
        });
        service.apply.mockResolvedValueOnce({
          created: 1,
          alreadyMapped: 0,
          divergent: 2,
          superseded: 3,
        });
        const fetchedAt = 1_700_000_000_000;
        service.getFeedFetchedAt.mockReturnValueOnce(fetchedAt);

        await controller.apply(reqUser as never, {});

        // Exact string, not a `.+` wildcard — see the preview test's
        // comment (T-05 rework, closer #2).
        expect(logSpy).toHaveBeenCalledWith(
          'automapper apply: cohort=2, created=1, alreadyMapped=0, ambiguous=1, unresolved=0, ' +
            `divergent=2, superseded=3, feedFetchedAt=${new Date(fetchedAt).toISOString()}`,
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('coverage', () => {
    it('delegates to service.coverage and wraps the envelope', async () => {
      const out = await controller.coverage({ phase: 2026 });

      expect(service.coverage).toHaveBeenCalledWith(2026);
      expect(out.status).toBe(HttpStatus.OK);
      expect(out.data).toEqual(coverageFixture);
    });

    it('passes undefined phase through when omitted', async () => {
      await controller.coverage({});
      expect(service.coverage).toHaveBeenCalledWith(undefined);
    });
  });

  // Advisory (T-05 rework): the original 3-file hardcoded list covered only
  // 3 of this directory's ~12 top-level .ts files — a scheduling decorator
  // added to e.g. bilateral-project-mapping.service.ts would have passed
  // silently. A directory scan makes the gate cover every top-level
  // production file automatically, present and future, for the same cost.
  // `.spec.ts` files are excluded deliberately: THIS spec file's own test
  // titles/regex literally contain the string "@Cron" to describe what
  // they check, which would otherwise self-trigger a false positive — the
  // same trap the header docblock comment hit earlier in this file.
  describe('no scheduling decorator anywhere in the module (R-CAM-002 "BUT it must NOT")', () => {
    const moduleDir = __dirname;
    const productionFiles = fs
      .readdirSync(moduleDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));

    it('scans more than the 3 files the original gate covered', () => {
      expect(productionFiles.length).toBeGreaterThan(3);
    });

    it.each(productionFiles)(
      '%s does not import or use a scheduling decorator',
      (file) => {
        const contents = fs.readFileSync(path.join(moduleDir, file), 'utf-8');
        expect(contents).not.toMatch(/@Cron/);
      },
    );
  });
});

// F4 — route registration order (T-05 Finding 3). A real HTTP-bound Nest
// app whose `controllers` array is READ OFF the real
// BilateralProjectMappingModule's own @Module() metadata — not a value
// retyped in this spec file. A hardcoded copy of the order can drift from
// the module silently: swap the real array and a hardcoded-order test
// stays green while production breaks, which is exactly the false
// guarantee a prior version of this test made. Reading
// Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BilateralProjectMappingModule)
// is what makes the claim below true: swap the order in
// bilateral-project-mapping.module.ts's `controllers` array and THIS test
// reddens with a 400 (ParseIntPipe rejecting "coverage" as a number),
// never a clean 200 or a 404 — because it is reading the array that was
// swapped. Importing the module class only evaluates its decorator
// metadata (Reflect.defineMetadata at class-definition time); it does not
// build a DI container, open a TypeORM connection, or instantiate anything.
describe('AutomapperController — GET coverage registered above :id (F4)', () => {
  let app: INestApplication;
  let coverageMock: jest.Mock;
  let controllers: Type<unknown>[];

  beforeAll(async () => {
    coverageMock = jest.fn().mockResolvedValue({
      mapped: 4,
      pending: 194,
      reachable: 198,
    });

    controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      BilateralProjectMappingModule,
    ) as Type<unknown>[];

    const moduleRef = await Test.createTestingModule({
      controllers,
      providers: [
        {
          provide: AutomapperService,
          useValue: {
            resolve: jest.fn(),
            classify: jest.fn(),
            apply: jest.fn(),
            coverage: coverageMock,
            getFeedFetchedAt: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: BilateralProjectMappingService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: BilateralMappingCoverageService,
          useValue: { getCoverageReport: jest.fn() },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('confirms the real module registers AutomapperController before BilateralProjectMappingController', () => {
    // Documents WHY the HTTP test below passes: the array read off the
    // real module's metadata, not an assumption about it.
    expect(controllers[0]).toBe(AutomapperController);
    expect(controllers).toContain(BilateralProjectMappingController);
  });

  it('GET /coverage resolves to AutomapperController.coverage, not ParseIntPipe on :id', async () => {
    const res = await request(app.getHttpServer()).get('/coverage');

    expect(res.status).toBe(HttpStatus.OK);
    expect(coverageMock).toHaveBeenCalled();
    expect(res.body.data).toEqual({ mapped: 4, pending: 194, reachable: 198 });
  });
});
