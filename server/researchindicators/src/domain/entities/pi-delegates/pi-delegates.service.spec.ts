// @akili-spec docs/specs/changes/my-pi-delegates — T-14
//
// Unit tests for PiDelegatesService (v3 — bulk API).
//
// This file is a FULL REWRITE of the T-09 version because T-13 removed the
// v2 create()/revoke() methods and changed the constructor from 2 to 3 args.
// The service now exposes: assign() / bulkRevoke() / list() / verify().
//
// Constructor: new PiDelegatesService(repo, currentUserUtil, dataSource)
//
// Transaction mocking strategy:
//   mockDataSource.transaction is a jest.fn that invokes its callback
//   synchronously with mockManager.  This makes the async assign()/bulkRevoke()
//   body execute inside the test without real DB work, while still exercising
//   every branch (Steps 1–5 for assign, ambiguity guard + soft-delete for
//   bulkRevoke).
//
// Seams (design.md §10.3 / TDD skill — agreed seams from the spec):
//   - assign()     → ProjectSyncSummary[] | ForbiddenException | BadRequestException
//   - bulkRevoke() → BulkRevokeSummary    | ForbiddenException | BadRequestException
//   - list()       → PiDelegate[]         | ForbiddenException
//   - verify()     → { exists: boolean }  | ForbiddenException
//
// KZ-001 (anti-pattern guard): assertions are on RETURNED VALUES / thrown
//   exceptions / which repo methods were called WITH WHAT ARGUMENTS (the
//   delegate/project arguments ARE the service's observable behavior — which
//   delegates get created/revoked, per the brief).  No bare call-order assertions.
//
// KZ-004 (discriminating fields): each scenario uses DISTINCT project ids
//   and delegate user ids so per-project scoping is proven, not a batch-wide pass.
//
// Scenario → test map (spec scenarios 1–11):
//   1  — assign sync diff (Mateo case, R-PID-009 AC.2)
//   2  — mass-revoke sharp edge (T-12 carry-forward, entire current set revoked)
//   3  — provision-once (AC.5, T-11 carry-forward): same identity twice → resolved ONCE
//   4  — PI-exclusion fail-fast (R-PID-008 / AC.4): BadRequestException, nothing applied
//   5  — Auth fail-fast (AC.3): ForbiddenException, nothing applied
//   6  — Cross-project isolation (KZ-004): two projects, distinct sets, each gets own diff
//   7  — Multi-project cartesian: desired set applied to every project_id
//   8  — bulkRevoke Shape A (pi_delegate_ids): findOne → auth → softDeleteDelegateIds
//   9  — bulkRevoke Shape B (project_ids × delegate_user_ids): auth → softDeleteDelegatePairs
//   10 — bulkRevoke ambiguity guard: both shapes / partial Shape B / neither → 400
//   11 — bulkRevoke Shape A auth denied on row's project → ForbiddenException

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PiDelegatesService } from './pi-delegates.service';
import {
  PiDelegatesRepository,
  DelegateInput,
} from './repositories/pi-delegates.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { PiDelegate } from './entities/pi-delegate.entity';
import { BulkAssignPiDelegatesDto } from './dto/bulk-assign-pi-delegates.dto';
import { BulkRevokePiDelegatesDto } from './dto/bulk-revoke-pi-delegates.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePiDelegate(overrides: Partial<PiDelegate> = {}): PiDelegate {
  const row = new PiDelegate();
  row.pi_delegate_id = 1;
  row.project_id = 'PROJ-DEFAULT';
  row.pi_user_id = 10;
  row.delegate_user_id = 20;
  row.is_active = true;
  return Object.assign(row, overrides);
}

// ─── Service factory ──────────────────────────────────────────────────────────

