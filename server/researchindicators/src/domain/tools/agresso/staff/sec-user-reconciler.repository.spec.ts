// @akili-spec changes/agresso-staff-sec-users-sync (T-01 — read side)
import { EntityManager } from 'typeorm';
import {
  CHUNK,
  SecUserReconcilerRepository,
} from './sec-user-reconciler.repository';

describe('SecUserReconcilerRepository', () => {
  let repository: SecUserReconcilerRepository;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    repository = new SecUserReconcilerRepository({} as EntityManager);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([]);
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
});
