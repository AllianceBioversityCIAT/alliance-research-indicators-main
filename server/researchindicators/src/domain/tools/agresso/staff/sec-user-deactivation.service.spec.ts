// @akili-spec changes/agresso-staff-deactivation (T-04)
import { Test } from '@nestjs/testing';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { AgressoStaffRawDto } from './dto/agresso-staff-raw.dto';
import { FetchReport } from './dto/fetch-report.dto';
import { SecUserDeactivationRepository } from './sec-user-deactivation.repository';
import { SecUserDeactivationService } from './sec-user-deactivation.service';
import { ReconciliationResult } from './sec-user-reconciler.service';

const EXTERNAL_STATUS_ID = 3;

/** Every field varies per row: a fixture built from identical defaults cannot tell per-account
 *  scoping from a batch-wide bug (KZ-004). */
const user = (over: Partial<SecUser> & { sec_user_id: number }): SecUser =>
  ({
    first_name: `F${over.sec_user_id}`,
    last_name: `L${over.sec_user_id}`,
    email: `user${over.sec_user_id}@cgiar.org`,
    status_id: 1,
    carnet: `C${over.sec_user_id}`,
    is_active: true,
    ...over,
  }) as SecUser;

const member = (resourceId: string, email: string): AgressoStaffRawDto =>
  ({ resourceId, email, firstName: 'F', lastName: 'L' }) as AgressoStaffRawDto;

const reconciliation = (
  over: Partial<ReconciliationResult> = {},
): ReconciliationResult =>
  ({
    skipped: [],
    collapsed: [],
    create: [],
    refresh: [],
    reactivate: [],
    ...over,
  }) as ReconciliationResult;

const fetch = (over: Partial<FetchReport> = {}): FetchReport => ({
  totalElements: 2,
  pageRowCounts: [2],
  distinctCarnets: 2,
  duplicatedCarnets: [],
  ...over,
});

