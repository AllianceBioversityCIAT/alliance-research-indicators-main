// Unit tests for UsersService.findActiveUsers
//
// Seams:
//   findActiveUsers(search?)  → ActiveUserResponseDto[]
//
// KZ-001: assert on returned values and query builder call arguments,
//         not bare call count.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { SecUserEntity } from './entities/sec-user.entity';
import { UserStatusEnum } from './enum/user-status.enum';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACCEPTED_USER_ROWS: Partial<SecUserEntity>[] = [
  {
    sec_user_id: 1,
    first_name: 'ALICE',
    last_name: 'SMITH',
    email: 'a.smith@cgiar.org',
    carnet: 'C00001',
    status_id: UserStatusEnum.ACCEPTED,
    is_active: true,
  },
  {
    sec_user_id: 2,
    first_name: 'bob',
    last_name: 'doe',
    email: 'b.doe@cgiar.org',
    carnet: null,
    status_id: UserStatusEnum.ACCEPTED,
    is_active: true,
  },
];

// ─── QueryBuilder mock factory ────────────────────────────────────────────────

function makeQbMock(rows: Partial<SecUserEntity>[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

// ─── Repository mock factory ──────────────────────────────────────────────────

function makeRepoMock(rows: Partial<SecUserEntity>[]) {
  const qb = makeQbMock(rows);
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    _qb: qb,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let repoMock: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    repoMock = makeRepoMock(ACCEPTED_USER_ROWS);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(SecUserEntity),
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── 1. No search: returns all active-accepted users ──────────────────────

  it('returns mapped ActiveUserResponseDto array when no search is provided', async () => {
    const result = await service.findActiveUsers();

    expect(result).toHaveLength(2);
    // sec_users stores mixed casing ('ALICE SMITH', 'bob doe') — both come back
    // title-cased so the pickers render one consistent style.
    expect(result[0]).toEqual({
      sec_user_id: 1,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'a.smith@cgiar.org',
      carnet: 'C00001',
    });
    // carnet is optional in sec_users — a user without one maps to null
    expect(result[1]).toEqual({
      sec_user_id: 2,
      first_name: 'Bob',
      last_name: 'Doe',
      email: 'b.doe@cgiar.org',
      carnet: null,
    });
  });

  // ── 2. Status filter uses IN-list with ACCEPTED + EXTERNAL_ACCEPTED ────────

  it('passes statusIds [ACCEPTED, EXTERNAL_ACCEPTED] to the IN predicate (not a single = :statusId)', async () => {
    await service.findActiveUsers();

    const qb = repoMock._qb;
    // where() is called with the IN-list status predicate
    expect(qb.where).toHaveBeenCalledWith('su.status_id IN (:...statusIds)', {
      statusIds: [UserStatusEnum.ACCEPTED, UserStatusEnum.EXTERNAL_ACCEPTED],
    });
    // andWhere() is called with is_active = TRUE
    expect(qb.andWhere).toHaveBeenCalledWith('su.is_active = TRUE');
  });

  // ── 2b. Regression: Pending(2) and Rejected(3) must not be in the list ────

  it('excludes Pending(2) and Rejected(3) from the statusIds IN-list', async () => {
    await service.findActiveUsers();

    const qb = repoMock._qb;
    // Retrieve the statusIds array that was passed to where()
    const whereCall = qb.where.mock.calls[0];
    const statusIds: number[] = whereCall[1].statusIds;

    expect(statusIds).toContain(UserStatusEnum.ACCEPTED);
    expect(statusIds).toContain(UserStatusEnum.EXTERNAL_ACCEPTED);
    expect(statusIds).not.toContain(UserStatusEnum.PENDING);
    expect(statusIds).not.toContain(UserStatusEnum.REJECTED);
  });

  // ── 3. Search term appended when provided ────────────────────────────────

  it('adds LIKE predicate when search is provided', async () => {
    await service.findActiveUsers('jane');

    const qb = repoMock._qb;
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(su.first_name LIKE :term OR su.last_name LIKE :term OR su.email LIKE :term)',
      { term: '%jane%' },
    );
  });

  // ── 4. Empty / whitespace-only search is ignored ─────────────────────────

  it('does not add LIKE predicate when search is an empty string', async () => {
    await service.findActiveUsers('');

    const qb = repoMock._qb;
    const andWhereCalls: string[] = qb.andWhere.mock.calls.map(
      (args: any[]) => args[0],
    );
    const likeCall = andWhereCalls.find((c) => c.includes('LIKE'));
    expect(likeCall).toBeUndefined();
  });

  it('does not add LIKE predicate when search is whitespace only', async () => {
    await service.findActiveUsers('   ');

    const qb = repoMock._qb;
    const andWhereCalls: string[] = qb.andWhere.mock.calls.map(
      (args: any[]) => args[0],
    );
    const likeCall = andWhereCalls.find((c) => c.includes('LIKE'));
    expect(likeCall).toBeUndefined();
  });

  // ── 5. Null name fields are preserved ────────────────────────────────────

  it('maps null first_name / last_name as null (not undefined)', async () => {
    repoMock._qb.getMany.mockResolvedValueOnce([
      {
        sec_user_id: 99,
        first_name: null,
        last_name: null,
        email: 'x@cgiar.org',
        is_active: true,
        status_id: UserStatusEnum.ACCEPTED,
      },
    ]);

    const result = await service.findActiveUsers();

    expect(result[0].first_name).toBeNull();
    expect(result[0].last_name).toBeNull();
  });

  // ── 6. Empty result returns [] ────────────────────────────────────────────

  it('returns an empty array when no users match', async () => {
    repoMock._qb.getMany.mockResolvedValueOnce([]);
    const result = await service.findActiveUsers('nonexistent');
    expect(result).toEqual([]);
  });
});
