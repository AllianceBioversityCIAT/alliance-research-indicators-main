// @akili-spec docs/specs/changes/my-pi-delegates — T-21
// @akili-spec docs/specs/changes/my-pi-delegates-ui — enriched list() + listByDelegate()
//
// Unit tests for PiDelegatesService (v5 — pi_user_id removed + enriched GET responses).
//
// pi_user_id was removed from pi_delegates and pi_delegate_history (Product decision
// 2026-09-11 — redundant with created_by). This file adapts the v4 (T-21) suite
// to the v5 shape:
//   - insertDelegate(project_id, delegate_user_id, createdBy, manager) — 4 args (pi_user_id gone).
//   - recordHistory(entry, actorId, manager) where entry = { pi_delegate_id, project_id,
//     delegate_user_id, action } — no pi_user_id in entry.
//   - Fixture rows for revoke context no longer carry pi_user_id.
//
// Enriched GET (my-pi-delegates-ui):
//   - list() now returns ProjectDelegatesResponseDto (project + delegates[]) assembled
//     from findProjectSummary + findActiveDelegatesWithUser.
//   - listByDelegate() now returns DelegateProjectsResponseDto (person + projects[])
//     assembled from findUserSummary + findDelegateProjects.
//   - The old raw-row assertions are replaced with enriched-shape assertions.
//   - Auth paths (list → assertCanManageProject; listByDelegate → own-or-admin) are unchanged.
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
//   - verify() regression tests.
//   - KZ-001 (assertions on args, not bare call count), KZ-004 (distinct ids per scenario).
//
// Constructor: new PiDelegatesService(repo, currentUserUtil, dataSource)
//
// Seams (design.md §11.3 / TDD skill):
//   - assign()         → ProjectSyncSummary[]         | ForbiddenException | BadRequestException
//   - bulkRevoke()     → BulkRevokeSummary             | ForbiddenException | BadRequestException
//   - list()           → ProjectDelegatesResponseDto   | ForbiddenException
//   - listByDelegate() → DelegateProjectsResponseDto   | ForbiddenException
//   - verify()         → { exists: boolean }            | ForbiddenException
//
// KZ-001: assertions on returned values / thrown exceptions / recordHistory +
//   insertDelegate + softDelete* call arguments — NOT bare call order.
//
// KZ-004: distinct project ids and delegate user ids per scenario so
//   per-project scoping is proven, not a batch-wide pass.
//
// Scenario → test map (T-21, v5 + enriched):
//   1  — per-project sync (distinct lists per project, P1 and P2)
//   2  — empty delegates = revoke-all (R-PID-011 AC.3)
//   3  — history per movement (assign: insertDelegate id; revoke: fetched row context + actorId)
//   4a — rolled-back (PI-exclusion) → recordHistory NOT called
//   4b — rolled-back (auth-denied)  → insertDelegate + recordHistory NOT called
//   5  — provision-once across assignments (resolveDelegateUserId called ONCE)
//   6  — bulkRevoke Shape A → recordHistory('revoke') per row with row context
//   7  — bulkRevoke Shape B → recordHistory('revoke') per fetched row
//   (8–11 from T-14 — bulkRevoke shapes / ambiguity guard / auth — kept)
//   12 — list() enriched: assembles ProjectDelegatesResponseDto from project + delegate rows
//   13 — listByDelegate() enriched: assembles DelegateProjectsResponseDto from user + project rows

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
  // ── Enriched GET helpers (my-pi-delegates-ui) ────────────────────────────
  /** findProjectSummary result (default: null — project not found) */
  findProjectSummaryResult?: {
    agreement_id: string;
    description: string | null;
    is_pool_funding_contributor: number;
    contract_status: string | null;
    start_date: Date | null;
    end_date: Date | null;
  } | null;
  /** findActiveDelegatesWithUser result (default: []) */
  findActiveDelegatesWithUserResult?: Array<{
    delegate_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    carnet?: string | null;
    status_id?: number | null;
    is_active?: number;
  }>;
  /** findUserSummary result (default: null — user not found) */
  findUserSummaryResult?: {
    sec_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    carnet?: string | null;
    status_id?: number | null;
    is_active?: number;
  } | null;
  /** findDelegateProjects result (default: []) */
  findDelegateProjectsResult?: Array<{
    agreement_id: string;
    description: string | null;
  }>;
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

  // ── Enriched GET helpers (my-pi-delegates-ui) ──────────────────────────────

  const findProjectSummary = jest
    .fn()
    .mockResolvedValue(repoOpts.findProjectSummaryResult ?? null);

  const findActiveDelegatesWithUser = jest
    .fn()
    .mockResolvedValue(repoOpts.findActiveDelegatesWithUserResult ?? []);

  const findUserSummary = jest
    .fn()
    .mockResolvedValue(repoOpts.findUserSummaryResult ?? null);

  const findDelegateProjects = jest
    .fn()
    .mockResolvedValue(repoOpts.findDelegateProjectsResult ?? []);

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
    findProjectSummary,
    findActiveDelegatesWithUser,
    findUserSummary,
    findDelegateProjects,
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
    // Enriched GET mocks (my-pi-delegates-ui)
    findProjectSummary,
    findActiveDelegatesWithUser,
    findUserSummary,
    findDelegateProjects,
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
// T-21 (enriched) Scenario 12 — list() assembles ProjectDelegatesResponseDto
//
// list() now returns one project object with its active delegates, assembled from
// findProjectSummary + findActiveDelegatesWithUser.
//
// KZ-001: assert on the RETURNED object fields (project_code, delegates[].name, etc.)
//   and the repo method call arguments — NOT on bare call count.
// ─────────────────────────────────────────────────────────────────────────────
describe('list() — Scenario 12: enriched ProjectDelegatesResponseDto (my-pi-delegates-ui)', () => {
  it('returns project fields + delegates array with name assembled from first+last', async () => {
    const { service, findProjectSummary, findActiveDelegatesWithUser } =
      makeService({
        userId: 10,
        roles: [SecRolesEnum.SYSTEM_ADMIN],
        repo: {
          findProjectSummaryResult: {
            agreement_id: 'G232',
            description: 'CGIAR Fund - PRMS Year 2025',
            is_pool_funding_contributor: 0,
            contract_status: 'COMPLETED',
            start_date: new Date('2025-01-01T04:00:00.000Z'),
            end_date: new Date('2025-12-31T04:00:00.000Z'),
          },
          findActiveDelegatesWithUserResult: [
            {
              delegate_user_id: 1,
              first_name: 'Juan Carlos',
              last_name: 'Cadavid',
              email: 'j.cadavid@cgiar.org',
              carnet: 'C00042',
              status_id: 1,
              is_active: 1,
            },
          ],
        },
      });

    const result = await service.list('G232');

    // Project-level fields (KZ-001)
    expect(result.project_code).toBe('G232');
    expect(result.project_name).toBe('CGIAR Fund - PRMS Year 2025');
    expect(result.is_pool_funding_contributor).toBe(false); // tinyint 0 → boolean false
    expect(result.status).toBe('COMPLETED');
    expect(result.start_date).toEqual(new Date('2025-01-01T04:00:00.000Z'));
    expect(result.end_date).toEqual(new Date('2025-12-31T04:00:00.000Z'));

    // Delegates array — enriched fields (KZ-001)
    expect(result.delegates).toHaveLength(1);
    expect(result.delegates[0].delegate_user_id).toBe(1);
    expect(result.delegates[0].name).toBe('Juan Carlos Cadavid');
    expect(result.delegates[0].email).toBe('j.cadavid@cgiar.org');
    expect(result.delegates[0].first_name).toBe('Juan Carlos');
    expect(result.delegates[0].last_name).toBe('Cadavid');
    expect(result.delegates[0].carnet).toBe('C00042');
    expect(result.delegates[0].status_id).toBe(1);
    expect(result.delegates[0].is_active).toBe(true);

    // Repo methods called with the correct projectId (KZ-001)
    expect(findProjectSummary).toHaveBeenCalledWith('G232');
    expect(findActiveDelegatesWithUser).toHaveBeenCalledWith('G232');
  });

  it('is_pool_funding_contributor: tinyint 1 → boolean true', async () => {
    const { service } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G233',
          description: 'Pool Funding Project',
          is_pool_funding_contributor: 1,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [],
      },
    });

    const result = await service.list('G233');

    expect(result.is_pool_funding_contributor).toBe(true);
  });

  it('project not found → project_code falls back to the queried projectId, nulls for other fields', async () => {
    const { service } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: null, // project not in agresso_contracts
        findActiveDelegatesWithUserResult: [],
      },
    });

    const result = await service.list('PHANTOM-PROJ');

    expect(result.project_code).toBe('PHANTOM-PROJ');
    expect(result.project_name).toBeNull();
    expect(result.is_pool_funding_contributor).toBe(false); // Boolean(undefined) = false
    expect(result.status).toBeNull();
    expect(result.delegates).toHaveLength(0);
  });

  it('multiple delegates → delegates[] has all entries with correct names', async () => {
    const { service } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G234',
          description: 'Multi-delegate Project',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [
          {
            delegate_user_id: 10,
            first_name: 'Ana',
            last_name: 'García',
            email: 'a.garcia@cgiar.org',
          },
          {
            delegate_user_id: 11,
            first_name: 'Bob',
            last_name: 'Smith',
            email: 'b.smith@cgiar.org',
          },
        ],
      },
    });

    const result = await service.list('G234');

    expect(result.delegates).toHaveLength(2);
    expect(result.delegates[0].name).toBe('Ana García');
    expect(result.delegates[1].name).toBe('Bob Smith');
    // delegate_user_id must be a Number (cast from DB bigint/string)
    expect(typeof result.delegates[0].delegate_user_id).toBe('number');
  });

  it('list() for unauthorized caller → ForbiddenException (auth unchanged)', async () => {
    const { service } = makeService({
      userId: 88,
      roles: [],
      repo: { isPiOrActiveDelegate: false },
    });

    await expect(service.list('PROJ-LIST-AUTH')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verify() — unchanged logic, kept for regression
// ─────────────────────────────────────────────────────────────────────────────
describe('verify() — unchanged from v2', () => {
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
// T-21 (enriched) Scenario 13 — listByDelegate() assembles DelegateProjectsResponseDto
// @akili-spec docs/specs/changes/my-pi-delegates-ui
//
// listByDelegate() now returns one person object with their active projects,
// assembled from findUserSummary + findDelegateProjects.
//
// Auth contract (own-or-admin — unchanged):
//   - Own delegate (delegateUserId === caller's user_id) → allowed for any role.
//   - SYSTEM_ADMIN querying another delegate_user_id     → allowed.
//   - Non-admin querying another delegate_user_id        → ForbiddenException (403)
//     thrown BEFORE any DB method is called.
//
// KZ-001: assert on the RETURNED object fields (name, email, projects[].project_code, etc.)
//   and the repo method call arguments — NOT on bare call order.
// KZ-004: distinct delegate_user_ids across scenarios.
// ─────────────────────────────────────────────────────────────────────────────
describe('listByDelegate() — Scenario 13: enriched DelegateProjectsResponseDto (my-pi-delegates-ui)', () => {
  it('own delegate → returns person fields + projects[] with project_code and project_name', async () => {
    const ownUserId = 200;

    const { service, findUserSummary, findDelegateProjects } = makeService({
      userId: ownUserId,
      roles: [], // not SYSTEM_ADMIN — allowed because it is own id
      repo: {
        findUserSummaryResult: {
          sec_user_id: ownUserId,
          first_name: 'Juan Carlos',
          last_name: 'Cadavid',
          email: 'j.cadavid@cgiar.org',
          carnet: 'C00099',
          status_id: 1,
          is_active: 1,
        },
        findDelegateProjectsResult: [
          { agreement_id: 'G232', description: 'CGIAR Fund - PRMS Year 2025' },
          { agreement_id: 'G233', description: 'Pool Funding Project' },
        ],
      },
    });

    const result = await service.listByDelegate(ownUserId);

    // Person-level fields — enriched (KZ-001)
    expect(result.delegate_user_id).toBe(ownUserId);
    expect(result.name).toBe('Juan Carlos Cadavid');
    expect(result.email).toBe('j.cadavid@cgiar.org');
    expect(result.first_name).toBe('Juan Carlos');
    expect(result.last_name).toBe('Cadavid');
    expect(result.carnet).toBe('C00099');
    expect(result.status_id).toBe(1);
    expect(result.is_active).toBe(true);

    // Projects array
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0].project_code).toBe('G232');
    expect(result.projects[0].project_name).toBe('CGIAR Fund - PRMS Year 2025');
    expect(result.projects[1].project_code).toBe('G233');

    // Repo methods called with the correct userId (KZ-001)
    expect(findUserSummary).toHaveBeenCalledWith(ownUserId);
    expect(findDelegateProjects).toHaveBeenCalledWith(ownUserId);
  });

  it('SYSTEM_ADMIN querying another delegate → allowed, returns enriched response', async () => {
    const adminUserId = 201;
    const targetDelegateId = 999; // different from caller

    const { service } = makeService({
      userId: adminUserId,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findUserSummaryResult: {
          sec_user_id: targetDelegateId,
          first_name: 'Target',
          last_name: 'User',
          email: 'target@cgiar.org',
        },
        findDelegateProjectsResult: [
          { agreement_id: 'G300', description: 'Project 300' },
        ],
      },
    });

    const result = await service.listByDelegate(targetDelegateId);

    expect(result.delegate_user_id).toBe(targetDelegateId);
    expect(result.name).toBe('Target User');
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].project_code).toBe('G300');
  });

  it('user not found → name and email are null, projects array from repo', async () => {
    const delegateId = 202;

    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: null, // user absent in sec_users
        findDelegateProjectsResult: [],
      },
    });

    const result = await service.listByDelegate(delegateId);

    expect(result.delegate_user_id).toBe(delegateId);
    expect(result.name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.projects).toHaveLength(0);
  });

  it('no active project assignments → projects is an empty array', async () => {
    const delegateId = 203;

    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: {
          sec_user_id: delegateId,
          first_name: 'Empty',
          last_name: 'Delegate',
          email: 'empty@cgiar.org',
        },
        findDelegateProjectsResult: [], // no active delegations
      },
    });

    const result = await service.listByDelegate(delegateId);

    expect(result.name).toBe('Empty Delegate');
    expect(result.projects).toHaveLength(0);
  });

  it('non-admin querying ANOTHER delegate_user_id → ForbiddenException BEFORE any DB call', async () => {
    const callerUserId = 204;
    const otherDelegateId = 888; // not the caller's own id

    const { service, findUserSummary, findDelegateProjects } = makeService({
      userId: callerUserId,
      roles: [SecRolesEnum.CONTRIBUTOR], // non-admin
    });

    await expect(service.listByDelegate(otherDelegateId)).rejects.toThrow(
      ForbiddenException,
    );

    // DB methods must NOT be called — the 403 is thrown before any DB access (KZ-001)
    expect(findUserSummary).not.toHaveBeenCalled();
    expect(findDelegateProjects).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios 14–19 — listManagedProjects() and listManagedDelegates()
// @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
//
// Factory (makeServiceWithManagedMethods) extends makeService with the four new
// repo methods needed for the by-user endpoints:
//   - findManagedProjectIds(userId)
//   - findProjectSummariesByIds(projectIds)
//   - findActiveDelegatesForProjects(projectIds)
//   - findDelegatesForProjects(projectIds)
//
// KZ-001: assertions on returned shapes and repo call args, not bare call count.
// KZ-004: distinct user_ids and project ids per scenario.
// ─────────────────────────────────────────────────────────────────────────────

interface ManagedMockOpts {
  userId?: number;
  roles?: number[];
  /** findManagedProjectIds result (default: []) */
  managedProjectIds?: string[];
  /** findProjectSummariesByIds result (default: []) */
  projectSummaries?: Array<{
    agreement_id: string;
    description: string | null;
    is_pool_funding_contributor: number;
    contract_status: string | null;
    start_date: Date | null;
    end_date: Date | null;
  }>;
  /** findActiveDelegatesForProjects result (default: []) */
  activeDelegatesForProjects?: Array<{
    project_id: string;
    delegate_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    carnet?: string | null;
    status_id?: number | null;
    is_active?: number;
  }>;
  /** findDelegatesForProjects result (default: []) */
  delegatesForProjects?: Array<{
    delegate_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    carnet?: string | null;
    status_id?: number | null;
    is_active?: number;
    agreement_id: string;
    description: string | null;
  }>;
}

function makeServiceWithManagedMethods(opts: ManagedMockOpts) {
  const findManagedProjectIds = jest
    .fn()
    .mockResolvedValue(opts.managedProjectIds ?? []);

  const findProjectSummariesByIds = jest
    .fn()
    .mockResolvedValue(opts.projectSummaries ?? []);

  const findActiveDelegatesForProjects = jest
    .fn()
    .mockResolvedValue(opts.activeDelegatesForProjects ?? []);

  const findDelegatesForProjects = jest
    .fn()
    .mockResolvedValue(opts.delegatesForProjects ?? []);

  const mockRepo = {
    // pre-existing methods — not exercised in by-user tests but must exist
    isPiOrActiveDelegateOfProject: jest.fn().mockResolvedValue(true),
    isPiOfProject: jest.fn().mockResolvedValue(false),
    listActiveDelegateUserIds: jest.fn().mockResolvedValue([]),
    resolveDelegateUserId: jest.fn().mockResolvedValue(0),
    insertDelegate: jest.fn().mockResolvedValue(new PiDelegate()),
    softDeleteDelegatePairs: jest.fn().mockResolvedValue(0),
    softDeleteDelegateIds: jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    recordHistory: jest.fn().mockResolvedValue(undefined),
    findProjectSummary: jest.fn().mockResolvedValue(null),
    findActiveDelegatesWithUser: jest.fn().mockResolvedValue([]),
    findUserSummary: jest.fn().mockResolvedValue(null),
    findDelegateProjects: jest.fn().mockResolvedValue([]),
    // new by-user methods
    findManagedProjectIds,
    findProjectSummariesByIds,
    findActiveDelegatesForProjects,
    findDelegatesForProjects,
  } as unknown as import('./repositories/pi-delegates.repository').PiDelegatesRepository;

  const mockCurrentUser = {
    user_id: opts.userId ?? 50,
    roles: opts.roles ?? [],
  } as unknown as CurrentUserUtil;

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: import('typeorm').EntityManager) => Promise<unknown>) =>
          cb({
            getRepository: jest
              .fn()
              .mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
          } as unknown as import('typeorm').EntityManager),
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
    findManagedProjectIds,
    findProjectSummariesByIds,
    findActiveDelegatesForProjects,
    findDelegatesForProjects,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 14 — listManagedProjects(): own caller returns enriched array
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedProjects() — Scenario 14: own caller gets enriched ProjectDelegatesResponseDto[]', () => {
  it('assembles enriched array: project fields + delegates indexed by project_id', async () => {
    const ownUserId = 300;

    const {
      service,
      findManagedProjectIds,
      findProjectSummariesByIds,
      findActiveDelegatesForProjects,
    } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G500', 'G501'],
      projectSummaries: [
        {
          agreement_id: 'G500',
          description: 'Project Alpha',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        {
          agreement_id: 'G501',
          description: 'Project Beta',
          is_pool_funding_contributor: 1,
          contract_status: 'COMPLETED',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        {
          project_id: 'G500',
          delegate_user_id: 10,
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'a.smith@cgiar.org',
          carnet: 'C00010',
          status_id: 1,
          is_active: 1,
        },
        {
          project_id: 'G501',
          delegate_user_id: 20,
          first_name: 'Bob',
          last_name: 'Jones',
          email: 'b.jones@cgiar.org',
          carnet: null,
          status_id: 2,
          is_active: 1,
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);

    expect(result).toHaveLength(2);

    const g500 = result.find((r) => r.project_code === 'G500')!;
    expect(g500.project_name).toBe('Project Alpha');
    expect(g500.is_pool_funding_contributor).toBe(false);
    expect(g500.status).toBe('ACTIVE');
    expect(g500.delegates).toHaveLength(1);
    expect(g500.delegates[0].delegate_user_id).toBe(10);
    expect(g500.delegates[0].name).toBe('Alice Smith');
    expect(g500.delegates[0].email).toBe('a.smith@cgiar.org');
    expect(g500.delegates[0].first_name).toBe('Alice');
    expect(g500.delegates[0].last_name).toBe('Smith');
    expect(g500.delegates[0].carnet).toBe('C00010');
    expect(g500.delegates[0].status_id).toBe(1);
    expect(g500.delegates[0].is_active).toBe(true);

    const g501 = result.find((r) => r.project_code === 'G501')!;
    expect(g501.is_pool_funding_contributor).toBe(true); // tinyint 1 → true
    expect(g501.delegates[0].name).toBe('Bob Jones');
    expect(g501.delegates[0].carnet).toBeNull();
    expect(g501.delegates[0].status_id).toBe(2);

    // KZ-001: repo called with the correct userId / projectIds
    expect(findManagedProjectIds).toHaveBeenCalledWith(ownUserId);
    expect(findProjectSummariesByIds).toHaveBeenCalledWith(['G500', 'G501']);
    expect(findActiveDelegatesForProjects).toHaveBeenCalledWith([
      'G500',
      'G501',
    ]);
  });

  it('delegate on two managed projects — appears in both projects delegates[] (no grouping at this level)', async () => {
    const ownUserId = 301;

    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G600', 'G601'],
      projectSummaries: [
        {
          agreement_id: 'G600',
          description: 'P600',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        {
          agreement_id: 'G601',
          description: 'P601',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        // Same delegate (id=55) in both projects
        {
          project_id: 'G600',
          delegate_user_id: 55,
          first_name: 'Shared',
          last_name: 'Delegate',
          email: 'shared@cgiar.org',
        },
        {
          project_id: 'G601',
          delegate_user_id: 55,
          first_name: 'Shared',
          last_name: 'Delegate',
          email: 'shared@cgiar.org',
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);

    // Each project has the delegate in its own delegates[]
    const g600 = result.find((r) => r.project_code === 'G600')!;
    const g601 = result.find((r) => r.project_code === 'G601')!;
    expect(g600.delegates).toHaveLength(1);
    expect(g601.delegates).toHaveLength(1);
    expect(g600.delegates[0].delegate_user_id).toBe(55);
    expect(g601.delegates[0].delegate_user_id).toBe(55);
  });

  it('project with no delegates → delegates[] is empty', async () => {
    const ownUserId = 302;

    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G700'],
      projectSummaries: [
        {
          agreement_id: 'G700',
          description: 'Solo Project',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [], // no active delegates
    });

    const result = await service.listManagedProjects(ownUserId);

    expect(result).toHaveLength(1);
    expect(result[0].delegates).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 15 — listManagedProjects(): empty managed set → []
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedProjects() — Scenario 15: empty managed project set → [] (no enrichment called)', () => {
  it('returns empty array and does NOT call findProjectSummariesByIds or findActiveDelegatesForProjects', async () => {
    const ownUserId = 310;

    const {
      service,
      findProjectSummariesByIds,
      findActiveDelegatesForProjects,
    } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: [],
    });

    const result = await service.listManagedProjects(ownUserId);

    expect(result).toEqual([]);
    // Enrichment queries must NOT be issued when the managed set is empty
    expect(findProjectSummariesByIds).not.toHaveBeenCalled();
    expect(findActiveDelegatesForProjects).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 16 — listManagedProjects(): auth (own-or-admin)
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedProjects() — Scenario 16: own-or-admin auth', () => {
  it('non-admin querying ANOTHER user_id → ForbiddenException BEFORE findManagedProjectIds', async () => {
    const callerUserId = 320;
    const otherUserId = 999;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: callerUserId,
      roles: [SecRolesEnum.CONTRIBUTOR],
    });

    await expect(service.listManagedProjects(otherUserId)).rejects.toThrow(
      ForbiddenException,
    );

    // The 403 fires before any DB call — KZ-001 discriminates: removing the guard would allow this
    expect(findManagedProjectIds).not.toHaveBeenCalled();
  });

  it('SYSTEM_ADMIN querying another user_id → allowed, findManagedProjectIds called', async () => {
    const adminId = 321;
    const targetId = 777;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: adminId,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      managedProjectIds: [],
    });

    await expect(service.listManagedProjects(targetId)).resolves.toEqual([]);
    expect(findManagedProjectIds).toHaveBeenCalledWith(targetId);
  });

  it('own caller (non-admin) → allowed, findManagedProjectIds called with own id', async () => {
    const ownId = 322;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: ownId,
      roles: [],
      managedProjectIds: [],
    });

    await expect(service.listManagedProjects(ownId)).resolves.toEqual([]);
    expect(findManagedProjectIds).toHaveBeenCalledWith(ownId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 17 — listManagedDelegates(): own caller gets correct grouped response
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedDelegates() — Scenario 17: own caller gets DelegateProjectsResponseDto[]', () => {
  it('groups rows by delegate_user_id; delegate on 2 managed projects appears ONCE with both projects', async () => {
    const ownUserId = 400;

    const { service, findManagedProjectIds, findDelegatesForProjects } =
      makeServiceWithManagedMethods({
        userId: ownUserId,
        roles: [],
        managedProjectIds: ['G800', 'G801'],
        delegatesForProjects: [
          // delegate 30 is on both G800 and G801
          {
            delegate_user_id: 30,
            first_name: 'Carlos',
            last_name: 'Ramirez',
            email: 'c.ramirez@cgiar.org',
            carnet: 'C00030',
            status_id: 1,
            is_active: 1,
            agreement_id: 'G800',
            description: 'Project Eight Hundred',
          },
          {
            delegate_user_id: 30,
            first_name: 'Carlos',
            last_name: 'Ramirez',
            email: 'c.ramirez@cgiar.org',
            carnet: 'C00030',
            status_id: 1,
            is_active: 1,
            agreement_id: 'G801',
            description: 'Project Eight Zero One',
          },
          // delegate 31 is only on G800
          {
            delegate_user_id: 31,
            first_name: 'Diana',
            last_name: 'Torres',
            email: 'd.torres@cgiar.org',
            carnet: null,
            status_id: 2,
            is_active: 1,
            agreement_id: 'G800',
            description: 'Project Eight Hundred',
          },
        ],
      });

    const result = await service.listManagedDelegates(ownUserId);

    // Two distinct delegates in the result
    expect(result).toHaveLength(2);

    const carlos = result.find((r) => r.delegate_user_id === 30)!;
    expect(carlos.name).toBe('Carlos Ramirez');
    expect(carlos.email).toBe('c.ramirez@cgiar.org');
    expect(carlos.first_name).toBe('Carlos');
    expect(carlos.last_name).toBe('Ramirez');
    expect(carlos.carnet).toBe('C00030');
    expect(carlos.status_id).toBe(1);
    expect(carlos.is_active).toBe(true);
    // Carlos appears once, with both managed projects
    expect(carlos.projects).toHaveLength(2);
    const carlosProjectCodes = carlos.projects.map((p) => p.project_code);
    expect(carlosProjectCodes).toContain('G800');
    expect(carlosProjectCodes).toContain('G801');

    const diana = result.find((r) => r.delegate_user_id === 31)!;
    expect(diana.projects).toHaveLength(1);
    expect(diana.projects[0].project_code).toBe('G800');
    expect(diana.carnet).toBeNull();
    expect(diana.status_id).toBe(2);

    // KZ-001: repo called with correct args
    expect(findManagedProjectIds).toHaveBeenCalledWith(ownUserId);
    expect(findDelegatesForProjects).toHaveBeenCalledWith(['G800', 'G801']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 18 — listManagedDelegates(): empty managed set → []
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedDelegates() — Scenario 18: empty managed project set → [] (no enrichment called)', () => {
  it('returns empty array and does NOT call findDelegatesForProjects', async () => {
    const ownUserId = 410;

    const { service, findDelegatesForProjects } = makeServiceWithManagedMethods(
      {
        userId: ownUserId,
        roles: [],
        managedProjectIds: [],
      },
    );

    const result = await service.listManagedDelegates(ownUserId);

    expect(result).toEqual([]);
    expect(findDelegatesForProjects).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 19 — listManagedDelegates(): auth (own-or-admin)
// ─────────────────────────────────────────────────────────────────────────────
describe('listManagedDelegates() — Scenario 19: own-or-admin auth', () => {
  it('non-admin querying ANOTHER user_id → ForbiddenException BEFORE findManagedProjectIds', async () => {
    const callerUserId = 420;
    const otherUserId = 888;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: callerUserId,
      roles: [SecRolesEnum.CONTRIBUTOR],
    });

    await expect(service.listManagedDelegates(otherUserId)).rejects.toThrow(
      ForbiddenException,
    );

    // The guard fires before any DB call — removing it would let this pass (KZ-001/KZ-014)
    expect(findManagedProjectIds).not.toHaveBeenCalled();
  });

  it('SYSTEM_ADMIN querying another user_id → allowed', async () => {
    const adminId = 421;
    const targetId = 666;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: adminId,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      managedProjectIds: [],
    });

    await expect(service.listManagedDelegates(targetId)).resolves.toEqual([]);
    expect(findManagedProjectIds).toHaveBeenCalledWith(targetId);
  });

  it('own caller (non-admin) → allowed', async () => {
    const ownId = 422;

    const { service, findManagedProjectIds } = makeServiceWithManagedMethods({
      userId: ownId,
      roles: [],
      managedProjectIds: [],
    });

    await expect(service.listManagedDelegates(ownId)).resolves.toEqual([]);
    expect(findManagedProjectIds).toHaveBeenCalledWith(ownId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 20 — is_active is DERIVED from status_id (not the raw column)
//
// New rule: is_active ⟺ status_id ∈ {1 (Accepted), 4 (External Accepted)}.
// Pending (2) and Rejected (3) → false.
//
// Part-B rule is STILL enforced: the GET endpoints return the delegate row
// regardless of status — a Rejected delegate appears with is_active: false,
// NOT suppressed from the list.
//
// Load-bearing discriminator (★): status_id=3 with raw is_active=1.
//   A regression back to Boolean(d.is_active) would return true.
//   The correct derivation returns false.
//
// All four producers are exercised:
//   list(), listByDelegate(), listManagedProjects(), listManagedDelegates().
//
// Status coverage per producer:
//   status_id=1 (Accepted)          → is_active: true
//   status_id=4 (External Accepted) → is_active: true
//   status_id=2 (Pending)           → is_active: false
//   status_id=3 (Rejected) + raw 1  → is_active: false  ★ discriminator
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 20 — is_active derived from status_id (not raw column)', () => {
  // ── list() ────────────────────────────────────────────────────────────────

  it('list(): status_id=1 → is_active: true', async () => {
    const { service } = makeService({
      userId: 500,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G900',
          description: 'Sc20 list accepted',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [
          {
            delegate_user_id: 77,
            first_name: 'Accepted',
            last_name: 'User',
            email: 'accepted@cgiar.org',
            carnet: null,
            status_id: 1, // Accepted
            is_active: 1, // raw column — irrelevant after fix
          },
        ],
      },
    });

    const result = await service.list('G900');
    expect(result.delegates[0].is_active).toBe(true);
    expect(result.delegates[0].status_id).toBe(1);
  });

  it('list(): status_id=4 (External Accepted) → is_active: true', async () => {
    const { service } = makeService({
      userId: 500,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G900B',
          description: 'Sc20 list ext-accepted',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [
          {
            delegate_user_id: 77,
            first_name: 'External',
            last_name: 'Accepted',
            email: 'ext@cgiar.org',
            carnet: null,
            status_id: 4, // External Accepted
            is_active: 1,
          },
        ],
      },
    });

    const result = await service.list('G900B');
    expect(result.delegates[0].is_active).toBe(true);
    expect(result.delegates[0].status_id).toBe(4);
  });

  it('list(): status_id=2 (Pending) → is_active: false', async () => {
    const { service } = makeService({
      userId: 500,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G900C',
          description: 'Sc20 list pending',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [
          {
            delegate_user_id: 77,
            first_name: 'Pending',
            last_name: 'User',
            email: 'pending@cgiar.org',
            carnet: null,
            status_id: 2, // Pending
            is_active: 1,
          },
        ],
      },
    });

    const result = await service.list('G900C');
    expect(result.delegates[0].is_active).toBe(false);
    expect(result.delegates[0].status_id).toBe(2);
  });

  it('list(): ★ status_id=3 (Rejected) with raw is_active=1 → is_active: false (discriminator)', async () => {
    // ★ If the mapping regressed to Boolean(d.is_active), raw is_active=1 → true.
    // The correct derivation reads status_id=3 (Rejected) → false.
    const { service } = makeService({
      userId: 500,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      repo: {
        findProjectSummaryResult: {
          agreement_id: 'G900',
          description: 'Part B Test Project',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
        findActiveDelegatesWithUserResult: [
          {
            delegate_user_id: 77,
            first_name: 'Rejected',
            last_name: 'User',
            email: 'rejected@cgiar.org',
            carnet: null,
            status_id: 3, // Rejected
            is_active: 1, // ★ raw=1 — regression would yield true
          },
        ],
      },
    });

    const result = await service.list('G900');

    expect(result.delegates).toHaveLength(1);
    const d = result.delegates[0];
    expect(d.delegate_user_id).toBe(77);
    expect(d.status_id).toBe(3);
    // ★ must be false (derived from status_id=3), NOT true (raw is_active=1)
    expect(d.is_active).toBe(false);
    expect(d.carnet).toBeNull();
  });

  // ── listByDelegate() ──────────────────────────────────────────────────────

  it('listByDelegate(): status_id=1 → is_active: true', async () => {
    const delegateId = 78;
    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: {
          sec_user_id: delegateId,
          first_name: 'Accepted',
          last_name: 'Person',
          email: 'a@cgiar.org',
          carnet: null,
          status_id: 1,
          is_active: 1,
        },
        findDelegateProjectsResult: [],
      },
    });

    const result = await service.listByDelegate(delegateId);
    expect(result.is_active).toBe(true);
    expect(result.status_id).toBe(1);
  });

  it('listByDelegate(): status_id=4 (External Accepted) → is_active: true', async () => {
    const delegateId = 78;
    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: {
          sec_user_id: delegateId,
          first_name: 'Ext',
          last_name: 'Accepted',
          email: 'ext@cgiar.org',
          carnet: null,
          status_id: 4,
          is_active: 1,
        },
        findDelegateProjectsResult: [],
      },
    });

    const result = await service.listByDelegate(delegateId);
    expect(result.is_active).toBe(true);
    expect(result.status_id).toBe(4);
  });

  it('listByDelegate(): status_id=2 (Pending) → is_active: false', async () => {
    const delegateId = 78;
    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: {
          sec_user_id: delegateId,
          first_name: 'Pending',
          last_name: 'Person',
          email: 'pending@cgiar.org',
          carnet: null,
          status_id: 2,
          is_active: 1,
        },
        findDelegateProjectsResult: [],
      },
    });

    const result = await service.listByDelegate(delegateId);
    expect(result.is_active).toBe(false);
    expect(result.status_id).toBe(2);
  });

  it('listByDelegate(): ★ status_id=3 (Rejected) with raw is_active=1 → is_active: false (discriminator)', async () => {
    const delegateId = 78;

    const { service } = makeService({
      userId: delegateId,
      roles: [],
      repo: {
        findUserSummaryResult: {
          sec_user_id: delegateId,
          first_name: 'Rejected',
          last_name: 'Person',
          email: 'rejected2@cgiar.org',
          carnet: null,
          status_id: 3, // Rejected
          is_active: 1, // ★ raw=1 — regression would yield true
        },
        findDelegateProjectsResult: [],
      },
    });

    const result = await service.listByDelegate(delegateId);

    expect(result.delegate_user_id).toBe(delegateId);
    expect(result.status_id).toBe(3);
    // ★ must be false (derived), NOT true (raw=1)
    expect(result.is_active).toBe(false);
    expect(result.carnet).toBeNull();
  });

  // ── listManagedProjects() ─────────────────────────────────────────────────

  it('listManagedProjects(): status_id=1 → is_active: true', async () => {
    const ownUserId = 501;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G901'],
      projectSummaries: [
        {
          agreement_id: 'G901',
          description: 'Sc20 mproj accepted',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        {
          project_id: 'G901',
          delegate_user_id: 79,
          first_name: 'Accepted',
          last_name: 'Delegate',
          email: 'acc@cgiar.org',
          carnet: null,
          status_id: 1,
          is_active: 1,
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);
    expect(result[0].delegates[0].is_active).toBe(true);
    expect(result[0].delegates[0].status_id).toBe(1);
  });

  it('listManagedProjects(): status_id=4 (External Accepted) → is_active: true', async () => {
    const ownUserId = 501;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G901B'],
      projectSummaries: [
        {
          agreement_id: 'G901B',
          description: 'Sc20 mproj ext-accepted',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        {
          project_id: 'G901B',
          delegate_user_id: 79,
          first_name: 'Ext',
          last_name: 'Accepted',
          email: 'ext@cgiar.org',
          carnet: null,
          status_id: 4,
          is_active: 1,
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);
    expect(result[0].delegates[0].is_active).toBe(true);
    expect(result[0].delegates[0].status_id).toBe(4);
  });

  it('listManagedProjects(): status_id=2 (Pending) → is_active: false', async () => {
    const ownUserId = 501;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G901C'],
      projectSummaries: [
        {
          agreement_id: 'G901C',
          description: 'Sc20 mproj pending',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        {
          project_id: 'G901C',
          delegate_user_id: 79,
          first_name: 'Pending',
          last_name: 'Delegate',
          email: 'pending@cgiar.org',
          carnet: null,
          status_id: 2,
          is_active: 1,
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);
    expect(result[0].delegates[0].is_active).toBe(false);
    expect(result[0].delegates[0].status_id).toBe(2);
  });

  it('listManagedProjects(): ★ status_id=3 (Rejected) with raw is_active=1 → is_active: false (discriminator)', async () => {
    const ownUserId = 501;

    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G901'],
      projectSummaries: [
        {
          agreement_id: 'G901',
          description: 'Part B Managed',
          is_pool_funding_contributor: 0,
          contract_status: 'ACTIVE',
          start_date: null,
          end_date: null,
        },
      ],
      activeDelegatesForProjects: [
        {
          project_id: 'G901',
          delegate_user_id: 79,
          first_name: 'Inactive',
          last_name: 'Delegate',
          email: 'inactive@cgiar.org',
          carnet: 'C99999',
          status_id: 3, // Rejected
          is_active: 1, // ★ raw=1 — regression would yield true
        },
      ],
    });

    const result = await service.listManagedProjects(ownUserId);

    expect(result).toHaveLength(1);
    const d = result[0].delegates[0];
    expect(d.delegate_user_id).toBe(79);
    expect(d.status_id).toBe(3);
    // ★ must be false (derived), NOT true (raw=1)
    expect(d.is_active).toBe(false);
    expect(d.carnet).toBe('C99999');
  });

  // ── listManagedDelegates() ────────────────────────────────────────────────

  it('listManagedDelegates(): status_id=1 → is_active: true', async () => {
    const ownUserId = 502;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G902'],
      delegatesForProjects: [
        {
          delegate_user_id: 80,
          first_name: 'Accepted',
          last_name: 'Grouped',
          email: 'acc@cgiar.org',
          carnet: null,
          status_id: 1,
          is_active: 1,
          agreement_id: 'G902',
          description: 'Accepted Grouped',
        },
      ],
    });

    const result = await service.listManagedDelegates(ownUserId);
    expect(result[0].is_active).toBe(true);
    expect(result[0].status_id).toBe(1);
  });

  it('listManagedDelegates(): status_id=4 (External Accepted) → is_active: true', async () => {
    const ownUserId = 502;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G902B'],
      delegatesForProjects: [
        {
          delegate_user_id: 80,
          first_name: 'Ext',
          last_name: 'Accepted',
          email: 'ext@cgiar.org',
          carnet: null,
          status_id: 4,
          is_active: 1,
          agreement_id: 'G902B',
          description: 'Ext Accepted Grouped',
        },
      ],
    });

    const result = await service.listManagedDelegates(ownUserId);
    expect(result[0].is_active).toBe(true);
    expect(result[0].status_id).toBe(4);
  });

  it('listManagedDelegates(): status_id=2 (Pending) → is_active: false', async () => {
    const ownUserId = 502;
    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G902C'],
      delegatesForProjects: [
        {
          delegate_user_id: 80,
          first_name: 'Pending',
          last_name: 'Grouped',
          email: 'pending@cgiar.org',
          carnet: null,
          status_id: 2,
          is_active: 1,
          agreement_id: 'G902C',
          description: 'Pending Grouped',
        },
      ],
    });

    const result = await service.listManagedDelegates(ownUserId);
    expect(result[0].is_active).toBe(false);
    expect(result[0].status_id).toBe(2);
  });

  it('listManagedDelegates(): ★ status_id=3 (Rejected) with raw is_active=1 → is_active: false (discriminator)', async () => {
    const ownUserId = 502;

    const { service } = makeServiceWithManagedMethods({
      userId: ownUserId,
      roles: [],
      managedProjectIds: ['G902'],
      delegatesForProjects: [
        {
          delegate_user_id: 80,
          first_name: 'Rejected',
          last_name: 'Grouped',
          email: 'grouped@cgiar.org',
          carnet: null,
          status_id: 3, // Rejected
          is_active: 1, // ★ raw=1 — regression would yield true
          agreement_id: 'G902',
          description: 'Grouped Part B',
        },
      ],
    });

    const result = await service.listManagedDelegates(ownUserId);

    expect(result).toHaveLength(1);
    expect(result[0].delegate_user_id).toBe(80);
    expect(result[0].status_id).toBe(3);
    // ★ must be false (derived from status_id=3), NOT true (raw is_active=1)
    expect(result[0].is_active).toBe(false);
    expect(result[0].carnet).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 21 — getHistory(): project_id branch
//
// project_id present, delegate_user_id absent:
//   - assertCanManageProject called with project_id (403 if not PI/delegate/admin)
//   - findProjectHistory called with project_id
//   - rows mapped → PiDelegateHistoryEntryDto[]
//
// Discriminating assertions:
//   - actor name assembled from actor_first + actor_last (null when both absent)
//   - delegate name assembled from target_first + target_last (null when both absent)
//   - action mapped as-is (ASSIGN and REVOKE both tested)
//   - pi_delegate_history_id and delegate.user_id cast to Number
//   - actor.user_id null when actor_user_id is null (LEFT JOIN — actor deleted)
// @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
// ─────────────────────────────────────────────────────────────────────────────

/** Extended mock factory for getHistory — adds findProjectHistory + findDelegateHistory */
function makeServiceForHistory(opts: {
  userId?: number;
  roles?: number[];
  isAuthorized?: boolean;
  projectHistoryRows?: Array<{
    pi_delegate_history_id: number;
    action: string;
    created_at: Date;
    actor_user_id: number | null;
    actor_first: string | null;
    actor_last: string | null;
    delegate_user_id: number;
    target_first: string | null;
    target_last: string | null;
    project_id: string;
    project_name: string | null;
  }>;
  delegateHistoryRows?: Array<{
    pi_delegate_history_id: number;
    action: string;
    created_at: Date;
    actor_user_id: number | null;
    actor_first: string | null;
    actor_last: string | null;
    delegate_user_id: number;
    target_first: string | null;
    target_last: string | null;
    project_id: string;
    project_name: string | null;
  }>;
  managedProjectIds?: string[];
}) {
  const findProjectHistory = jest
    .fn()
    .mockResolvedValue(opts.projectHistoryRows ?? []);

  const findDelegateHistory = jest
    .fn()
    .mockResolvedValue(opts.delegateHistoryRows ?? []);

  const findManagedProjectIds = jest
    .fn()
    .mockResolvedValue(opts.managedProjectIds ?? []);

  const isPiOrActiveDelegateOfProject = jest
    .fn()
    .mockResolvedValue(opts.isAuthorized ?? true);

  const mockRepo = {
    isPiOrActiveDelegateOfProject,
    isPiOfProject: jest.fn().mockResolvedValue(false),
    listActiveDelegateUserIds: jest.fn().mockResolvedValue([]),
    resolveDelegateUserId: jest.fn().mockResolvedValue(0),
    insertDelegate: jest.fn().mockResolvedValue(new PiDelegate()),
    softDeleteDelegatePairs: jest.fn().mockResolvedValue(0),
    softDeleteDelegateIds: jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    recordHistory: jest.fn().mockResolvedValue(undefined),
    findProjectSummary: jest.fn().mockResolvedValue(null),
    findActiveDelegatesWithUser: jest.fn().mockResolvedValue([]),
    findUserSummary: jest.fn().mockResolvedValue(null),
    findDelegateProjects: jest.fn().mockResolvedValue([]),
    findManagedProjectIds,
    findProjectSummariesByIds: jest.fn().mockResolvedValue([]),
    findActiveDelegatesForProjects: jest.fn().mockResolvedValue([]),
    findDelegatesForProjects: jest.fn().mockResolvedValue([]),
    findProjectHistory,
    findDelegateHistory,
  } as unknown as import('./repositories/pi-delegates.repository').PiDelegatesRepository;

  const mockCurrentUser = {
    user_id: opts.userId ?? 50,
    roles: opts.roles ?? [],
  } as unknown as CurrentUserUtil;

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation(
        (cb: (manager: import('typeorm').EntityManager) => Promise<unknown>) =>
          cb({
            getRepository: jest
              .fn()
              .mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
          } as unknown as import('typeorm').EntityManager),
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
    findProjectHistory,
    findDelegateHistory,
    findManagedProjectIds,
    isPiOrActiveDelegateOfProject,
  };
}

describe('getHistory() — Scenario 21: project_id branch', () => {
  it('calls assertCanManageProject then findProjectHistory; maps rows → PiDelegateHistoryEntryDto[]', async () => {
    const ts = new Date('2026-09-14T12:00:00.000Z');

    const { service, findProjectHistory } = makeServiceForHistory({
      userId: 50,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      projectHistoryRows: [
        {
          pi_delegate_history_id: 1,
          action: 'assign',
          created_at: ts,
          actor_user_id: 50,
          actor_first: 'Jane',
          actor_last: 'Smith',
          delegate_user_id: 42,
          target_first: 'Juan',
          target_last: 'Cadavid',
          project_id: 'INIT-268',
          project_name: 'Initiative 268',
        },
        {
          pi_delegate_history_id: 2,
          action: 'revoke',
          created_at: ts,
          actor_user_id: 55,
          actor_first: 'Bob',
          actor_last: 'Doe',
          delegate_user_id: 42,
          target_first: 'Juan',
          target_last: 'Cadavid',
          project_id: 'INIT-268',
          project_name: 'Initiative 268',
        },
      ],
    });

    const result = await service.getHistory({ project_id: 'INIT-268' });

    // KZ-001: repo called with the correct project_id
    expect(findProjectHistory).toHaveBeenCalledWith('INIT-268');
    expect(result).toHaveLength(2);

    // First entry — ASSIGN
    expect(result[0].pi_delegate_history_id).toBe(1);
    expect(result[0].action).toBe('assign');
    expect(result[0].actor.user_id).toBe(50);
    expect(result[0].actor.name).toBe('Jane Smith');
    expect(result[0].delegate.user_id).toBe(42);
    expect(result[0].delegate.name).toBe('Juan Cadavid');
    expect(result[0].project.project_code).toBe('INIT-268');
    expect(result[0].project.project_name).toBe('Initiative 268');
    expect(result[0].created_at).toEqual(ts);

    // Second entry — REVOKE (discriminates both action values map through)
    expect(result[1].action).toBe('revoke');
    expect(result[1].actor.user_id).toBe(55);
    expect(result[1].actor.name).toBe('Bob Doe');
  });

  it('actor deleted (actor_user_id null, actor_first/last null) → actor.user_id null, actor.name null', async () => {
    const { service } = makeServiceForHistory({
      userId: 50,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      projectHistoryRows: [
        {
          pi_delegate_history_id: 3,
          action: 'assign',
          created_at: new Date(),
          actor_user_id: null, // deleted account — LEFT JOIN produced null
          actor_first: null,
          actor_last: null,
          delegate_user_id: 42,
          target_first: 'Alive',
          target_last: 'Person',
          project_id: 'INIT-268',
          project_name: 'Initiative 268',
        },
      ],
    });

    const result = await service.getHistory({ project_id: 'INIT-268' });

    expect(result[0].actor.user_id).toBeNull();
    expect(result[0].actor.name).toBeNull();
    expect(result[0].delegate.name).toBe('Alive Person'); // delegate still visible
  });

  it('delegate deleted (target_first/last null) → delegate.name null', async () => {
    const { service } = makeServiceForHistory({
      userId: 50,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      projectHistoryRows: [
        {
          pi_delegate_history_id: 4,
          action: 'revoke',
          created_at: new Date(),
          actor_user_id: 50,
          actor_first: 'Present',
          actor_last: 'Actor',
          delegate_user_id: 99,
          target_first: null, // deleted delegate account
          target_last: null,
          project_id: 'PROJ-X',
          project_name: null,
        },
      ],
    });

    const result = await service.getHistory({ project_id: 'PROJ-X' });

    expect(result[0].delegate.user_id).toBe(99);
    expect(result[0].delegate.name).toBeNull();
    expect(result[0].project.project_name).toBeNull();
  });

  it('non-manager caller → ForbiddenException from assertCanManageProject (project branch auth)', async () => {
    const { service } = makeServiceForHistory({
      userId: 77,
      roles: [], // not SYSTEM_ADMIN
      isAuthorized: false, // isPiOrActiveDelegateOfProject = false
    });

    await expect(
      service.getHistory({ project_id: 'PROJ-DENIED' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no history rows → returns empty array', async () => {
    const { service, findProjectHistory } = makeServiceForHistory({
      userId: 50,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      projectHistoryRows: [],
    });

    const result = await service.getHistory({ project_id: 'PROJ-EMPTY' });

    expect(findProjectHistory).toHaveBeenCalledWith('PROJ-EMPTY');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 22 — getHistory(): delegate_user_id branch
//
// delegate_user_id present, project_id absent:
//   - findManagedProjectIds called with CALLER's user_id (not the queried delegate)
//   - empty managed set → [] without calling findDelegateHistory (KZ-001: discriminator)
//   - non-empty managed set → findDelegateHistory(delegate_user_id, managedIds)
//   - rows mapped → PiDelegateHistoryEntryDto[]
// @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
// ─────────────────────────────────────────────────────────────────────────────
describe('getHistory() — Scenario 22: delegate_user_id branch', () => {
  it('caller with managed projects → findDelegateHistory called with (delegate_user_id, managedIds)', async () => {
    const callerUserId = 60;
    const ts = new Date('2026-09-14T09:00:00.000Z');

    const { service, findDelegateHistory, findManagedProjectIds } =
      makeServiceForHistory({
        userId: callerUserId,
        roles: [],
        managedProjectIds: ['INIT-268', 'INIT-269'],
        delegateHistoryRows: [
          {
            pi_delegate_history_id: 10,
            action: 'assign',
            created_at: ts,
            actor_user_id: callerUserId,
            actor_first: 'Caller',
            actor_last: 'User',
            delegate_user_id: 42,
            target_first: 'Delegate',
            target_last: 'Target',
            project_id: 'INIT-268',
            project_name: 'Initiative 268',
          },
        ],
      });

    const result = await service.getHistory({ delegate_user_id: 42 });

    // KZ-001: managed ids comes from the CALLER (60), not the queried delegate (42)
    expect(findManagedProjectIds).toHaveBeenCalledWith(callerUserId);
    // KZ-001: repo receives the correct delegate_user_id and the managed id list
    expect(findDelegateHistory).toHaveBeenCalledWith(42, [
      'INIT-268',
      'INIT-269',
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].pi_delegate_history_id).toBe(10);
    expect(result[0].action).toBe('assign');
    expect(result[0].delegate.user_id).toBe(42);
    expect(result[0].delegate.name).toBe('Delegate Target');
    expect(result[0].actor.name).toBe('Caller User');
    expect(result[0].project.project_code).toBe('INIT-268');
  });

  it('empty managed set → returns [] WITHOUT calling findDelegateHistory (discriminator)', async () => {
    const { service, findDelegateHistory, findManagedProjectIds } =
      makeServiceForHistory({
        userId: 61,
        roles: [],
        managedProjectIds: [], // caller manages nothing
      });

    const result = await service.getHistory({ delegate_user_id: 99 });

    expect(findManagedProjectIds).toHaveBeenCalledWith(61);
    // ★ discriminating: a regression that skips the empty-guard would still call findDelegateHistory
    expect(findDelegateHistory).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 23 — getHistory(): exactly-one validation (BadRequest)
// ─────────────────────────────────────────────────────────────────────────────
describe('getHistory() — Scenario 23: exactly-one validation', () => {
  it('both params present → BadRequestException', async () => {
    const { service } = makeServiceForHistory({ userId: 50 });

    await expect(
      service.getHistory({ project_id: 'INIT-268', delegate_user_id: 42 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('neither param present → BadRequestException', async () => {
    const { service } = makeServiceForHistory({ userId: 50 });

    await expect(service.getHistory({})).rejects.toThrow(BadRequestException);
  });
});