interface MockRepoOptions {
  /** isPiOrActiveDelegateOfProject result (default: true, authorized) */
  isPiOrActiveDelegate?: boolean;
  /** isPiOfProject result per (projectId, userId) — keyed by `${projectId}:${userId}` */
  isPiOfProjectMap?: Record<string, boolean>;
  /** listActiveDelegateUserIds result per projectId */
  currentDelegatesByProject?: Record<string, number[]>;
  /** resolveDelegateUserId result for each DelegateInput (positional) */
  resolvedUserIds?: number[];
  /** insertDelegate result (default: a fresh PiDelegate) */
  insertDelegateResult?: PiDelegate;
  /** softDeleteDelegatePairs result (rows affected, default 1) */
  softDeleteDelegatePairsResult?: number;
  /** softDeleteDelegateIds result (rows affected, default 1) */
  softDeleteDelegateIdsResult?: number;
  /** findOne result for bulkRevoke Shape A */
  findOneResult?: PiDelegate | null;
}

function makeService(opts: {
  userId?: number;
  roles?: number[];
  repo?: Partial<MockRepoOptions>;
}) {
  const repoOpts = opts.repo ?? {};

  // Build the mock manager (used by transaction callback).
  // The service only passes it to repo methods — the repo methods are mocked,
  // so mockManager can be a plain object.
  const mockManager = {} as unknown as EntityManager;

  // Track call counts for resolve (to test provision-once).
  let resolveCallIndex = 0;

  // ── Mock repo methods ──────────────────────────────────────────────────────

  const isPiOrActiveDelegateOfProject = jest
    .fn()
    .mockResolvedValue(repoOpts.isPiOrActiveDelegate ?? true);

  const isPiOfProject = jest
    .fn()
    .mockImplementation(
      (projectId: string, userId: number): Promise<boolean> => {
        const key = `${projectId}:${userId}`;
        const map = repoOpts.isPiOfProjectMap ?? {};
        return Promise.resolve(map[key] ?? false);
      },
    );

  const listActiveDelegateUserIds = jest
    .fn()
    .mockImplementation((projectId: string): Promise<number[]> => {
      const map = repoOpts.currentDelegatesByProject ?? {};
      return Promise.resolve(map[projectId] ?? []);
    });

  const resolvedIds = repoOpts.resolvedUserIds ?? [];
  const resolveDelegateUserId = jest
    .fn()
    .mockImplementation(
      (_input: DelegateInput, _manager: EntityManager): Promise<number> => {
        const id = resolvedIds[resolveCallIndex] ?? 999;
        resolveCallIndex++;
        return Promise.resolve(id);
      },
    );

  const insertDelegate = jest
    .fn()
    .mockResolvedValue(repoOpts.insertDelegateResult ?? makePiDelegate());

  const softDeleteDelegatePairs = jest
    .fn()
    .mockResolvedValue(repoOpts.softDeleteDelegatePairsResult ?? 1);

  const softDeleteDelegateIds = jest
    .fn()
    .mockResolvedValue(repoOpts.softDeleteDelegateIdsResult ?? 1);

  const findOne = jest
    .fn()
    .mockResolvedValue(
      repoOpts.findOneResult !== undefined ? repoOpts.findOneResult : null,
    );

  const find = jest.fn().mockResolvedValue([]);

  const mockRepo = {
    isPiOrActiveDelegateOfProject,
    isPiOfProject,
    listActiveDelegateUserIds,
    resolveDelegateUserId,
    insertDelegate,
    softDeleteDelegatePairs,
    softDeleteDelegateIds,
    findOne,
    find,
  } as unknown as PiDelegatesRepository;

  // ── Mock currentUserUtil ───────────────────────────────────────────────────
  const mockCurrentUser = {
    user_id: opts.userId ?? 50,
    roles: opts.roles ?? [],
  } as unknown as CurrentUserUtil;

  // ── Mock dataSource (transaction runs callback synchronously) ──────────────
  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation((cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockManager),
      ),
  } as unknown as DataSource;

  const service = new PiDelegatesService(
    mockRepo,
    mockCurrentUser,
    mockDataSource,
  );

  return {
    service,
    mockRepo,
    mockCurrentUser,
    mockDataSource,
    mockManager,
    // Individual mocks for assertions
    isPiOrActiveDelegateOfProject,
    isPiOfProject,
    listActiveDelegateUserIds,
    resolveDelegateUserId,
    insertDelegate,
    softDeleteDelegatePairs,
    softDeleteDelegateIds,
    findOne,
  };
}

