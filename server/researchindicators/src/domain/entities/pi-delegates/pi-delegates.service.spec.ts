// @akili-spec docs/specs/changes/my-pi-delegates — T-21
// active_delegate_key removal + by-delegate endpoint (2026-09-11)
//
// Unit tests for PiDelegatesService (v5 — pi_user_id removed from entity + history).
//
// pi_user_id was removed from pi_delegates and pi_delegate_history (Product decision
// 2026-09-11 — redundant with created_by). This file adapts the v4 (T-21) suite
// to the v5 shape:
//   - insertDelegate(project_id, delegate_user_id, createdBy, manager) — 4 args (pi_user_id gone).
//   - recordHistory(entry, actorId, manager) where entry = { pi_delegate_id, project_id,
//     delegate_user_id, action } — no pi_user_id in entry.
//   - Fixture rows for revoke context no longer carry pi_user_id.
//
// History-actor assertion adaptation (requirement 2 per brief):
//   Previously, revoke tests asserted that the FETCHED ROW's pi_user_id appeared in
//   recordHistory, proving "who originally assigned" was captured. With pi_user_id gone,
//   "who did the movement" is expressed via actorId (the 2nd arg to recordHistory),
//   which equals the revoking caller. Tests now assert:
//     - entry fields = { pi_delegate_id, project_id, delegate_user_id, action }
//     - actorId = the revoking caller's user_id.
//   This keeps the provenance assertion meaningful: a wrong actorId still fails the test.
//
// What is kept from v4:
//   - Scenarios 1–11 coverage (per-project sync, empty=revoke-all, history per movement,
//     PI-exclusion, auth, provision-once, bulkRevoke shapes A+B, ambiguity guard, auth deny).
//   - list() / verify() regression tests.
//   - KZ-001 (assertions on args, not bare call count), KZ-004 (distinct ids per scenario).
//
// Constructor: new PiDelegatesService(repo, currentUserUtil, dataSource)
//
// Seams (design.md §11.3 / TDD skill):
//   - assign()     → ProjectSyncSummary[] | ForbiddenException | BadRequestException
//   - bulkRevoke() → BulkRevokeSummary    | ForbiddenException | BadRequestException
//   - list()       → PiDelegate[]         | ForbiddenException
//   - verify()     → { exists: boolean }  | ForbiddenException
//
// KZ-001: assertions on returned values / thrown exceptions / recordHistory +
//   insertDelegate + softDelete* call arguments — NOT bare call order.
//
// KZ-004: distinct project ids and delegate user ids per scenario so
//   per-project scoping is proven, not a batch-wide pass.
//
// Scenario → test map (T-21, v5):
//   1  — per-project sync (distinct lists per project, P1 and P2)
//   2  — empty delegates = revoke-all (R-PID-011 AC.3)
//   3  — history per movement (assign: insertDelegate id; revoke: fetched row context + actorId)
//   4a — rolled-back (PI-exclusion) → recordHistory NOT called
//   4b — rolled-back (auth-denied)  → insertDelegate + recordHistory NOT called
//   5  — provision-once across assignments (resolveDelegateUserId called ONCE)
//   6  — bulkRevoke Shape A → recordHistory('revoke') per row with row context
//   7  — bulkRevoke Shape B → recordHistory('revoke') per fetched row
//   (8–11 from T-14 — bulkRevoke shapes / ambiguity guard / auth — kept)

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
import { PiDelegateHistoryActionEnum } from './enum/pi-delegate-history-action.enum';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePiDelegate(overrides: Partial<PiDelegate> = {}): PiDelegate {
  const row = new PiDelegate();
  row.pi_delegate_id = 1;
  row.project_id = 'PROJ-DEFAULT';
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
  /** insertDelegate result (default: a fresh PiDelegate with pi_delegate_id 1) */
  insertDelegateResults?: PiDelegate[];
  /** softDeleteDelegatePairs result (rows affected, default 1) */
  softDeleteDelegatePairsResult?: number;
  /** softDeleteDelegateIds result (rows affected, default 1) */
  softDeleteDelegateIdsResult?: number;
  /** findOne result for bulkRevoke Shape A */
  findOneResult?: PiDelegate | null;
  /**
   * Rows that manager.getRepository(PiDelegate).find() returns for revoke-context
   * fetching. Keyed by project_id; the service filters by project + delegate_user_ids.
   * Default: [] (no rows — safe for tests that don't revoke).
   */
  rowsToRevokeByProject?: Record<string, PiDelegate[]>;
}

