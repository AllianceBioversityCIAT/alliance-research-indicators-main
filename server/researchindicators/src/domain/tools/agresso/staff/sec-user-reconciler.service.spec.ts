// @akili-spec changes/agresso-staff-sec-users-sync (T-02 — decision logic: validate → index → collapse → match → classify)
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { DataSource, EntityManager } from 'typeorm';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { SecUserReconcilerRepository } from './sec-user-reconciler.repository';
import { SecUserReconcilerService } from './sec-user-reconciler.service';

function staffMember(
  overrides: Partial<AgressoStaffRawDto>,
): AgressoStaffRawDto {
  return {
    resourceId: 'A1',
    firstName: 'First',
    lastName: 'Last',
    email: 'first.last@alliance.org',
    center: 'Alliance',
    status: 'Active',
    ...overrides,
  };
}

function secUser(overrides: Partial<SecUser>): SecUser {
  return {
    sec_user_id: 1,
    email: 'first.last@alliance.org',
    status_id: 1,
    is_active: true,
    ...overrides,
  } as SecUser;
}

describe('SecUserReconcilerService', () => {
  let repository: jest.Mocked<SecUserReconcilerRepository>;
  let dataSource: DataSource;
  let manager: Pick<EntityManager, 'query'>;
  let service: SecUserReconcilerService;

  beforeEach(() => {
    repository = {
      findAllSecUsers: jest.fn().mockResolvedValue([]),
      findSecUserRolesByUserIds: jest.fn().mockResolvedValue([]),
      setRunStart: jest.fn().mockResolvedValue(undefined),
      createSecUsers: jest.fn().mockResolvedValue(undefined),
      findCreatedSecUsers: jest.fn().mockResolvedValue([]),
      grantContributorRoles: jest.fn().mockResolvedValue(undefined),
      refreshSecUserNames: jest.fn().mockResolvedValue(undefined),
      backfillSecUserCarnets: jest.fn().mockResolvedValue(undefined),
      reactivateSecUsers: jest.fn().mockResolvedValue(undefined),
      reactivateContributorRoles: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SecUserReconcilerRepository>;
    manager = { query: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn(
        async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
          callback(manager as EntityManager),
      ),
    } as unknown as DataSource;
    service = new SecUserReconcilerService(repository, dataSource);
    jest.spyOn(service['logger'], '_warn').mockImplementation(() => undefined);
  });

  describe('matching — exact, never substring (DD-6, R-AGS-001 Scenario "Matching does not cross to a different person")', () => {
    it('never resolves ana@alliance.org for a staff member carrying susana@alliance.org', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 1, email: 'ana@alliance.org', is_active: true }),
      ]);
      const susana = staffMember({
        resourceId: 'S1',
        email: 'susana@alliance.org',
      });

      const result = await service.reconcile([susana]);

      // The defect this test exists to catch: a LIKE '%ana%' match would resolve susana's payload
      // row against ana@alliance.org's account and refresh it. The correct behaviour is "no match
      // at all" — susana's email matches no sec_users row — so she must land in `create`, never in
      // `refresh` against sec_user_id 1.
      expect(result.refresh).toHaveLength(0);
      expect(result.create).toEqual([{ staffMember: susana }]);
    });

    it('matches exactly on lower(trim(email)) — case and surrounding whitespace are ignored, substrings are not', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 7,
          email: '  Susana@Alliance.org ',
          is_active: true,
        }),
      ]);
      const susana = staffMember({
        resourceId: 'S1',
        email: 'susana@alliance.org',
      });

      const result = await service.reconcile([susana]);

      expect(result.refresh).toEqual([
        {
          staffMember: susana,
          secUser: expect.objectContaining({ sec_user_id: 7 }),
          ambiguousCandidateIds: [],
        },
      ]);
    });
  });

  describe('validation runs BEFORE the collapse (N-3, design.md §5.2)', () => {
    it('counts a null-email member in skipped, NOT in payloadEmailCollisions — even when another null-email member would otherwise share its (non-existent) key', async () => {
      const memberA = staffMember({
        resourceId: 'A1',
        email: null as unknown as string,
      });
      const memberB = staffMember({
        resourceId: 'A2',
        email: null as unknown as string,
      });

      const result = await service.reconcile([memberA, memberB]);

      // The defect this test exists to catch: collapsing before validating would give both
      // null-email members the same collapse key (e.g. "" or "null"), reporting the second as a
      // payload email collision instead of both being skipped as unusable.
      expect(result.skipped).toHaveLength(2);
      expect(result.skipped.map((s) => s.reason)).toEqual([
        'UNUSABLE_EMAIL',
        'UNUSABLE_EMAIL',
      ]);
      expect(result.collapsed).toHaveLength(0);
    });

    it('skips a whitespace-only email as unusable', async () => {
      const member = staffMember({ resourceId: 'A1', email: '   ' });

      const result = await service.reconcile([member]);

      expect(result.skipped).toEqual([
        { staffMember: member, reason: 'UNUSABLE_EMAIL' },
      ]);
    });

    it('skips an email over 150 characters as unusable', async () => {
      const longEmail = `${'a'.repeat(145)}@ok.org`; // > 150 chars total
      const member = staffMember({ resourceId: 'A1', email: longEmail });

      const result = await service.reconcile([member]);

      expect(result.skipped).toEqual([
        { staffMember: member, reason: 'UNUSABLE_EMAIL' },
      ]);
    });

    it('skips a carnet over 10 characters as CARNET_TOO_LONG, and never reports it as a payload collision', async () => {
      const memberA = staffMember({
        resourceId: '12345678901',
        email: 'shared@alliance.org',
      });
      const memberB = staffMember({
        resourceId: 'A2',
        email: 'shared@alliance.org',
      });

      const result = await service.reconcile([memberA, memberB]);

      expect(result.skipped).toEqual([
        { staffMember: memberA, reason: 'CARNET_TOO_LONG' },
      ]);
      // memberB is the sole survivor of the collapse — it wins its email key uncontested because
      // memberA was removed before the collapse ran, not because it lost a collision.
      expect(result.collapsed).toHaveLength(0);
      expect(result.create).toEqual([{ staffMember: memberB }]);
    });
  });

  describe('collapse — FIRST ARRIVAL WINS, no comparator (N-2, DD-14, R-AGS-003)', () => {
    it('collapses two members sharing an email to the FIRST in payload order, even when the second has the lexicographically AND numerically lower carnet', async () => {
      // Constructed so "first arrival" and "lowest carnet" disagree under EITHER ordering:
      // lexicographically, '10' < '90' (compares '1' vs '9' on the first character); numerically,
      // 10 < 90 too. Any comparator-based "lowest wins" rule — whichever ordering it picks —
      // would crown the second arrival ('10'), while first-arrival must still crown '90'.
      const first = staffMember({
        resourceId: '90',
        email: 'dup@alliance.org',
      });
      const second = staffMember({
        resourceId: '10',
        email: 'dup@alliance.org',
      });

      const result = await service.reconcile([first, second]);

      expect(result.create).toEqual([{ staffMember: first }]);
      expect(result.collapsed).toEqual([
        { emailKey: 'dup@alliance.org', winnerCarnet: '90', loserCarnet: '10' },
      ]);
    });

    it('the loser carries both carnets into the collapsed log entry', async () => {
      const first = staffMember({
        resourceId: 'W1',
        email: 'dup@alliance.org',
      });
      const second = staffMember({
        resourceId: 'L1',
        email: 'dup@alliance.org',
      });

      const result = await service.reconcile([first, second]);

      expect(result.collapsed).toEqual([
        { emailKey: 'dup@alliance.org', winnerCarnet: 'W1', loserCarnet: 'L1' },
      ]);
    });

    it('collapses by page order then row order — three members sharing an email keep only the very first', async () => {
      const a = staffMember({ resourceId: 'A', email: 'trio@alliance.org' });
      const b = staffMember({ resourceId: 'B', email: 'trio@alliance.org' });
      const c = staffMember({ resourceId: 'C', email: 'trio@alliance.org' });

      const result = await service.reconcile([a, b, c]);

      expect(result.create).toEqual([{ staffMember: a }]);
      expect(result.collapsed).toEqual([
        { emailKey: 'trio@alliance.org', winnerCarnet: 'A', loserCarnet: 'B' },
        { emailKey: 'trio@alliance.org', winnerCarnet: 'A', loserCarnet: 'C' },
      ]);
    });
  });

  describe('classification (design.md §5.3, three effective outcomes)', () => {
    it('classifies as CREATE when the candidate set is empty', async () => {
      repository.findAllSecUsers.mockResolvedValue([]);
      const member = staffMember({ email: 'new@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.create).toEqual([{ staffMember: member }]);
      expect(result.refresh).toHaveLength(0);
      expect(result.reactivate).toHaveLength(0);
    });

    it('classifies as REFRESH when the candidate set contains an active row', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 5,
          email: 'existing@alliance.org',
          is_active: true,
        }),
      ]);
      const member = staffMember({ email: 'existing@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.refresh).toEqual([
        {
          staffMember: member,
          secUser: expect.objectContaining({ sec_user_id: 5 }),
          ambiguousCandidateIds: [],
        },
      ]);
      expect(result.create).toHaveLength(0);
      expect(result.reactivate).toHaveLength(0);
    });

    it('a member matching only inactive rows classifies REACTIVATE, never CREATE (acceptance check)', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 9,
          email: 'dormant@alliance.org',
          is_active: false,
        }),
      ]);
      const member = staffMember({ email: 'dormant@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.reactivate).toEqual([
        {
          staffMember: member,
          secUser: expect.objectContaining({ sec_user_id: 9 }),
          ambiguousCandidateIds: [],
        },
      ]);
      expect(result.create).toHaveLength(0);
      expect(result.refresh).toHaveLength(0);
    });

    it('step 4 dominates step 7 — one active + one inactive row for the same email refreshes the active row and leaves the inactive one alone (R-AGS-001 Scenario "Two accounts share an email")', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 10,
          email: 'j.doe@alliance.org',
          is_active: true,
        }),
        secUser({
          sec_user_id: 20,
          email: 'j.doe@alliance.org',
          is_active: false,
        }),
      ]);
      const member = staffMember({ email: 'j.doe@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.refresh).toEqual([
        {
          staffMember: member,
          secUser: expect.objectContaining({ sec_user_id: 10 }),
          ambiguousCandidateIds: expect.arrayContaining([10, 20]),
        },
      ]);
      expect(result.reactivate).toHaveLength(0);
      expect(result.create).toHaveLength(0);
    });

    it('step 4 dominates step 7 even when the inactive candidate would otherwise win rules 2 and 3 (active row has NULL last_login_at and the higher sec_user_id)', async () => {
      // Constructed so rule 1 (active-before-inactive) is the ONLY rule that can produce the
      // correct answer: the inactive row has a more recent last_login_at (rule 2 would pick it)
      // AND a lower sec_user_id (rule 3 would also pick it). Only "active always outranks
      // inactive" refreshes sec_user_id 50 instead of reactivating sec_user_id 10.
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 50,
          email: 'j.doe@alliance.org',
          is_active: true,
          last_login_at: null,
        }),
        secUser({
          sec_user_id: 10,
          email: 'j.doe@alliance.org',
          is_active: false,
          last_login_at: new Date('2025-06-01'),
        }),
      ]);
      const member = staffMember({ email: 'j.doe@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.refresh).toEqual([
        {
          staffMember: member,
          secUser: expect.objectContaining({ sec_user_id: 50 }),
          ambiguousCandidateIds: expect.arrayContaining([10, 50]),
        },
      ]);
      expect(result.reactivate).toHaveLength(0);
      expect(result.create).toHaveLength(0);
    });
  });

  describe('tie-break — total ordering (design.md §5.2, R-AGS-007 Scenario "Two dormant accounts share the returning employee\'s email")', () => {
    it('prefers the most recent last_login_at, NULL sorting last, among several inactive candidates', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 10,
          email: 'j.doe@alliance.org',
          is_active: false,
          last_login_at: null,
        }),
        secUser({
          sec_user_id: 20,
          email: 'j.doe@alliance.org',
          is_active: false,
          last_login_at: new Date('2025-06-01'),
        }),
      ]);
      const member = staffMember({ email: 'j.doe@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.reactivate).toEqual([
        {
          staffMember: member,
          secUser: expect.objectContaining({ sec_user_id: 20 }),
          ambiguousCandidateIds: expect.arrayContaining([10, 20]),
        },
      ]);
    });

    it('falls back to the lowest sec_user_id as a pure determinism tiebreaker when active status and last_login_at both tie', async () => {
      const sameLogin = new Date('2025-06-01');
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 30,
          email: 'tie@alliance.org',
          is_active: false,
          last_login_at: sameLogin,
        }),
        secUser({
          sec_user_id: 15,
          email: 'tie@alliance.org',
          is_active: false,
          last_login_at: sameLogin,
        }),
      ]);
      const member = staffMember({ email: 'tie@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.reactivate[0].secUser.sec_user_id).toBe(15);
    });

    it('two runs over identical input classify identically (total ordering, acceptance check)', async () => {
      const candidates = [
        secUser({
          sec_user_id: 40,
          email: 'stable@alliance.org',
          is_active: false,
          last_login_at: null,
        }),
        secUser({
          sec_user_id: 25,
          email: 'stable@alliance.org',
          is_active: false,
          last_login_at: null,
        }),
        secUser({
          sec_user_id: 33,
          email: 'stable@alliance.org',
          is_active: false,
          last_login_at: new Date('2024-01-01'),
        }),
      ];
      const member = staffMember({ email: 'stable@alliance.org' });

      repository.findAllSecUsers.mockResolvedValue(candidates);
      const runOne = await service.reconcile([member]);
      repository.findAllSecUsers.mockResolvedValue(candidates);
      const runTwo = await service.reconcile([member]);

      expect(runOne.reactivate[0].secUser.sec_user_id).toBe(
        runTwo.reactivate[0].secUser.sec_user_id,
      );
      expect(runOne.reactivate[0].secUser.sec_user_id).toBe(33);
    });
  });

  describe('ambiguous match reporting (design.md §5.2 "every ambiguous match is reported")', () => {
    it('reports all candidate ids, including the chosen one, when more than one row matches', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 10,
          email: 'j.doe@alliance.org',
          is_active: false,
          last_login_at: null,
        }),
        secUser({
          sec_user_id: 20,
          email: 'j.doe@alliance.org',
          is_active: false,
          last_login_at: new Date('2025-06-01'),
        }),
      ]);
      const member = staffMember({ email: 'j.doe@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.reactivate[0].ambiguousCandidateIds.sort()).toEqual([
        10, 20,
      ]);
    });

    it('reports no ambiguity when exactly one candidate matches', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({
          sec_user_id: 10,
          email: 'solo@alliance.org',
          is_active: true,
        }),
      ]);
      const member = staffMember({ email: 'solo@alliance.org' });

      const result = await service.reconcile([member]);

      expect(result.refresh[0].ambiguousCandidateIds).toEqual([]);
    });
  });

  describe('create + grant transaction (R-AGS-003, R-AGS-004, DD-5, DD-15)', () => {
    it('refreshes active matches at the seam and reports refresh counters', async () => {
      const member = staffMember({
        resourceId: '99999',
        firstName: 'F'.repeat(61),
        lastName: 'Last',
      });
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 23, carnet: '12345', is_active: true }),
      ]);
      const reconciliation = await service.reconcile([member]);

      repository.findCreatedSecUsers.mockResolvedValue([]);
      const outcome = await service.applyCreateAndGrant(reconciliation);

      expect(repository.refreshSecUserNames).toHaveBeenCalledWith(manager, [
        {
          secUserId: 23,
          firstName: member.firstName,
          lastName: member.lastName,
          carnet: '99999',
        },
      ]);
      expect(repository.backfillSecUserCarnets).toHaveBeenCalledWith(manager, [
        {
          secUserId: 23,
          firstName: member.firstName,
          lastName: member.lastName,
          carnet: '99999',
        },
      ]);
      expect(outcome).toEqual({
        created: 0,
        rolesGranted: 0,
        createsDiscarded: 0,
        namesRefreshed: 1,
        namesTruncated: 1,
        carnetBackfilled: 0,
        carnetConflicts: 1,
        reactivated: 0,
        rolesReactivated: 0,
        rolesGrantedOnReactivation: 0,
        rolesLeftInactive: [],
        accountsWithoutRole: [23],
      });
      expect(service['logger']['_warn']).toHaveBeenCalledWith(
        expect.stringContaining('stored=12345, payload=99999'),
      );
    });

    it('issues BOTH refresh writes strictly before SAVEPOINT create_grant, so a create rollback cannot discard them (DD-15, R-AGS-004 AC.5)', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 23, carnet: null, is_active: true }),
      ]);
      const reconciliation = await service.reconcile([
        staffMember({ resourceId: 'A1' }),
      ]);

      await service.applyCreateAndGrant(reconciliation);

      // The property under test is ORDER, not presence. `toHaveBeenCalledWith` passes just as
      // happily when the refresh writes sit *after* the savepoint — where `ROLLBACK TO SAVEPOINT
      // create_grant` would silently discard every one of them on a failed create assertion.
      // Jest's invocationCallOrder is a monotonic global counter, so it compares across mocks.
      const savepointCallIndex = (
        manager.query as jest.Mock
      ).mock.calls.findIndex(([sql]) => sql === 'SAVEPOINT create_grant');
      expect(savepointCallIndex).toBeGreaterThanOrEqual(0);
      const savepointOrder = (manager.query as jest.Mock).mock
        .invocationCallOrder[savepointCallIndex];

      expect(
        repository.refreshSecUserNames.mock.invocationCallOrder[0],
      ).toBeLessThan(savepointOrder);
      expect(
        repository.backfillSecUserCarnets.mock.invocationCallOrder[0],
      ).toBeLessThan(savepointOrder);
    });

    it('refreshes BOTH active matches and reactivated accounts in one batch (R-AGS-007: "the account is also refreshed")', async () => {
      const active = staffMember({
        resourceId: 'A100',
        email: 'active@alliance.org',
      });
      const inactive = staffMember({
        resourceId: 'A200',
        email: 'inactive@alliance.org',
      });
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 31, email: active.email, carnet: null }),
        secUser({ sec_user_id: 32, email: inactive.email, is_active: false }),
      ]);
      const reconciliation = await service.reconcile([active, inactive]);

      await service.applyCreateAndGrant(reconciliation);

      // SUPERSEDED BY T-06, deliberately and with the requirement named. At T-05 this test
      // asserted that id 32 (an inactive match) was NOT refreshed, because tasks.md scoped
      // matched-inactive rows to T-06. R-AGS-007 then states plainly: "The account is also
      // refreshed — names and carnet backfill per R-AGS-002 — because a returning employee's
      // details are as stale as anyone's." So the reactivated account MUST be refreshed, and both
      // populations ride one batch to keep the statement count at O(ceil(n / CHUNK)) per
      // NFR-AGS-002. The old assertion encoded a task boundary, not a requirement.
      expect(repository.refreshSecUserNames).toHaveBeenCalledWith(manager, [
        expect.objectContaining({ secUserId: 31 }),
        expect.objectContaining({ secUserId: 32 }),
      ]);
      expect(repository.reactivateSecUsers).toHaveBeenCalledWith(manager, [32]);
    });

    it('sets the database-clock marker first, then creates, asserts, and grants only the re-selected new id', async () => {
      const member = staffMember({
        resourceId: 'A100',
        email: ' New.Hire@Alliance.org ',
      });
      const reconciliation = await service.reconcile([member]);
      const order: string[] = [];
      repository.setRunStart.mockImplementation(async () => {
        order.push('setRunStart');
      });
      repository.createSecUsers.mockImplementation(async () => {
        order.push('createSecUsers');
      });
      repository.findCreatedSecUsers.mockImplementation(async () => {
        order.push('findCreatedSecUsers');
        return [{ sec_user_id: 17, carnet: 'A100' }];
      });
      repository.grantContributorRoles.mockImplementation(async () => {
        order.push('grantContributorRoles');
      });
      repository.reactivateSecUsers.mockImplementation(async () => {
        order.push('reactivateSecUsers');
      });
      repository.reactivateContributorRoles.mockImplementation(async () => {
        order.push('reactivateContributorRoles');
      });
      (manager.query as jest.Mock).mockImplementation(async (sql: string) => {
        order.push(sql);
      });

      const outcome = await service.applyCreateAndGrant(reconciliation);

      // Moving setRunStart below createSecUsers makes this expectation red and reproduces M-1:
      // NOW(6) then post-dates every inserted created_at value, so the database re-select is empty.
      expect(order).toEqual([
        'setRunStart',
        // T-06's reactivation writes join the seam here. With no reactivate targets in this
        // fixture they are no-ops, but the ORDER assertion still pins them before the savepoint.
        'reactivateSecUsers',
        'reactivateContributorRoles',
        'grantContributorRoles',
        'SAVEPOINT create_grant',
        'createSecUsers',
        'findCreatedSecUsers',
        'grantContributorRoles',
      ]);
      // The write preserves the raw email, matching T-02's raw-value length validation. Normalized
      // email is a match key only; the requirements never authorize altering the stored identity.
      expect(repository.createSecUsers).toHaveBeenCalledWith(manager, [
        expect.objectContaining({ email: ' New.Hire@Alliance.org ' }),
      ]);
      expect(repository.grantContributorRoles).toHaveBeenCalledWith(manager, [
        17,
      ]);
      expect(outcome).toEqual({
        created: 1,
        rolesGranted: 1,
        createsDiscarded: 0,
        namesRefreshed: 0,
        namesTruncated: 0,
        carnetBackfilled: 0,
        carnetConflicts: 0,
        reactivated: 0,
        rolesReactivated: 0,
        rolesGrantedOnReactivation: 0,
        rolesLeftInactive: [],
        accountsWithoutRole: [],
      });
    });

    it('rolls back when duplicate carnet rows preserve the set but increase the count', async () => {
      const reconciliation = await service.reconcile([
        staffMember({ resourceId: 'A100' }),
      ]);
      repository.findCreatedSecUsers.mockResolvedValue([
        { sec_user_id: 17, carnet: 'A100' },
        { sec_user_id: 99, carnet: 'A100' },
      ]);

      const outcome = await service.applyCreateAndGrant(reconciliation);

      // This is the F-3 case that set equality alone misses: both sets are {A100}, but a role
      // would otherwise be granted to the foreign id 99.
      expect(manager.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT create_grant',
      );
      // T-06 note: branch (c) calls grantContributorRoles with an EMPTY list before the savepoint,
      // so "never called" is no longer the right shape. The property that matters is unchanged and
      // is asserted directly: no created id is ever granted a role when the assertion fails.
      expect(repository.grantContributorRoles).not.toHaveBeenCalledWith(
        manager,
        expect.arrayContaining([17]),
      );
      expect(outcome).toEqual({
        created: 0,
        rolesGranted: 0,
        createsDiscarded: 1,
        namesRefreshed: 0,
        namesTruncated: 0,
        carnetBackfilled: 0,
        carnetConflicts: 0,
        reactivated: 0,
        rolesReactivated: 0,
        rolesGrantedOnReactivation: 0,
        rolesLeftInactive: [],
        accountsWithoutRole: [],
        abortReason: 'GRANT_ASSERTION',
      });
    });

    it('rolls back when a foreign carnet balances the count but changes the set', async () => {
      const reconciliation = await service.reconcile([
        staffMember({ resourceId: 'A100' }),
      ]);
      repository.findCreatedSecUsers.mockResolvedValue([
        { sec_user_id: 99, carnet: 'B200' },
      ]);

      const outcome = await service.applyCreateAndGrant(reconciliation);

      // This is the F-3 case that count equality alone misses: both counts are one, but the
      // resulting role would target a row this run did not create.
      expect(manager.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT create_grant',
      );
      // T-06 note: branch (c) calls grantContributorRoles with an EMPTY list before the savepoint,
      // so "never called" is no longer the right shape. The property that matters is unchanged and
      // is asserted directly: no created id is ever granted a role when the assertion fails.
      expect(repository.grantContributorRoles).not.toHaveBeenCalledWith(
        manager,
        expect.arrayContaining([17]),
      );
      expect(outcome.abortReason).toBe('GRANT_ASSERTION');
    });

    it('never grants a role to refresh or reactivate targets', async () => {
      const fresh = staffMember({
        resourceId: 'A100',
        email: 'fresh@alliance.org',
      });
      const active = staffMember({
        resourceId: 'A200',
        email: 'active@alliance.org',
      });
      const inactive = staffMember({
        resourceId: 'A300',
        email: 'inactive@alliance.org',
      });
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 20, email: active.email, is_active: true }),
        secUser({ sec_user_id: 30, email: inactive.email, is_active: false }),
      ]);
      const reconciliation = await service.reconcile([fresh, active, inactive]);
      repository.findCreatedSecUsers.mockResolvedValue([
        { sec_user_id: 17, carnet: 'A100' },
      ]);

      await service.applyCreateAndGrant(reconciliation);

      // AC.2 is enforced by the generated id argument, not merely the call sequence: ids 20 and
      // 30 were classified outside create and cannot reach the grant repository method.
      expect(repository.grantContributorRoles).toHaveBeenCalledWith(manager, [
        17,
      ]);
    });
  });

  describe('reactivation — three disjoint role branches (R-AGS-007, design.md §5.4, M-2, N-4)', () => {
    /** A returning employee: one inactive sec_users row, matched by email. */
    async function reconcileReturningUser(
      secUserId: number,
      roleRows: Array<{
        sec_user_role_id: number;
        user_id: number;
        role_id: number;
        is_active: boolean;
      }>,
    ) {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: secUserId, is_active: false, carnet: 'A1' }),
      ]);
      repository.findSecUserRolesByUserIds.mockResolvedValue(roleRows as never);
      const reconciliation = await service.reconcile([staffMember({})]);
      expect(reconciliation.reactivate).toHaveLength(1);
      return service.applyCreateAndGrant(reconciliation);
    }

    it("(N-4) takes MIN(sec_user_role_id) among the user's role_id = 3 rows ONLY — never the lower id of an elevated role", async () => {
      // The exact shape of requirements.md §10's N-4 gate: an inactive SYSTEM_ADMIN row carrying a
      // LOWER id than the contributor row. A MIN taken over the user's inactive rows *before*
      // filtering to role 3 emits 700 and restores SYSTEM_ADMIN.
      const outcome = await reconcileReturningUser(50, [
        { sec_user_role_id: 700, user_id: 50, role_id: 1, is_active: false },
        { sec_user_role_id: 701, user_id: 50, role_id: 3, is_active: false },
      ]);

      expect(repository.reactivateContributorRoles).toHaveBeenCalledWith(
        manager,
        [701],
      );
      expect(repository.reactivateContributorRoles).not.toHaveBeenCalledWith(
        manager,
        expect.arrayContaining([700]),
      );
      expect(outcome.rolesLeftInactive).toEqual([{ userId: 50, roleId: 1 }]);
      expect(outcome.rolesReactivated).toBe(1);
      expect(outcome.rolesGrantedOnReactivation).toBe(0);
    });

    it('(branch a) issues NO role statement when an active role_id = 3 row already exists', async () => {
      const outcome = await reconcileReturningUser(50, [
        { sec_user_role_id: 800, user_id: 50, role_id: 3, is_active: true },
        { sec_user_role_id: 801, user_id: 50, role_id: 3, is_active: false },
      ]);

      // Flipping the stale inactive row would leave TWO active contributor rows (M-2), which
      // R-AGS-007 AC.3 forbids. sec_user_roles has no unique index on (user_id, role_id).
      expect(repository.reactivateContributorRoles).toHaveBeenCalledWith(
        manager,
        [],
      );
      expect(repository.grantContributorRoles).not.toHaveBeenCalledWith(
        manager,
        [50],
      );
      expect(outcome.rolesReactivated).toBe(0);
      expect(outcome.rolesGrantedOnReactivation).toBe(0);
    });

    it('(branch b) reactivates exactly ONE id when two inactive role_id = 3 rows exist', async () => {
      const outcome = await reconcileReturningUser(50, [
        { sec_user_role_id: 900, user_id: 50, role_id: 3, is_active: false },
        { sec_user_role_id: 901, user_id: 50, role_id: 3, is_active: false },
      ]);

      expect(repository.reactivateContributorRoles).toHaveBeenCalledWith(
        manager,
        [900],
      );
      expect(outcome.rolesReactivated).toBe(1);
    });

    it('(branch c) inserts one contributor row when the user holds no role_id = 3 row at all', async () => {
      const outcome = await reconcileReturningUser(50, [
        { sec_user_role_id: 700, user_id: 50, role_id: 1, is_active: false },
      ]);

      expect(repository.grantContributorRoles).toHaveBeenCalledWith(manager, [
        50,
      ]);
      expect(repository.reactivateContributorRoles).toHaveBeenCalledWith(
        manager,
        [],
      );
      // AC.8 / RB-10: branches (b) and (c) are DISTINCT counts. Collapsing them hides which half
      // of the role restoration actually happened.
      expect(outcome.rolesReactivated).toBe(0);
      expect(outcome.rolesGrantedOnReactivation).toBe(1);
      expect(outcome.reactivated).toBe(1);
    });

    it('reactivates the sec_users row and refreshes it, and touches no other table (R-AGS-007 AC.6)', async () => {
      await reconcileReturningUser(50, [
        { sec_user_role_id: 901, user_id: 50, role_id: 3, is_active: false },
      ]);

      expect(repository.reactivateSecUsers).toHaveBeenCalledWith(manager, [50]);
      // R-AGS-007: "The account is also refreshed" — a returning employee's details are as stale
      // as anyone's.
      expect(repository.refreshSecUserNames).toHaveBeenCalledWith(
        manager,
        expect.arrayContaining([expect.objectContaining({ secUserId: 50 })]),
      );
      // R-AGS-007 AC.6 ("no app_secrets row changes") is DELIBERATELY NOT ASSERTED HERE.
      // An earlier version of this test grepped manager.query for /app_secrets/i. That assertion
      // was theatre: the repository is mocked, so every repository statement bypasses
      // manager.query entirely and the only SQL it ever sees is the savepoint pair. It could not
      // fail, with or without the defect — the exact shape KZ-001 exists to stop, and it was
      // caught in review. AC.6 is a DATABASE claim and belongs to T-09's fixture tier.
      // What IS provable here, and is asserted above, is that the reactivation path calls only
      // reactivateSecUsers / reactivateContributorRoles / grantContributorRoles — there is no
      // repository method that reaches app_secrets at all.
    });

    it('issues both reactivation writes strictly before SAVEPOINT create_grant (DD-15)', async () => {
      await reconcileReturningUser(50, [
        { sec_user_role_id: 901, user_id: 50, role_id: 3, is_active: false },
      ]);

      const savepointIndex = (manager.query as jest.Mock).mock.calls.findIndex(
        ([sql]) => sql === 'SAVEPOINT create_grant',
      );
      expect(savepointIndex).toBeGreaterThanOrEqual(0);
      const savepointOrder = (manager.query as jest.Mock).mock
        .invocationCallOrder[savepointIndex];

      expect(
        repository.reactivateSecUsers.mock.invocationCallOrder[0],
      ).toBeLessThan(savepointOrder);
      expect(
        repository.reactivateContributorRoles.mock.invocationCallOrder[0],
      ).toBeLessThan(savepointOrder);
    });

    it('(OQ-D6) reports a matched ACTIVE account holding no active role_id = 3 row, and grants it nothing', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 77, is_active: true, carnet: 'A1' }),
      ]);
      // The account exists and is active, but holds no contributor row — normally an external
      // provisioned by a different flow. RSK-10: reported, never granted.
      repository.findSecUserRolesByUserIds.mockResolvedValue([] as never);
      const reconciliation = await service.reconcile([staffMember({})]);
      expect(reconciliation.refresh).toHaveLength(1);

      const outcome = await service.applyCreateAndGrant(reconciliation);

      expect(outcome.accountsWithoutRole).toEqual([77]);
      expect(repository.grantContributorRoles).not.toHaveBeenCalledWith(
        manager,
        expect.arrayContaining([77]),
      );
    });
  });

  describe("buildSummary — the run's only feedback channel (NFR-AGS-003, design.md §9)", () => {
    const cleanOutcome = {
      created: 2,
      rolesGranted: 2,
      createsDiscarded: 0,
      namesRefreshed: 3,
      namesTruncated: 1,
      carnetBackfilled: 1,
      carnetConflicts: 1,
      reactivated: 1,
      rolesReactivated: 1,
      rolesGrantedOnReactivation: 0,
      rolesLeftInactive: [{ userId: 50, roleId: 1 }],
      accountsWithoutRole: [77],
    };

    it('carries every field NFR-AGS-003 names, and OMITS abortReason on a clean run', async () => {
      repository.findAllSecUsers.mockResolvedValue([
        secUser({ sec_user_id: 9, email: 'a@alliance.org', is_active: true }),
      ]);
      const reconciliation = await service.reconcile([
        staffMember({ resourceId: 'A1', email: 'a@alliance.org' }),
        staffMember({ resourceId: 'A2', email: null as unknown as string }),
        staffMember({ resourceId: '12345678901', email: 'b@alliance.org' }),
      ]);

      const summary = service.buildSummary(reconciliation, cleanOutcome, 3);

      // Every field NFR-AGS-003 enumerates. A field missing here is a failure mode made invisible
      // forever: the controller does not await the service (RSK-4), so nothing else reports it.
      expect(Object.keys(summary).sort()).toEqual(
        [
          'accountsWithoutRole',
          'ambiguousMatches',
          'carnetBackfilled',
          'carnetConflicts',
          'created',
          'createsDiscarded',
          'matched',
          'namesRefreshed',
          'namesTruncated',
          'payloadEmailCollisions',
          'reactivated',
          'rolesGranted',
          'rolesGrantedOnReactivation',
          'rolesLeftInactive',
          'rolesReactivated',
          'skippedCarnetTooLong',
          'skippedUnusableEmail',
          'staffFetched',
        ].sort(),
      );
      // M-5: abortReason ABSENT on a clean run is what makes a savepoint rollback distinguishable
      // from a run that simply had nobody to create. Present-but-undefined would not do.
      expect('abortReason' in summary).toBe(false);
      expect(summary.staffFetched).toBe(3);
      expect(summary.skippedUnusableEmail).toBe(1);
      expect(summary.skippedCarnetTooLong).toBe(1);
      expect(summary.matched).toBe(1);
      expect(summary.rolesLeftInactive).toEqual([{ userId: 50, roleId: 1 }]);
      expect(summary.accountsWithoutRole).toEqual([77]);
    });

    it('sets abortReason and zeroes the create counters when the savepoint rolled back (R-AGS-004 AC.5, RA-10)', async () => {
      const reconciliation = await service.reconcile([staffMember({})]);

      const summary = service.buildSummary(
        reconciliation,
        {
          ...cleanOutcome,
          created: 0,
          rolesGranted: 0,
          createsDiscarded: 2,
          abortReason: 'GRANT_ASSERTION' as const,
        },
        1,
      );

      expect(summary.abortReason).toBe('GRANT_ASSERTION');
      expect(summary.created).toBe(0);
      expect(summary.rolesGranted).toBe(0);
      // The attempted figure lives here, never in `created` — RA-10 exists because an implementer
      // once reported created = 47 for a run that created nobody.
      expect(summary.createsDiscarded).toBe(2);
      // The refresh and reactivation counters survive: those writes committed (DD-15).
      expect(summary.namesRefreshed).toBe(3);
      expect(summary.reactivated).toBe(1);
    });

    it('reports every ambiguous candidate id from BOTH matched sets (RSK-1)', async () => {
      // Two ambiguities, deliberately one per set. An earlier version seeded only ONE member
      // matching an active + an inactive row. The tie-break routes that to `refresh`, leaving
      // `reactivate` EMPTY — so the test was blind to the reactivate half and stayed green with
      // that spread deleted from buildSummary. Confirmed empirically before this fix: the mutation
      // left 36/36 passing. Caught in review; the fixture now forces BOTH spreads to matter.
      repository.findAllSecUsers.mockResolvedValue([
        // -> refresh: an active candidate is present, so the tie-break prefers it
        secUser({
          sec_user_id: 10,
          email: 'dup@alliance.org',
          is_active: true,
        }),
        secUser({
          sec_user_id: 20,
          email: 'dup@alliance.org',
          is_active: false,
        }),
        // -> reactivate: BOTH candidates inactive
        secUser({
          sec_user_id: 30,
          email: 'back@alliance.org',
          is_active: false,
        }),
        secUser({
          sec_user_id: 40,
          email: 'back@alliance.org',
          is_active: false,
        }),
      ]);
      const reconciliation = await service.reconcile([
        staffMember({ resourceId: 'A1', email: 'dup@alliance.org' }),
        staffMember({ resourceId: 'A2', email: 'back@alliance.org' }),
      ]);
      // Guard the fixture itself: if either set were empty the assertion below could not
      // discriminate — which is exactly how the previous version failed.
      expect(reconciliation.refresh).toHaveLength(1);
      expect(reconciliation.reactivate).toHaveLength(1);

      const summary = service.buildSummary(reconciliation, cleanOutcome, 2);

      expect(summary.ambiguousMatches).toEqual([
        {
          emailKey: 'dup@alliance.org',
          candidateIds: [10, 20],
          chosenId: 10,
        },
        {
          emailKey: 'back@alliance.org',
          candidateIds: [30, 40],
          chosenId: 30,
        },
      ]);
    });
  });
});