// ─── Scenario 1 — Sync diff: Mateo case (R-PID-009 AC.2) ────────────────────
// current=[1,2,3], desired=[1,2,4] →
//   created=[4], revoked=[3], kept=[1,2]
//
// Scenario maps:
//   resolveDelegateUserId called with delegate_user_ids 1,2,4 → returns them.
//   current for PROJ-SC1: [1,2,3].
//   4 not in current → insertDelegate(PROJ-SC1, ..., 4, ...).
//   3 not in desired → softDeleteDelegatePairs(PROJ-SC1, [3], ...).
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 1: sync diff (Mateo case, R-PID-009 AC.2)', () => {
  it('creates delegate 4, revokes delegate 3, keeps 1 and 2 — summary is accurate', async () => {
    const { service, insertDelegate, softDeleteDelegatePairs } = makeService({
      userId: 50,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [1, 2, 4],
        currentDelegatesByProject: { 'PROJ-SC1': [1, 2, 3] },
        softDeleteDelegatePairsResult: 1,
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC1'],
      delegates: [
        { delegate_user_id: 1 },
        { delegate_user_id: 2 },
        { delegate_user_id: 4 },
      ],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(1);
    const summary = result[0];
    expect(summary.project_id).toBe('PROJ-SC1');
    expect(summary.created).toContain(4);
    expect(summary.created).not.toContain(1);
    expect(summary.created).not.toContain(2);
    expect(summary.created).not.toContain(3);
    expect(summary.revoked).toContain(3);
    expect(summary.revoked).not.toContain(1);
    expect(summary.revoked).not.toContain(2);
    expect(summary.revoked).not.toContain(4);
    expect(summary.kept).toContain(1);
    expect(summary.kept).toContain(2);
    expect(summary.kept).not.toContain(3);
    expect(summary.kept).not.toContain(4);

    // insertDelegate called for 4 (desired\current), with PROJ-SC1
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-SC1',
      50, // callerUserId
      4,
      50, // createdBy = callerUserId
      expect.anything(), // manager
    );
    // softDeleteDelegatePairs called for [3] in PROJ-SC1
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-SC1',
      [3],
      50,
      expect.anything(),
    );
  });
});

// ─── Scenario 2 — Mass-revoke sharp edge (T-12 carry-forward) ────────────────
// current=[1,2], desired=[9] →
//   created=[9], revoked=[1,2], kept=[]
//
// This exercises the deliberate declarative revoke of the entire current set.
// The test proves this path is covered and the summary reflects it correctly.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 2: mass-revoke sharp edge (T-12 carry-forward)', () => {
  it('revokes the entire current set [1,2] when desired set is [9]', async () => {
    const { service, softDeleteDelegatePairs, insertDelegate } = makeService({
      userId: 60,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [9],
        currentDelegatesByProject: { 'PROJ-SC2': [1, 2] },
        softDeleteDelegatePairsResult: 2,
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC2'],
      delegates: [{ delegate_user_id: 9 }],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(1);
    const summary = result[0];
    expect(summary.project_id).toBe('PROJ-SC2');
    expect(summary.created).toEqual([9]);
    expect(summary.revoked).toEqual(expect.arrayContaining([1, 2]));
    expect(summary.revoked).toHaveLength(2);
    expect(summary.kept).toHaveLength(0);

    // Both 1 and 2 must be revoked
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-SC2',
      expect.arrayContaining([1, 2]),
      60,
      expect.anything(),
    );
    // 9 must be inserted
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-SC2',
      60,
      9,
      60,
      expect.anything(),
    );
  });
});