function makeService(opts: {
  userId?: number;
  roles?: number[];
  repo?: Partial<MockRepoOptions>;
}) {
  const repoOpts = opts.repo ?? {};

  // ── insertDelegate call counter (supports multiple sequential results) ──────
  let insertCallIndex = 0;
  const insertDelegateResults = repoOpts.insertDelegateResults;

  // ── resolveDelegateUserId call counter ───────────────────────────────────────
  let resolveCallIndex = 0;

  // ── Build the mock manager ───────────────────────────────────────────────────
  //
  // The service calls manager.getRepository(PiDelegate).find({...}) to fetch
  // active rows before recording revoke history (T-19 assign + bulkRevoke Shape B).
  // We mock getRepository to return an object with .find() that is keyed by the
  // rows stored in rowsToRevokeByProject.
  //
  // For scenarios that don't revoke, find resolves [] by default.
  const rowsToRevokeByProject = repoOpts.rowsToRevokeByProject ?? {};

  const managerFind = jest.fn().mockImplementation(
    (options?: {
      where?: {
        project_id?: string;
        delegate_user_id?: unknown;
        is_active?: boolean;
      };
    }) => {
      const projectId = options?.where?.project_id;
      if (projectId && rowsToRevokeByProject[projectId]) {
        return Promise.resolve(rowsToRevokeByProject[projectId]);
      }
      return Promise.resolve([]);
    },
  );

  const mockManager = {
    getRepository: jest.fn().mockReturnValue({
      find: managerFind,
    }),
  } as unknown as EntityManager;

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
    .mockImplementation((): Promise<PiDelegate> => {
      const result =
        insertDelegateResults?.[insertCallIndex] ??
        makePiDelegate({ pi_delegate_id: insertCallIndex + 1 });
      insertCallIndex++;
      return Promise.resolve(result);
    });

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

  const recordHistory = jest.fn().mockResolvedValue(undefined);

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
    recordHistory,
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
    recordHistory,
    managerFind,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 1 — Per-project sync (distinct lists per project, R-PID-011)
//
// assignments: [{ P1, [Juan=1, Carlos=4] }, { P2, [Ana=7] }]
//   P1 current=[1 (Juan), 2 (Mateo)]:
//     created=[4 (Carlos)], revoked=[2 (Mateo)], kept=[1 (Juan)]
//   P2 current=[5 (Bob)]:
//     created=[7 (Ana)], revoked=[5 (Bob)], kept=[]
//
// KZ-004: P1 and P2 use fully distinct delegate ids to prove per-project scoping.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — T-21 Scenario 1: per-project sync (distinct lists per project, R-PID-011)', () => {
  it('P1 and P2 each get their own diff — summaries and call args are per-project', async () => {
    // P1 desired: 1 (Juan), 4 (Carlos) — resolved in that order
    // P2 desired: 7 (Ana)
    // Dedup input keys are distinct (all by delegate_user_id) so resolve is called per unique.
    const p1RevokedRow = makePiDelegate({
      pi_delegate_id: 55,
      project_id: 'PROJ-P1-SC1',
      delegate_user_id: 2, // Mateo
      is_active: true,
    });
    const p2RevokedRow = makePiDelegate({
      pi_delegate_id: 66,
      project_id: 'PROJ-P2-SC1',
      delegate_user_id: 5, // Bob
      is_active: true,
    });

    const { service, insertDelegate, softDeleteDelegatePairs, recordHistory } =
      makeService({
        userId: 50,
        roles: [SecRolesEnum.SYSTEM_ADMIN],
        repo: {
          // Unique inputs (by id): 1, 4, 7 — resolved in order
          resolvedUserIds: [1, 4, 7],
          currentDelegatesByProject: {
            'PROJ-P1-SC1': [1, 2], // P1 current: Juan, Mateo
            'PROJ-P2-SC1': [5], // P2 current: Bob
          },
          rowsToRevokeByProject: {
            'PROJ-P1-SC1': [p1RevokedRow], // Mateo row
            'PROJ-P2-SC1': [p2RevokedRow], // Bob row
          },
          insertDelegateResults: [
            makePiDelegate({
              pi_delegate_id: 101,
              project_id: 'PROJ-P1-SC1',
              delegate_user_id: 4,
            }),
            makePiDelegate({
              pi_delegate_id: 102,
              project_id: 'PROJ-P2-SC1',
              delegate_user_id: 7,
            }),
          ],
        },
      });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        {
          project_id: 'PROJ-P1-SC1',
          delegates: [{ delegate_user_id: 1 }, { delegate_user_id: 4 }],
        },
        {
          project_id: 'PROJ-P2-SC1',
          delegates: [{ delegate_user_id: 7 }],
        },
      ],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(2);

    const p1 = result.find((s) => s.project_id === 'PROJ-P1-SC1')!;
    const p2 = result.find((s) => s.project_id === 'PROJ-P2-SC1')!;

    // P1 summary: created=[4], revoked=[2], kept=[1]
    expect(p1.created).toEqual([4]);
    expect(p1.revoked).toEqual([2]);
    expect(p1.kept).toEqual([1]);

    // P2 summary: created=[7], revoked=[5], kept=[]
    expect(p2.created).toEqual([7]);
    expect(p2.revoked).toEqual([5]);
    expect(p2.kept).toHaveLength(0);

    // insertDelegate must be called with the correct per-project 4-arg form (KZ-001)
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-P1-SC1',
      4,
      50,
      expect.anything(),
    );
    expect(insertDelegate).toHaveBeenCalledWith(
      'PROJ-P2-SC1',
      7,
      50,
      expect.anything(),
    );

    // softDeleteDelegatePairs must be called per-project with the correct ids (KZ-001, KZ-004)
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-P1-SC1',
      [2],
      50,
      expect.anything(),
    );
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-P2-SC1',
      [5],
      50,
      expect.anything(),
    );

    // KZ-004 scoping proof: P1's revokee (2) NOT in P2's args, and vice versa
    const p1SoftCalls = (
      softDeleteDelegatePairs.mock.calls as Array<
        [string, number[], number, unknown]
      >
    ).filter((c) => c[0] === 'PROJ-P1-SC1');
    expect(p1SoftCalls[0][1]).not.toContain(5);

    const p2SoftCalls = (
      softDeleteDelegatePairs.mock.calls as Array<
        [string, number[], number, unknown]
      >
    ).filter((c) => c[0] === 'PROJ-P2-SC1');
    expect(p2SoftCalls[0][1]).not.toContain(2);

    // History: assign for Carlos (P1) and Ana (P2)
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 101,
        project_id: 'PROJ-P1-SC1',
        delegate_user_id: 4, // Carlos
        action: PiDelegateHistoryActionEnum.ASSIGN,
      }),
      50, // actorId = caller
      expect.anything(),
    );
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 102,
        project_id: 'PROJ-P2-SC1',
        delegate_user_id: 7, // Ana
        action: PiDelegateHistoryActionEnum.ASSIGN,
      }),
      50, // actorId = caller
      expect.anything(),
    );

    // Revoke history uses the FETCHED ROW's pi_delegate_id and delegate_user_id;
    // actorId = the revoking caller (50).
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 55, // Mateo row's id
        project_id: 'PROJ-P1-SC1',
        delegate_user_id: 2, // Mateo
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      50, // actorId = caller
      expect.anything(),
    );
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 66, // Bob row's id
        project_id: 'PROJ-P2-SC1',
        delegate_user_id: 5, // Bob
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      50, // actorId = caller
      expect.anything(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 2 — Empty delegates = revoke-all (R-PID-011 AC.3)
//
// assignments: [{ P2, delegates: [] }] where P2 current=[Ana=7, Bob=5]
//   → created=[], revoked=[7,5], kept=[]
//   + a REVOKE history row for each revoked delegate.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — T-21 Scenario 2: empty delegates = revoke-all (R-PID-011 AC.3)', () => {
  it('empty delegates list revokes ALL current delegates and writes REVOKE history per row', async () => {
    const anaRow = makePiDelegate({
      pi_delegate_id: 201,
      project_id: 'PROJ-SC2-EMPTY',
      delegate_user_id: 7, // Ana
      is_active: true,
    });
    const bobRow = makePiDelegate({
      pi_delegate_id: 202,
      project_id: 'PROJ-SC2-EMPTY',
      delegate_user_id: 5, // Bob
      is_active: true,
    });

    const { service, insertDelegate, softDeleteDelegatePairs, recordHistory } =
      makeService({
        userId: 60,
        roles: [SecRolesEnum.SYSTEM_ADMIN],
        repo: {
          resolvedUserIds: [],
          currentDelegatesByProject: { 'PROJ-SC2-EMPTY': [7, 5] },
          rowsToRevokeByProject: {
            'PROJ-SC2-EMPTY': [anaRow, bobRow],
          },
        },
      });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [{ project_id: 'PROJ-SC2-EMPTY', delegates: [] }],
    };

    const result = await service.assign(dto);

    expect(result).toHaveLength(1);
    const summary = result[0];
    expect(summary.project_id).toBe('PROJ-SC2-EMPTY');
    expect(summary.created).toHaveLength(0);
    expect(summary.revoked).toEqual(expect.arrayContaining([7, 5]));
    expect(summary.revoked).toHaveLength(2);
    expect(summary.kept).toHaveLength(0);

    // insertDelegate NOT called (nothing to create)
    expect(insertDelegate).not.toHaveBeenCalled();

    // softDeleteDelegatePairs called with the full revoke set
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-SC2-EMPTY',
      expect.arrayContaining([7, 5]),
      60,
      expect.anything(),
    );

    // REVOKE history written for Ana — entry has no pi_user_id; actorId = caller (60)
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 201,
        project_id: 'PROJ-SC2-EMPTY',
        delegate_user_id: 7,
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      60,
      expect.anything(),
    );

    // REVOKE history written for Bob
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 202,
        project_id: 'PROJ-SC2-EMPTY',
        delegate_user_id: 5,
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      60,
      expect.anything(),
    );

    // recordHistory called exactly twice (one revoke per delegate)
    expect(recordHistory).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 3 — History per movement (R-PID-012)
