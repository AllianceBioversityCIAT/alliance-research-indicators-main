// @akili-spec changes/agresso-staff-sec-users-sync (T-02 — decision logic: validate → index → collapse → match → classify)
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
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
  let service: SecUserReconcilerService;

  beforeEach(() => {
    repository = {
      findAllSecUsers: jest.fn().mockResolvedValue([]),
      findSecUserRolesByUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SecUserReconcilerRepository>;
    service = new SecUserReconcilerService(repository);
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
});