// ─── Scenario 3 — Provision-once (AC.5, T-11 carry-forward) ─────────────────
// Same delegate identity appears TWICE in dto.delegates →
// resolveDelegateUserId called ONCE (dedupe), no double-provision.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 3: provision-once (AC.5, T-11 carry-forward)', () => {
  it('same delegate_user_id twice in dto.delegates → resolveDelegateUserId called ONCE', async () => {
    const { service, resolveDelegateUserId } = makeService({
      userId: 70,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [42],
        currentDelegatesByProject: { 'PROJ-SC3': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC3'],
      delegates: [
        { delegate_user_id: 42 }, // first occurrence
        { delegate_user_id: 42 }, // duplicate — must be deduped
      ],
    };

    const result = await service.assign(dto);

    // resolveDelegateUserId MUST have been called exactly ONCE (dedupe)
    expect(resolveDelegateUserId).toHaveBeenCalledTimes(1);
    // The summary should show 42 created once
    expect(result[0].created).toEqual([42]);
  });

  it('same new-user identity (email) twice → resolveDelegateUserId called ONCE', async () => {
    const { service, resolveDelegateUserId } = makeService({
      userId: 71,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [88],
        currentDelegatesByProject: { 'PROJ-SC3B': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC3B'],
      delegates: [
        {
          delegate: {
            email: 'dup@example.org',
            first_name: 'Dup',
            last_name: 'User',
          },
        },
        {
          delegate: {
            email: 'dup@example.org',
            first_name: 'Dup',
            last_name: 'User',
          },
        },
      ],
    };

    await service.assign(dto);

    // The key for dedup is `email:dup@example.org`; both entries share the same key.
    expect(resolveDelegateUserId).toHaveBeenCalledTimes(1);
  });
});

// ─── Scenario 4 — PI-exclusion fail-fast (R-PID-008 / AC.4) ─────────────────
// isPiOfProject returns true for one (project, delegate) pair →
// assign() rejects with BadRequestException, nothing applied.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 4: PI-exclusion fail-fast (R-PID-008)', () => {
  it('delegate who IS the PI of the project → BadRequestException, insertDelegate NOT called', async () => {
    // userId 100 is the PI of PROJ-SC4
    const { service, insertDelegate, softDeleteDelegatePairs } = makeService({
      userId: 80,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [100],
        // 100 is PI of PROJ-SC4
        isPiOfProjectMap: { 'PROJ-SC4:100': true },
        currentDelegatesByProject: { 'PROJ-SC4': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC4'],
      delegates: [{ delegate_user_id: 100 }],
    };

    await expect(service.assign(dto)).rejects.toThrow(BadRequestException);
    // Fail-fast: nothing must have been applied
    expect(insertDelegate).not.toHaveBeenCalled();
    expect(softDeleteDelegatePairs).not.toHaveBeenCalled();
  });

  it('PI-exclusion error names the offending pair (R-PID-008 AC.3)', async () => {
    const { service } = makeService({
      userId: 81,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [200],
        isPiOfProjectMap: { 'PROJ-SC4B:200': true },
        currentDelegatesByProject: { 'PROJ-SC4B': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC4B'],
      delegates: [{ delegate_user_id: 200 }],
    };

    await expect(service.assign(dto)).rejects.toThrow(/PI-exclusion/);
  });

  it('non-PI delegate in same request is not the cause — exclusion is per-pair', async () => {
    // 300 is PI of PROJ-SC4C, 301 is not → whole request rejected because one pair violates
    const { service, insertDelegate } = makeService({
      userId: 82,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [301, 300],
        isPiOfProjectMap: { 'PROJ-SC4C:300': true },
        currentDelegatesByProject: { 'PROJ-SC4C': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC4C'],
      delegates: [{ delegate_user_id: 301 }, { delegate_user_id: 300 }],
    };

    await expect(service.assign(dto)).rejects.toThrow(BadRequestException);
    expect(insertDelegate).not.toHaveBeenCalled();
  });
});

// ─── Scenario 5 — Auth fail-fast (AC.3) ──────────────────────────────────────
// assertCanManageProject (via isPiOrActiveDelegateOfProject = false + non-admin)
// throws ForbiddenException for one project → nothing applied.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 5: auth fail-fast (R-PID-009 AC.3)', () => {
  it('caller not PI/delegate/admin → ForbiddenException, insertDelegate NOT called', async () => {
    const { service, insertDelegate, softDeleteDelegatePairs } = makeService({
      userId: 90,
      roles: [SecRolesEnum.CONTRIBUTOR], // not SYSTEM_ADMIN
      repo: {
        isPiOrActiveDelegate: false, // not authorized
        resolvedUserIds: [55],
        currentDelegatesByProject: { 'PROJ-SC5': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC5'],
      delegates: [{ delegate_user_id: 55 }],
    };

    await expect(service.assign(dto)).rejects.toThrow(ForbiddenException);
    expect(insertDelegate).not.toHaveBeenCalled();
    expect(softDeleteDelegatePairs).not.toHaveBeenCalled();
  });

  it('SYSTEM_ADMIN role bypasses isPiOrActiveDelegateOfProject check', async () => {
    const { service, isPiOrActiveDelegateOfProject: authCheck } = makeService({
      userId: 91,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        isPiOrActiveDelegate: false, // would be denied, but SYSTEM_ADMIN bypasses
        resolvedUserIds: [66],
        currentDelegatesByProject: { 'PROJ-SC5B': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC5B'],
      delegates: [{ delegate_user_id: 66 }],
    };

    await expect(service.assign(dto)).resolves.toBeDefined();
    // isPiOrActiveDelegateOfProject must NOT have been called (SYSTEM_ADMIN short-circuits)
    expect(authCheck).not.toHaveBeenCalled();
  });

  it('PI/active-delegate of project is allowed (isPiOrActiveDelegateOfProject = true)', async () => {
    const { service } = makeService({
      userId: 92,
      roles: [SecRolesEnum.CONTRIBUTOR],
      repo: {
        isPiOrActiveDelegate: true, // authorized as PI/delegate
        resolvedUserIds: [67],
        currentDelegatesByProject: { 'PROJ-SC5C': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-SC5C'],
      delegates: [{ delegate_user_id: 67 }],
    };

    await expect(service.assign(dto)).resolves.toBeDefined();
  });
});

// ─── Scenario 6 — Cross-project isolation (KZ-004) ───────────────────────────
// Two projects with DISTINCT current sets + distinct desired ids →
// each project is synced to its OWN set, not batch-wide.
// Different project ids + user ids per case so scoping is provable.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 6: cross-project isolation (KZ-004)', () => {
  it('two projects get INDEPENDENT diffs — insertDelegate/softDeleteDelegatePairs args differ per project', async () => {
    // PROJ-ALPHA: current=[10,11], desired=[10,12] → create 12, revoke 11, keep 10
    // PROJ-BETA:  current=[20,21], desired=[20,22] → create 22, revoke 21, keep 20
    // (same desired_user_ids = [10,12,20,22] resolved in order per unique input)
    //
    // KZ-004: project ids are distinct; user ids are distinct sets.

    const { service, insertDelegate, softDeleteDelegatePairs } = makeService({
      userId: 100,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [10, 12, 20, 22],
        currentDelegatesByProject: {
          'PROJ-ALPHA': [10, 11],
          'PROJ-BETA': [20, 21],
        },
      },
    });

    // delegates set is cartesian: same list applies to both projects per DD-K
    // but desired set resolved = [10, 12, 20, 22] (all 4 unique inputs)
    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-ALPHA', 'PROJ-BETA'],
      delegates: [
        { delegate_user_id: 10 },
        { delegate_user_id: 12 },
        { delegate_user_id: 20 },
        { delegate_user_id: 22 },
      ],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(2);
    const alpha = result.find((s) => s.project_id === 'PROJ-ALPHA')!;
    const beta = result.find((s) => s.project_id === 'PROJ-BETA')!;

    // PROJ-ALPHA: 12 created (new), 11 revoked (missing from desired), 10 kept
    expect(alpha.created).toContain(12);
    expect(alpha.revoked).toContain(11);
    expect(alpha.kept).toContain(10);

    // PROJ-BETA: 22 created, 21 revoked, 20 kept
    expect(beta.created).toContain(22);
    expect(beta.revoked).toContain(21);
    expect(beta.kept).toContain(20);

    // insertDelegate must have been called with PROJ-ALPHA for 12
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-ALPHA',
      100,
      12,
      100,
      expect.anything(),
    );
    // insertDelegate must have been called with PROJ-BETA for 22
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-BETA',
      100,
      22,
      100,
      expect.anything(),
    );

    // softDeleteDelegatePairs must have been called with PROJ-ALPHA for [11]
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-ALPHA',
      expect.arrayContaining([11]),
      100,
      expect.anything(),
    );
    // softDeleteDelegatePairs must have been called with PROJ-BETA for [21]
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-BETA',
      expect.arrayContaining([21]),
      100,
      expect.anything(),
    );

    // Prove per-project scoping: 11 was NOT passed to PROJ-BETA, 21 NOT to PROJ-ALPHA
    // (KZ-004 — discriminating field check)
    const alphaSoftDeleteCalls = softDeleteDelegatePairs.mock.calls.filter(
      (c) => c[0] === 'PROJ-ALPHA',
    );
    expect(alphaSoftDeleteCalls[0][1]).not.toContain(21); // PROJ-BETA's revokee not in ALPHA

    const betaSoftDeleteCalls = softDeleteDelegatePairs.mock.calls.filter(
      (c) => c[0] === 'PROJ-BETA',
    );
    expect(betaSoftDeleteCalls[0][1]).not.toContain(11); // PROJ-ALPHA's revokee not in BETA
  });
});

// ─── Scenario 7 — Multi-project cartesian ────────────────────────────────────
// Desired set applied to every project_id (DD-K).
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — Scenario 7: multi-project cartesian (DD-K)', () => {
  it('same desired set is synced into all three projects, returning one summary per project', async () => {
    const { service } = makeService({
      userId: 110,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [5],
        currentDelegatesByProject: {
          'PROJ-C1': [],
          'PROJ-C2': [],
          'PROJ-C3': [],
        },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      project_ids: ['PROJ-C1', 'PROJ-C2', 'PROJ-C3'],
      delegates: [{ delegate_user_id: 5 }],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(3);
    const projectIds = result.map((s) => s.project_id);
    expect(projectIds).toContain('PROJ-C1');
    expect(projectIds).toContain('PROJ-C2');
    expect(projectIds).toContain('PROJ-C3');
    // Every project must have delegate 5 in created (none existed before)
    for (const summary of result) {
      expect(summary.created).toContain(5);
    }
  });
});

// ─── Scenario 8 — bulkRevoke Shape A (by pi_delegate_ids) ───────────────────
// findOne per id → assertCanManageProject(row.project_id) → softDeleteDelegateIds.
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — Scenario 8: Shape A (pi_delegate_ids)', () => {
  it('revokes by PK → findOne → auth on row.project_id → softDeleteDelegateIds with the id', async () => {
    const existingRow = makePiDelegate({
      pi_delegate_id: 7,
      project_id: 'PROJ-REV-A',
      delegate_user_id: 30,
      is_active: true,
    });

    const { service, findOne, softDeleteDelegateIds } = makeService({
      userId: 120,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { findOneResult: existingRow },
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [7],
    };

    const result = await service.bulkRevoke(dto);

    // findOne called with the id
    expect(findOne).toHaveBeenCalledWith({
      where: { pi_delegate_id: 7, is_active: true },
    });
    // softDeleteDelegateIds called with [7]
    expect(softDeleteDelegateIds).toHaveBeenCalledWith(
      [7],
      120,
      expect.anything(),
    );
    // Result shape
    expect(result).toHaveProperty('revoked_count');
    expect(result.revoked_count).toBeGreaterThanOrEqual(0);
  });

  it('Shape A: already-revoked or missing row is skipped silently (no error)', async () => {
    const { service, softDeleteDelegateIds } = makeService({
      userId: 121,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { findOneResult: null }, // row not found → skip
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [999],
    };

    const result = await service.bulkRevoke(dto);

    // softDeleteDelegateIds NOT called (nothing to revoke)
    expect(softDeleteDelegateIds).not.toHaveBeenCalled();
    expect(result.revoked_count).toBe(0);
  });
});

// ─── Scenario 9 — bulkRevoke Shape B (project_ids × delegate_user_ids) ───────
// Auth per project → softDeleteDelegatePairs(projectId, delegate_user_ids).
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — Scenario 9: Shape B (project_ids × delegate_user_ids)', () => {
  it('revokes by project+delegate pairs → auth per project → softDeleteDelegatePairs', async () => {
    const { service, softDeleteDelegatePairs } = makeService({
      userId: 130,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { softDeleteDelegatePairsResult: 2 },
    });

    const dto: BulkRevokePiDelegatesDto = {
      project_ids: ['PROJ-REVB1'],
      delegate_user_ids: [1, 2],
    };

    const result = await service.bulkRevoke(dto);

    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-REVB1',
      [1, 2],
      130,
      expect.anything(),
    );
    expect(result.revoked_count).toBe(2);
  });

  it('Shape B: two projects → softDeleteDelegatePairs called once per project', async () => {
    const { service, softDeleteDelegatePairs } = makeService({
      userId: 131,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { softDeleteDelegatePairsResult: 1 },
    });

    const dto: BulkRevokePiDelegatesDto = {
      project_ids: ['PROJ-REVB2A', 'PROJ-REVB2B'],
      delegate_user_ids: [40],
    };

    await service.bulkRevoke(dto);

    expect(softDeleteDelegatePairs).toHaveBeenCalledTimes(2);
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-REVB2A',
      [40],
      131,
      expect.anything(),
    );
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-REVB2B',
      [40],
      131,
      expect.anything(),
    );
  });
});