//
// 3a: assign create → recordHistory called with insertDelegate's returned
//     pi_delegate_id, the delegate_user_id, and action='assign'.
//     actorId = caller's user_id.
// 3b: assign revoke → recordHistory called with the FETCHED ROW's pi_delegate_id
//     and delegate_user_id, and action='revoke'.
//     actorId = the revoking caller's user_id (the "who" is preserved in actorId,
//     not in a pi_user_id field that no longer exists).
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — T-21 Scenario 3: history per movement (R-PID-012)', () => {
  it('3a: create → recordHistory(assign) with insertDelegate returned pi_delegate_id', async () => {
    const newRow = makePiDelegate({
      pi_delegate_id: 301,
      project_id: 'PROJ-SC3A',
      delegate_user_id: 42,
      is_active: true,
    });

    const { service, recordHistory } = makeService({
      userId: 70,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [42],
        currentDelegatesByProject: { 'PROJ-SC3A': [] },
        insertDelegateResults: [newRow],
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-SC3A', delegates: [{ delegate_user_id: 42 }] },
      ],
    };

    await service.assign(dto);

    // recordHistory called with the returned row's pi_delegate_id; actorId = caller (70)
    expect(recordHistory).toHaveBeenCalledTimes(1);
    expect(recordHistory).toHaveBeenCalledWith(
      {
        pi_delegate_id: 301, // insertDelegate's returned id
        project_id: 'PROJ-SC3A',
        delegate_user_id: 42,
        action: PiDelegateHistoryActionEnum.ASSIGN,
      },
      70, // actorId = caller
      expect.anything(),
    );
  });

  it('3b: revoke → recordHistory(revoke) with fetched ROW context; actorId = revoking caller', async () => {
    // The row was originally assigned by some earlier caller (not the current one).
    // With pi_user_id gone, the "who" is tracked only via actorId in recordHistory.
    // The assertion: actorId must be the REVOKING caller (71), not some other value.
    const revokedRow = makePiDelegate({
      pi_delegate_id: 302,
      project_id: 'PROJ-SC3B',
      delegate_user_id: 43,
      is_active: true,
    });

    const { service, recordHistory } = makeService({
      userId: 71, // revoking caller
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [],
        currentDelegatesByProject: { 'PROJ-SC3B': [43] },
        rowsToRevokeByProject: { 'PROJ-SC3B': [revokedRow] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-SC3B', delegates: [] }, // revoke-all
      ],
    };

    await service.assign(dto);

    expect(recordHistory).toHaveBeenCalledTimes(1);
    expect(recordHistory).toHaveBeenCalledWith(
      {
        pi_delegate_id: 302,
        project_id: 'PROJ-SC3B',
        delegate_user_id: 43,
        action: PiDelegateHistoryActionEnum.REVOKE,
      },
      71, // actorId = revoking caller (71) — this is the preserved "who"
      expect.anything(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 4 — Rolled-back = no history (R-PID-012 AC.3)
//
// 4a: PI-exclusion → BadRequestException AND recordHistory NOT called.
// 4b: Auth-denied  → ForbiddenException AND insertDelegate + recordHistory NOT called.
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — T-21 Scenario 4: rolled-back = no history', () => {
  it('4a: PI-exclusion → BadRequestException AND recordHistory NOT called', async () => {
    const { service, insertDelegate, recordHistory } = makeService({
      userId: 80,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [100],
        isPiOfProjectMap: { 'PROJ-SC4A:100': true },
        currentDelegatesByProject: { 'PROJ-SC4A': [] },
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-SC4A', delegates: [{ delegate_user_id: 100 }] },
      ],
    };

    await expect(service.assign(dto)).rejects.toThrow(BadRequestException);
    expect(insertDelegate).not.toHaveBeenCalled();
    expect(recordHistory).not.toHaveBeenCalled();
  });

  it('4a: PI-exclusion error message names the offending pair (R-PID-008 AC.3)', async () => {
    const { service } = makeService({
      userId: 81,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [200],
        isPiOfProjectMap: { 'PROJ-SC4B:200': true },
        currentDelegatesByProject: { 'PROJ-SC4B': [] },
      },
    });

    await expect(
      service.assign({
        assignments: [
          { project_id: 'PROJ-SC4B', delegates: [{ delegate_user_id: 200 }] },
        ],
      }),
    ).rejects.toThrow(/PI-exclusion/);
  });

  it('4b: auth-denied → ForbiddenException AND insertDelegate + recordHistory NOT called', async () => {
    const { service, insertDelegate, softDeleteDelegatePairs, recordHistory } =
      makeService({
        userId: 90,
        roles: [SecRolesEnum.CONTRIBUTOR], // not SYSTEM_ADMIN
        repo: {
          isPiOrActiveDelegate: false,
          resolvedUserIds: [55],
          currentDelegatesByProject: { 'PROJ-SC4C': [] },
        },
      });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-SC4C', delegates: [{ delegate_user_id: 55 }] },
      ],
    };

    await expect(service.assign(dto)).rejects.toThrow(ForbiddenException);
    expect(insertDelegate).not.toHaveBeenCalled();
    expect(softDeleteDelegatePairs).not.toHaveBeenCalled();
    expect(recordHistory).not.toHaveBeenCalled();
  });

  it('4b: SYSTEM_ADMIN bypasses isPiOrActiveDelegateOfProject', async () => {
    const { service, isPiOrActiveDelegateOfProject: authCheck } = makeService({
      userId: 91,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        isPiOrActiveDelegate: false, // would fail but SYSTEM_ADMIN short-circuits
        resolvedUserIds: [66],
        currentDelegatesByProject: { 'PROJ-SC4D': [] },
      },
    });

    await expect(
      service.assign({
        assignments: [
          { project_id: 'PROJ-SC4D', delegates: [{ delegate_user_id: 66 }] },
        ],
      }),
    ).resolves.toBeDefined();
    expect(authCheck).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 5 — Provision-once across assignments (R-PID-011 AC.4)
//
// The same delegate identity appears in TWO assignments' delegates lists →
// resolveDelegateUserId called ONCE (dedup across assignments).
// ─────────────────────────────────────────────────────────────────────────────
describe('assign() — T-21 Scenario 5: provision-once across assignments (R-PID-011 AC.4)', () => {
  it('same delegate_user_id in two assignments → resolveDelegateUserId called ONCE', async () => {
    const { service, resolveDelegateUserId } = makeService({
      userId: 70,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [42], // only ONE unique input to resolve
        currentDelegatesByProject: {
          'PROJ-SC5A': [],
          'PROJ-SC5B': [],
        },
        insertDelegateResults: [
          makePiDelegate({ pi_delegate_id: 501, delegate_user_id: 42 }),
          makePiDelegate({ pi_delegate_id: 502, delegate_user_id: 42 }),
        ],
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-SC5A', delegates: [{ delegate_user_id: 42 }] },
        { project_id: 'PROJ-SC5B', delegates: [{ delegate_user_id: 42 }] },
      ],
    };

    await service.assign(dto);

    // resolveDelegateUserId called exactly ONCE — the identity is deduped across assignments
    expect(resolveDelegateUserId).toHaveBeenCalledTimes(1);
  });

  it('same email identity in two assignments → resolveDelegateUserId called ONCE', async () => {
    const { service, resolveDelegateUserId } = makeService({
      userId: 71,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        resolvedUserIds: [88],
        currentDelegatesByProject: {
          'PROJ-SC5C': [],
          'PROJ-SC5D': [],
        },
        insertDelegateResults: [
          makePiDelegate({ pi_delegate_id: 503, delegate_user_id: 88 }),
          makePiDelegate({ pi_delegate_id: 504, delegate_user_id: 88 }),
        ],
      },
    });

    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        {
          project_id: 'PROJ-SC5C',
          delegates: [
            {
              delegate: {
                email: 'shared@example.org',
                first_name: 'Shared',
                last_name: 'User',
              },
            },
          ],
        },
        {
          project_id: 'PROJ-SC5D',
          delegates: [
            {
              delegate: {
                email: 'shared@example.org',
                first_name: 'Shared',
                last_name: 'User',
              },
            },
          ],
        },
      ],
    };

    await service.assign(dto);

    expect(resolveDelegateUserId).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 6 — bulkRevoke Shape A + history (R-PID-013)
//
// Each row fetched → recordHistory('revoke') with the ROW's pi_delegate_id,
// delegate_user_id, and project_id. actorId = the CALLER's user_id.
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — T-21 Scenario 6: Shape A records history per row (R-PID-013)', () => {
  it('Shape A: row found → recordHistory(revoke) with row context, then softDeleteDelegateIds', async () => {
    const existingRow = makePiDelegate({
      pi_delegate_id: 601,
      project_id: 'PROJ-REV-A-SC6',
      delegate_user_id: 30,
      is_active: true,
    });

    const { service, recordHistory, softDeleteDelegateIds } = makeService({
      userId: 120,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { findOneResult: existingRow },
    });

    const dto: BulkRevokePiDelegatesDto = { pi_delegate_ids: [601] };

    await service.bulkRevoke(dto);

    // recordHistory called with the row's context; actorId = caller (120)
    expect(recordHistory).toHaveBeenCalledTimes(1);
    expect(recordHistory).toHaveBeenCalledWith(
      {
        pi_delegate_id: 601,
        project_id: 'PROJ-REV-A-SC6',
        delegate_user_id: 30,
        action: PiDelegateHistoryActionEnum.REVOKE,
      },
      120, // actorId = caller
      expect.anything(),
    );

    // softDeleteDelegateIds called after history (R-PID-012 AC.3: history in same tx)
    expect(softDeleteDelegateIds).toHaveBeenCalledWith(
      [601],
      120,
      expect.anything(),
    );
  });

  it('Shape A: row not found → recordHistory NOT called (skip silently)', async () => {
    const { service, recordHistory, softDeleteDelegateIds } = makeService({
      userId: 121,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: { findOneResult: null },
    });

    const result = await service.bulkRevoke({ pi_delegate_ids: [999] });

    expect(recordHistory).not.toHaveBeenCalled();
    expect(softDeleteDelegateIds).not.toHaveBeenCalled();
    expect(result.revoked_count).toBe(0);
  });

  it('Shape A: two rows → recordHistory called twice, each with the row context', async () => {
    const rows: Record<number, PiDelegate> = {
      700: makePiDelegate({
        pi_delegate_id: 700,
        project_id: 'PROJ-SC6-MULTI',
        delegate_user_id: 50,
        is_active: true,
      }),
      701: makePiDelegate({
        pi_delegate_id: 701,
        project_id: 'PROJ-SC6-MULTI',
        delegate_user_id: 51,
        is_active: true,
      }),
    };

    const {
      service: svc,
      recordHistory: rh,
      mockRepo,
    } = makeService({
      userId: 130,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    (mockRepo.findOne as jest.Mock).mockImplementation(
      (opts: { where: { pi_delegate_id: number } }) =>
        Promise.resolve(rows[opts.where.pi_delegate_id] ?? null),
    );

    const dto: BulkRevokePiDelegatesDto = { pi_delegate_ids: [700, 701] };
    await svc.bulkRevoke(dto);

    expect(rh).toHaveBeenCalledTimes(2);
    expect(rh).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 700,
        delegate_user_id: 50,
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      130,
      expect.anything(),
    );
    expect(rh).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 701,
        delegate_user_id: 51,
        action: PiDelegateHistoryActionEnum.REVOKE,
      }),
      130,
      expect.anything(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-21 Scenario 7 — bulkRevoke Shape B + history per fetched row (R-PID-013)
//
// For each project in project_ids, the service fetches the active rows via
// manager.getRepository(PiDelegate).find(), then calls recordHistory('revoke')
// per row, then softDeleteDelegatePairs.
// ─────────────────────────────────────────────────────────────────────────────
describe('bulkRevoke() — T-21 Scenario 7: Shape B records history per fetched row (R-PID-013)', () => {
  it('Shape B: rows fetched → recordHistory(revoke) per row, then softDeleteDelegatePairs', async () => {
    const rowA = makePiDelegate({
      pi_delegate_id: 801,
      project_id: 'PROJ-REVB-SC7',
      delegate_user_id: 1,
      is_active: true,
    });
    const rowB = makePiDelegate({
      pi_delegate_id: 802,
      project_id: 'PROJ-REVB-SC7',
      delegate_user_id: 2,
      is_active: true,
    });

    const { service, recordHistory, softDeleteDelegatePairs } = makeService({
      userId: 130,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        rowsToRevokeByProject: {
          'PROJ-REVB-SC7': [rowA, rowB],
        },
        softDeleteDelegatePairsResult: 2,
      },
    });

    const dto: BulkRevokePiDelegatesDto = {
      project_ids: ['PROJ-REVB-SC7'],
      delegate_user_ids: [1, 2],
    };

    const result = await service.bulkRevoke(dto);

    // recordHistory called for each fetched row; actorId = caller (130)
    expect(recordHistory).toHaveBeenCalledTimes(2);
    expect(recordHistory).toHaveBeenCalledWith(
      {
        pi_delegate_id: 801,
        project_id: 'PROJ-REVB-SC7',
        delegate_user_id: 1,
        action: PiDelegateHistoryActionEnum.REVOKE,
      },
      130,
      expect.anything(),
    );
    expect(recordHistory).toHaveBeenCalledWith(
      {
        pi_delegate_id: 802,
        project_id: 'PROJ-REVB-SC7',
        delegate_user_id: 2,
        action: PiDelegateHistoryActionEnum.REVOKE,
      },
      130,
      expect.anything(),
    );

    // softDeleteDelegatePairs called after history (same tx)
    expect(softDeleteDelegatePairs).toHaveBeenCalledWith(
      'PROJ-REVB-SC7',
      [1, 2],
      130,
      expect.anything(),
    );
    expect(result.revoked_count).toBe(2);
  });

  it('Shape B: two projects → recordHistory per row per project (KZ-004)', async () => {
    const rowP1 = makePiDelegate({
      pi_delegate_id: 901,
      project_id: 'PROJ-SC7-P1',
      delegate_user_id: 40,
      is_active: true,
    });
    const rowP2 = makePiDelegate({
      pi_delegate_id: 902,
      project_id: 'PROJ-SC7-P2',
      delegate_user_id: 40,
      is_active: true,
    });

    const { service, recordHistory, softDeleteDelegatePairs } = makeService({
      userId: 131,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        rowsToRevokeByProject: {
          'PROJ-SC7-P1': [rowP1],
          'PROJ-SC7-P2': [rowP2],
        },
        softDeleteDelegatePairsResult: 1,
      },
    });

    const dto: BulkRevokePiDelegatesDto = {
      project_ids: ['PROJ-SC7-P1', 'PROJ-SC7-P2'],
      delegate_user_ids: [40],
    };

    await service.bulkRevoke(dto);

    expect(softDeleteDelegatePairs).toHaveBeenCalledTimes(2);
    expect(recordHistory).toHaveBeenCalledTimes(2);

    // KZ-004: P1 and P2 rows have distinct pi_delegate_ids (901 vs 902)
    // confirming the rows are kept scoped per project
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 901,
        project_id: 'PROJ-SC7-P1',
        delegate_user_id: 40,
      }),
      131,
      expect.anything(),
    );
    expect(recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        pi_delegate_id: 902,
        project_id: 'PROJ-SC7-P2',
        delegate_user_id: 40,
      }),
      131,
      expect.anything(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// T-14 Scenario 8 — bulkRevoke Shape A (by pi_delegate_ids) — unchanged from T-14
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

// ─────────────────────────────────────────────────────────────────────────────
// T-14 Scenario 9 — bulkRevoke Shape B (project_ids × delegate_user_ids) — unchanged from T-14
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

// ─────────────────────────────────────────────────────────────────────────────
// T-14 Scenario 10 — bulkRevoke ambiguity guard — unchanged from T-14
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

// ─────────────────────────────────────────────────────────────────────────────
// T-14 Scenario 11 — bulkRevoke Shape A auth denied on row's project — unchanged from T-14
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

// ─────────────────────────────────────────────────────────────────────────────
// list() and verify() — unchanged from v2, kept for regression
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// listByDelegate() — by-delegate endpoint
// @akili-spec docs/specs/changes/my-pi-delegates — active_delegate_key removal + by-delegate endpoint (2026-09-11)
//
// Auth contract (own-or-admin):
//   - Own delegate (delegateUserId === caller's user_id) → allowed for any role.
//   - SYSTEM_ADMIN querying another delegate_user_id          → allowed.
//   - Non-admin querying another delegate_user_id             → ForbiddenException.
//
// Seam: piDelegatesRepository.find({ where: { delegate_user_id, is_active: true }, order: { project_id: 'ASC' } })
//
// KZ-001: assert on the returned rows and the find() call args (where-clause),
//   plus the thrown exception — not on bare call order.
// ─────────────────────────────────────────────────────────────────────────────
describe('listByDelegate() — own delegate, SYSTEM_ADMIN, and forbidden path', () => {
  it('own delegate → returns the active rows (asserts find where-clause args)', async () => {
    const ownUserId = 200;
    const expectedRows = [
      makePiDelegate({
        pi_delegate_id: 1001,
        project_id: 'PROJ-BD-A',
        delegate_user_id: ownUserId,
        is_active: true,
      }),
      makePiDelegate({
        pi_delegate_id: 1002,
        project_id: 'PROJ-BD-B',
        delegate_user_id: ownUserId,
        is_active: true,
      }),
    ];

    const { service, mockRepo } = makeService({
      userId: ownUserId,
      roles: [], // not SYSTEM_ADMIN — allowed because it is own id
    });
    (mockRepo.find as jest.Mock).mockResolvedValue(expectedRows);

    const result = await service.listByDelegate(ownUserId);

    // Returned rows match what the repo yielded
    expect(result).toBe(expectedRows);

    // find() called with the correct where-clause (KZ-001)
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { delegate_user_id: ownUserId, is_active: true },
      order: { project_id: 'ASC' },
    });
  });

  it('SYSTEM_ADMIN querying another delegate → allowed, returns rows', async () => {
    const adminUserId = 201;
    const targetDelegateId = 999; // different from caller
    const expectedRows = [
      makePiDelegate({
        pi_delegate_id: 1003,
        project_id: 'PROJ-BD-C',
        delegate_user_id: targetDelegateId,
        is_active: true,
      }),
    ];

    const { service, mockRepo } = makeService({
      userId: adminUserId,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });
    (mockRepo.find as jest.Mock).mockResolvedValue(expectedRows);

    const result = await service.listByDelegate(targetDelegateId);

    expect(result).toBe(expectedRows);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { delegate_user_id: targetDelegateId, is_active: true },
      order: { project_id: 'ASC' },
    });
  });

  it('non-admin querying ANOTHER delegate_user_id → ForbiddenException (K-012 red input)', async () => {
    const callerUserId = 202;
    const otherDelegateId = 888; // not the caller's own id

    const { service, mockRepo } = makeService({
      userId: callerUserId,
      roles: [SecRolesEnum.CONTRIBUTOR], // non-admin
    });

    await expect(service.listByDelegate(otherDelegateId)).rejects.toThrow(
      ForbiddenException,
    );

    // find() must NOT be called — the 403 is thrown before any DB access (KZ-001)
    expect(mockRepo.find).not.toHaveBeenCalled();
  });
});
