// @akili-spec changes/agresso-staff-sec-users-sync (T-01 — read side)
import { EntityManager } from 'typeorm';
import {
  CHUNK,
  SecUserReconcilerRepository,
} from './sec-user-reconciler.repository';

describe('SecUserReconcilerRepository', () => {
  let repository: SecUserReconcilerRepository;
  let querySpy: jest.SpyInstance;
  let transactionManager: Pick<EntityManager, 'query'>;

  beforeEach(() => {
    repository = new SecUserReconcilerRepository({} as EntityManager);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([]);
    transactionManager = {
      query: jest.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAllSecUsers', () => {
    it('reads ALL sec_users rows — active AND inactive — with no is_active predicate (R-AGS-001 AC.1, design.md J-4)', async () => {
      await repository.findAllSecUsers();

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql] = querySpy.mock.calls[0];
      expect(sql).toMatch(/from\s+sec_users/i);
      // The property under test lives in the emitted SQL string itself (KZ-001): the read is
      // unconditional — no WHERE clause at all, so nothing can constrain it to active rows only.
      // (`is_active` still appears once, as a selected column — that is not a predicate.)
      expect(sql).not.toMatch(/where/i);
      expect((sql.match(/is_active/gi) ?? []).length).toBe(1);
    });

    it('issues one statement with no dynamic parameters', async () => {
      await repository.findAllSecUsers();

      const [, params] = querySpy.mock.calls[0];
      expect(params).toEqual([]);
    });

    it('coerces the raw tinyint is_active (0/1) into a real boolean — mysql2 returns 0/1 with no typeCast configured, and Repository.query never runs entity hydration', async () => {
      querySpy.mockResolvedValueOnce([
        { sec_user_id: 1, is_active: 0 },
        { sec_user_id: 2, is_active: 1 },
      ]);

      const result = await repository.findAllSecUsers();

      // toBe, not toBeFalsy/toBeTruthy: 0 is falsy and would pass a loose assertion — that is
      // the exact defect this test exists to catch (Reviewer FAIL, attempt 1).
      expect(result[0].is_active).toBe(false);
      expect(result[1].is_active).toBe(true);
    });
  });

  describe('findSecUserRolesByUserIds — statement count (NFR-AGS-002)', () => {
    it('issues exactly ⌈n / CHUNK⌉ statements at n ≥ 50', async () => {
      const ids = Array.from({ length: 53 }, (_, i) => i + 1);

      await repository.findSecUserRolesByUserIds(ids);

      expect(querySpy).toHaveBeenCalledTimes(Math.ceil(53 / CHUNK));
    });

    it('issues exactly ⌈n / CHUNK⌉ statements at n ≥ 100, growing by chunk and not by member', async () => {
      const ids = Array.from({ length: 127 }, (_, i) => i + 1);

      await repository.findSecUserRolesByUserIds(ids);

      expect(querySpy).toHaveBeenCalledTimes(Math.ceil(127 / CHUNK));
    });

    it('never issues one statement per member (would degenerate NFR-AGS-002 into O(n))', async () => {
      const ids = Array.from({ length: 53 }, (_, i) => i + 1);

      await repository.findSecUserRolesByUserIds(ids);

      expect(querySpy).not.toHaveBeenCalledTimes(53);
    });

    it("lands every one of one user's role rows in a single chunk (dedupes ids before chunking, T-06 needs this)", async () => {
      const idsWithDuplicates = [1, 1, 1, 2, 2, 3];

      await repository.findSecUserRolesByUserIds(idsWithDuplicates);

      // 3 distinct ids, well under CHUNK — one statement, so user 1's rows cannot be split
      // across two chunks/statements.
      expect(querySpy).toHaveBeenCalledTimes(1);
      const [, params] = querySpy.mock.calls[0];
      expect(params).toEqual([1, 2, 3]);
    });

    it('returns an empty array and issues no statement for an empty id list', async () => {
      const result = await repository.findSecUserRolesByUserIds([]);

      expect(result).toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('coerces the raw tinyint is_active (0/1) into a real boolean for sec_user_roles rows too', async () => {
      querySpy.mockResolvedValueOnce([
        { sec_user_role_id: 1, user_id: 10, role_id: 3, is_active: 0 },
        { sec_user_role_id: 2, user_id: 10, role_id: 3, is_active: 1 },
      ]);

      const result = await repository.findSecUserRolesByUserIds([10]);

      // toBe, not toBeFalsy/toBeTruthy: 0 is falsy and would pass a loose assertion.
      expect(result[0].is_active).toBe(false);
      expect(result[1].is_active).toBe(true);
    });
  });

  describe('findSecUserRolesByUserIds — parameterisation', () => {
    it('uses one "?" placeholder per id in the IN-list, and passes the ids as query params', async () => {
      const ids = [10, 20, 30];

      await repository.findSecUserRolesByUserIds(ids);

      const [sql, params] = querySpy.mock.calls[0];
      const placeholderCount = (sql.match(/\?/g) ?? []).length;
      expect(placeholderCount).toBe(ids.length);
      expect(sql).toMatch(/user_id\s+IN\s*\(\s*\?(\s*,\s*\?)*\s*\)/i);
      expect(params).toEqual(ids);
    });

    it('rejects a non-integer id BEFORE building or issuing any statement', async () => {
      await expect(
        repository.findSecUserRolesByUserIds([1, 2.5, 3]),
      ).rejects.toThrow();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric id BEFORE building or issuing any statement', async () => {
      await expect(
        repository.findSecUserRolesByUserIds([
          1,
          'DROP TABLE sec_user_roles' as unknown as number,
        ]),
      ).rejects.toThrow();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('rejects a non-positive id BEFORE building or issuing any statement', async () => {
      await expect(
        repository.findSecUserRolesByUserIds([1, 0, -3]),
      ).rejects.toThrow();
      expect(querySpy).not.toHaveBeenCalled();
    });
  });

  describe('write side (design.md §5.4)', () => {
    const createRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        firstName: `First ${index}`,
        lastName: `Last ${index}`,
        email: `user-${index}@alliance.org`,
        carnet: `C${index}`,
      }));

    const refreshRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        secUserId: index + 1,
        firstName: `First ${index}`,
        lastName: `Last ${index}`,
        carnet: `C${index}`,
      }));

    it('sets runStart on the transaction connection with NOW(6), never a Node timestamp', async () => {
      await repository.setRunStart(transactionManager as EntityManager);

      expect(transactionManager.query).toHaveBeenCalledWith(
        'SET @run_start = NOW(6)',
      );
    });

    it('creates accounts in CHUNK-sized multi-row INSERTs, with status 1 and active TRUE', async () => {
      await repository.createSecUsers(
        transactionManager as EntityManager,
        createRows(CHUNK + 3),
      );

      expect(transactionManager.query).toHaveBeenCalledTimes(2);
      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/insert into sec_users/i);
      expect(sql).toMatch(/\(\?, \?, \?, \?, 1, TRUE\)/);
      expect(params).toHaveLength(CHUNK * 4);
      expect(sql).not.toMatch(/created_by|updated_by/i);
    });

    it('truncates names to 60 characters before creating the SQL parameter array', async () => {
      const firstName = 'F'.repeat(75);

      await repository.createSecUsers(transactionManager as EntityManager, [
        {
          firstName,
          lastName: 'Last',
          email: 'new@alliance.org',
          carnet: 'A100',
        },
      ]);

      const [, params] = (transactionManager.query as jest.Mock).mock.calls[0];
      expect(params[0]).toBe(firstName.slice(0, 60));
      expect(params[0]).toHaveLength(60);
    });

    it('re-selects post-create ids by carnet, active state and the server-side run marker — never email', async () => {
      await repository.findCreatedSecUsers(
        transactionManager as EntityManager,
        ['A100', 'B200'],
      );

      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/carnet\s+IN\s*\(\?, \?\)/i);
      expect(sql).toMatch(/is_active\s*=\s*1/i);
      expect(sql).toMatch(/created_at\s*>=\s*@run_start/i);
      expect(sql).not.toMatch(/email/i);
      expect(params).toEqual(['A100', 'B200']);
    });

    it('grants the literal role_id 3 in chunked multi-row INSERTs', async () => {
      const ids = Array.from({ length: CHUNK + 3 }, (_, index) => index + 1);

      await repository.grantContributorRoles(
        transactionManager as EntityManager,
        ids,
      );

      expect(transactionManager.query).toHaveBeenCalledTimes(2);
      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/insert into sec_user_roles/i);
      expect(sql).toMatch(/\(\?, 3, TRUE\)/);
      expect(params).toHaveLength(CHUNK);
    });

    it('refreshes names through CASE and truncates values before the SQL parameters are built', async () => {
      const firstName = 'F'.repeat(75);

      await repository.refreshSecUserNames(
        transactionManager as EntityManager,
        [{ secUserId: 10, firstName, lastName: 'Last', carnet: 'A100' }],
      );

      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/first_name\s*=\s*CASE sec_user_id WHEN \? THEN \?/i);
      expect(sql).toMatch(/last_name\s*=\s*CASE sec_user_id WHEN \? THEN \?/i);
      expect(params[1]).toBe(firstName.slice(0, 60));
      expect(params[1]).toHaveLength(60);
    });

    it('guards carnet backfill in SQL, so a non-empty stored carnet cannot be overwritten by a batch-building defect', async () => {
      await repository.backfillSecUserCarnets(
        transactionManager as EntityManager,
        refreshRows(1),
      );

      const [sql] = (transactionManager.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(
        /where\s+sec_user_id\s+in[\s\S]*and\s+\(carnet\s+is\s+null\s+or\s+trim\(carnet\)\s*=\s*''\)/i,
      );
    });

    it('reactivates only sec_users.is_active and chunks the id list', async () => {
      const ids = Array.from({ length: CHUNK + 3 }, (_, index) => index + 1);

      await repository.reactivateSecUsers(
        transactionManager as EntityManager,
        ids,
      );

      expect(transactionManager.query).toHaveBeenCalledTimes(2);
      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/^UPDATE sec_users SET is_active = 1/i);
      expect(sql).not.toMatch(/email|status_id|carnet/i);
      expect(params).toHaveLength(CHUNK);
    });

    it('reactivates selected role rows only when they are inactive CONTRIBUTORS (N-4)', async () => {
      await repository.reactivateContributorRoles(
        transactionManager as EntityManager,
        [700, 701],
      );

      const [sql, params] = (transactionManager.query as jest.Mock).mock
        .calls[0];
      expect(sql).toMatch(/sec_user_role_id\s+IN\s*\(\?, \?\)/i);
      expect(sql).toMatch(/AND\s+role_id\s*=\s*3\s+AND\s+is_active\s*=\s*0/i);
      expect(params).toEqual([700, 701]);
    });

    it.each([
      [
        'create',
        (manager: EntityManager) =>
          repository.createSecUsers(manager, createRows(CHUNK + 3)),
      ],
      [
        'refresh',
        (manager: EntityManager) =>
          repository.refreshSecUserNames(manager, refreshRows(CHUNK + 3)),
      ],
      [
        'backfill',
        (manager: EntityManager) =>
          repository.backfillSecUserCarnets(manager, refreshRows(CHUNK + 3)),
      ],
      [
        'reactivate users',
        (manager: EntityManager) =>
          repository.reactivateSecUsers(
            manager,
            Array.from({ length: CHUNK + 3 }, (_, index) => index + 1),
          ),
      ],
      [
        'reactivate roles',
        (manager: EntityManager) =>
          repository.reactivateContributorRoles(
            manager,
            Array.from({ length: CHUNK + 3 }, (_, index) => index + 1),
          ),
      ],
    ])(
      '%s writes are chunked rather than issued per member',
      async (_, write) => {
        await write(transactionManager as EntityManager);

        expect(transactionManager.query).toHaveBeenCalledTimes(2);
        expect(transactionManager.query).not.toHaveBeenCalledTimes(CHUNK + 3);
      },
    );
  });
});