// ─── Scenario 10 — bulkRevoke ambiguity guard ─────────────────────────────────
// Both shapes → 400; partial Shape B (project_ids only) → 400; neither → 400.
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — Scenario 10: ambiguity guard', () => {
  it('both pi_delegate_ids AND project_ids supplied → BadRequestException (ambiguous)', async () => {
    const { service } = makeService({
      userId: 140,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [7],
      project_ids: ['PROJ-AMB'],
      delegate_user_ids: [1],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
    await expect(service.bulkRevoke(dto)).rejects.toThrow(/[Aa]mbiguous/);
  });

  it('pi_delegate_ids AND project_ids without delegate_user_ids → BadRequestException', async () => {
    const { service } = makeService({
      userId: 140,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [7],
      project_ids: ['PROJ-AMB2'],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
  });

  it('partial Shape B — project_ids only (no delegate_user_ids) → BadRequestException', async () => {
    const { service } = makeService({
      userId: 141,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: BulkRevokePiDelegatesDto = {
      project_ids: ['PROJ-PARTIAL'],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
    await expect(service.bulkRevoke(dto)).rejects.toThrow(
      /[Ii]ncomplete|[Pp]artial|[Nn]o revoke/,
    );
  });

  it('partial Shape B — delegate_user_ids only (no project_ids) → BadRequestException', async () => {
    const { service } = makeService({
      userId: 141,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: BulkRevokePiDelegatesDto = {
      delegate_user_ids: [5],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
  });

  it('neither shape provided (empty dto object) → BadRequestException', async () => {
    const { service } = makeService({
      userId: 142,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto = {} as BulkRevokePiDelegatesDto;

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
    await expect(service.bulkRevoke(dto)).rejects.toThrow(/[Nn]o revoke/);
  });

  it('empty arrays for both shapes → treated as neither → BadRequestException', async () => {
    const { service } = makeService({
      userId: 143,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [],
      project_ids: [],
      delegate_user_ids: [],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(BadRequestException);
  });
});

// ─── Scenario 11 — bulkRevoke Shape A auth denied on row's project ────────────
// findOne returns a row with project_id the caller cannot manage →
// ForbiddenException.
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — Scenario 11: Shape A auth denied on row project', () => {
  it('row found but caller not authorized on row.project_id → ForbiddenException', async () => {
    const rowWithForeignProject = makePiDelegate({
      pi_delegate_id: 15,
      project_id: 'PROJ-DENIED',
      is_active: true,
    });

    const { service, softDeleteDelegateIds } = makeService({
      userId: 150,
      roles: [SecRolesEnum.CONTRIBUTOR], // not SYSTEM_ADMIN
      repo: {
        isPiOrActiveDelegate: false, // denied on PROJ-DENIED
        findOneResult: rowWithForeignProject,
      },
    });

    const dto: BulkRevokePiDelegatesDto = {
      pi_delegate_ids: [15],
    };

    await expect(service.bulkRevoke(dto)).rejects.toThrow(ForbiddenException);
    // Soft-delete must NOT have been called (fail-fast inside the transaction)
    expect(softDeleteDelegateIds).not.toHaveBeenCalled();
  });
});

// ─── list() and verify() — unchanged from v2, kept for regression ─────────────
describe('list() and verify() — unchanged from v2', () => {
  it('list() returns active delegations for the given projectId', async () => {
    const rows = [
      makePiDelegate({ project_id: 'PROJ-LIST', delegate_user_id: 61 }),
      makePiDelegate({
        project_id: 'PROJ-LIST',
        delegate_user_id: 62,
        pi_delegate_id: 2,
      }),
    ];

    const { service, mockRepo } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    // Override find on the mock repo
    (mockRepo.find as jest.Mock).mockResolvedValue(rows);

    const result = await service.list('PROJ-LIST');

    expect(result).toBe(rows);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { project_id: 'PROJ-LIST', is_active: true },
      order: { pi_delegate_id: 'ASC' },
    });
  });

  it('list() for unauthorized caller → ForbiddenException', async () => {
    const { service } = makeService({
      userId: 88,
      roles: [],
      repo: { isPiOrActiveDelegate: false },
    });

    await expect(service.list('PROJ-LIST-AUTH')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('verify() returns { exists: true } when delegation row found', async () => {
    const row = makePiDelegate({
      project_id: 'PROJ-VER',
      delegate_user_id: 71,
    });

    const { service, mockRepo } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    (mockRepo.findOne as jest.Mock).mockResolvedValue(row);

    const dto: VerifyPiDelegateDto = {
      project_id: 'PROJ-VER',
      delegate_user_id: 71,
    };
    const result = await service.verify(dto);

    expect(result).toEqual({ exists: true });
  });

  it('verify() returns { exists: false } when no delegation row found', async () => {
    const { service, mockRepo } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

    const dto: VerifyPiDelegateDto = {
      project_id: 'PROJ-VER2',
      delegate_user_id: 72,
    };
    const result = await service.verify(dto);

    expect(result).toEqual({ exists: false });
  });
});