describe('SecUserDeactivationService', () => {
  let service: SecUserDeactivationService;
  let repo: jest.Mocked<SecUserDeactivationRepository>;

  beforeEach(async () => {
    repo = {
      resolveExternalStatusId: jest
        .fn()
        .mockResolvedValue({ statusId: EXTERNAL_STATUS_ID, matchCount: 1 }),
      countActivePopulation: jest.fn().mockResolvedValue(0),
      findActiveSystemAdminUserIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SecUserDeactivationRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SecUserDeactivationService,
        { provide: SecUserDeactivationRepository, useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(SecUserDeactivationService);
  });

  const run = (
    staff: AgressoStaffRawDto[],
    users: SecUser[],
    over: { rec?: ReconciliationResult; fetch?: Partial<FetchReport> } = {},
  ) =>
    service.measure(
      staff,
      over.rec ?? reconciliation(),
      users,
      fetch({
        totalElements: staff.length,
        distinctCarnets: staff.length,
        ...over.fetch,
      }),
    );

  describe('candidate set (R-AGD-001)', () => {
    it('reports an active account no payload member claims', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 700, email: 'present@cgiar.org' }),
          user({ sec_user_id: 701, email: 'gone.person@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([701]);
    });

    it('matches on the normalized key, so case and whitespace do not manufacture a candidate', async () => {
      const result = await run(
        [member('A1', '  J.DOE@CGIAR.ORG ')],
        [user({ sec_user_id: 702, email: 'j.doe@cgiar.org' })],
      );

      expect(result.candidates).toEqual([]);
    });

    it('never reports an already-inactive row', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({
            sec_user_id: 703,
            email: 'already.off@cgiar.org',
            is_active: false,
          }),
          user({ sec_user_id: 704, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.activePopulation).toBe(1);
    });
  });

  describe('shields (R-AGD-002)', () => {
    // THE JD-3 CASE. Raw length is over the column width; the trimmed key is not, and the trimmed
    // key is what matching compares. Swapping shieldKeyFor for isUsableEmail reddens this.
    it('shields an account whose staff member arrived with a padded, over-length raw email', async () => {
      const padded = 'maria.gomez@cgiar.org' + ' '.repeat(140);
      expect(padded.length).toBeGreaterThan(150);

      const result = await run(
        [member('A1', padded)],
        [user({ sec_user_id: 812, email: 'maria.gomez@cgiar.org' })],
      );

      expect(result.candidates).toEqual([]);
    });

    it('shields an account whose staff member was skipped for a too-long carnet', async () => {
      const skipped = member('ABCDEFGHIJK', 'real.person@cgiar.org');
      const result = await run(
        [skipped],
        [user({ sec_user_id: 800, email: 'real.person@cgiar.org' })],
        {
          rec: reconciliation({
            skipped: [
              { staffMember: skipped, reason: 'CARNET_TOO_LONG' },
            ] as any,
          }),
        },
      );

      expect(result.candidates).toEqual([]);
      expect(result.shieldedBySkip).toEqual([
        { accountId: 800, carnet: 'ABCDEFGHIJK', reason: 'CARNET_TOO_LONG' },
      ]);
    });

    it('shields the account of a collapsed loser, because its key equals its winner key', async () => {
      const result = await run(
        [
          member('A100', 'shared@cgiar.org'),
          member('B200', 'shared@cgiar.org'),
        ],
        [user({ sec_user_id: 801, email: 'shared@cgiar.org' })],
        { fetch: { totalElements: 2, distinctCarnets: 2 } },
      );

      expect(result.candidates).toEqual([]);
    });

    it('completes without throwing when a member arrives with a null email', async () => {
      const result = await run(
        [member('A1', null as unknown as string), member('A2', 'ok@cgiar.org')],
        [user({ sec_user_id: 805, email: 'ok@cgiar.org' })],
      );

      expect(result.abortReason).toBeUndefined();
      expect(result.candidates).toEqual([]);
    });
  });

  describe('exclusions (R-AGD-003)', () => {
    it('EX-1 spares an external account', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({
            sec_user_id: 900,
            email: 'ext@partner.org',
            status_id: EXTERNAL_STATUS_ID,
          }),
          user({ sec_user_id: 901, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedExternal).toBe(1);
    });

    it('EX-2 spares an active system admin but NOT an ex-admin', async () => {
      repo.findActiveSystemAdminUserIds.mockResolvedValue([910]);

      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 910, email: 'admin@cgiar.org' }),
          user({ sec_user_id: 911, email: 'exadmin@cgiar.org' }),
          user({ sec_user_id: 912, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([911]);
      expect(result.excludedSystemAdmin).toBe(1);
    });

    it('EX-3 spares BOTH rows when a key maps to two active rows', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 920, email: 'twin@cgiar.org' }),
          user({ sec_user_id: 921, email: 'TWIN@cgiar.org' }),
          user({ sec_user_id: 922, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedAmbiguous).toBe(2);
    });

    // F-10 — an already-inactive duplicate must not shield its live twin forever.
    it('EX-3 does not count an inactive duplicate, so the live twin IS a candidate', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 10, email: 'twin@cgiar.org', is_active: false }),
          user({ sec_user_id: 11, email: 'twin@cgiar.org' }),
          user({ sec_user_id: 12, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([11]);
      expect(result.excludedAmbiguous).toBe(0);
    });

    it('EX-4 spares an account whose own email is blank — nothing could ever match it', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 930, email: '   ' }),
          user({ sec_user_id: 931, email: 'present@cgiar.org' }),
        ],
      );

      expect(result.candidates).toEqual([]);
      expect(result.excludedUnmatchable).toBe(1);
    });
  });

  describe('preconditions (R-AGD-004)', () => {
    it('C-1 aborts on an empty payload and reports no candidate set', async () => {
      const result = await run(
        [],
        [user({ sec_user_id: 940, email: 'a@cgiar.org' })],
        {
          fetch: { totalElements: 0, pageRowCounts: [], distinctCarnets: 0 },
        },
      );

      expect(result.abortReason).toBe('C-1');
      expect(result.candidates).toBeUndefined();
    });

    it('C-2 aborts naming the page when a non-final page contributed nothing', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 941, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2400,
            pageRowCounts: [1000, 0, 400],
            distinctCarnets: 2400,
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).toMatchObject({ emptyPageNumber: 2 });
      expect(result.candidates).toBeUndefined();
    });

    // JS-5 — after the ceil fix the final page holds total % pageSize rows, so one mid-run
    // departure legitimately empties it. That must not read as a failed fetch.
    it('C-2 does NOT fire on an empty FINAL page; the distinctness clause reports the real cause', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 942, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2001,
            pageRowCounts: [1000, 1000, 0],
            distinctCarnets: 2000,
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).not.toHaveProperty('emptyPageNumber');
      expect(result.abortDetail).toMatchObject({
        distinctCarnets: 2000,
        totalElements: 2001,
      });
    });

    // JD-1 — the row count would be 2000 == totalElements here and would pass.
    it('C-2 aborts when DISTINCT carnets fall short, and names the duplicates', async () => {
      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 943, email: 'b@cgiar.org' })],
        {
          fetch: {
            totalElements: 2000,
            pageRowCounts: [1000, 1000],
            distinctCarnets: 1995,
            duplicatedCarnets: ['D1', 'D2', 'D3', 'D4', 'D5'],
          },
        },
      );

      expect(result.abortReason).toBe('C-2');
      expect(result.abortDetail).toMatchObject({
        duplicatedCarnets: ['D1', 'D2', 'D3', 'D4', 'D5'],
      });
    });

    it('C-2 does not fire on a surplus — more members is always the safe direction', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [user({ sec_user_id: 944, email: 'present@cgiar.org' })],
        {
          fetch: {
            totalElements: 1000,
            pageRowCounts: [1005],
            distinctCarnets: 1005,
          },
        },
      );

      expect(result.abortReason).toBeUndefined();
    });

    it.each([
      ['zero', 0],
      ['more than one', 2],
    ])('C-4 aborts when %s user_status row matches', async (_l, matchCount) => {
      repo.resolveExternalStatusId.mockResolvedValue({
        statusId: null,
        matchCount,
      });

      const result = await run(
        [member('A1', 'a@cgiar.org')],
        [user({ sec_user_id: 945, email: 'b@cgiar.org' })],
      );

      expect(result.abortReason).toBe('C-4');
      expect(result.abortDetail).toMatchObject({
        externalStatusMatches: matchCount,
      });
      expect(result.candidates).toBeUndefined();
    });
  });

  describe('reporting (R-AGD-005)', () => {
    it('omits abortReason entirely on a healthy run, so its presence alone identifies an abort', async () => {
      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [user({ sec_user_id: 950, email: 'present@cgiar.org' })],
      );

      expect('abortReason' in result).toBe(false);
    });

    it('reports activePopulation before exclusions', async () => {
      repo.findActiveSystemAdminUserIds.mockResolvedValue([961]);

      const result = await run(
        [member('A1', 'present@cgiar.org')],
        [
          user({ sec_user_id: 960, email: 'present@cgiar.org' }),
          user({ sec_user_id: 961, email: 'admin@cgiar.org' }),
          user({ sec_user_id: 962, email: 'gone@cgiar.org' }),
          user({ sec_user_id: 963, email: 'off@cgiar.org', is_active: false }),
        ],
      );

      expect(result.activePopulation).toBe(3);
      expect(result.candidates).toEqual([962]);
    });
  });
});
