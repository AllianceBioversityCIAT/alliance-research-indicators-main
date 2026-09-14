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
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'a.smith@cgiar.org',
    status_id: UserStatusEnum.ACCEPTED,
    is_active: true,
  },
  {
    sec_user_id: 2,
    first_name: 'Bob',
    last_name: 'Doe',
    email: 'b.doe@cgiar.org',
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
    expect(result[0]).toEqual({
      sec_user_id: 1,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'a.smith@cgiar.org',
    });
    expect(result[1]).toEqual({
      sec_user_id: 2,
      first_name: 'Bob',
      last_name: 'Doe',
      email: 'b.doe@cgiar.org',
    });
  });

  // ── 2. Status filter uses enum, not literal ───────────────────────────────

  it('passes UserStatusEnum.ACCEPTED as the statusId param (not a hardcoded 1)', async () => {
    await service.findActiveUsers();

    const qb = repoMock._qb;
    // where() is called with the status predicate
    expect(qb.where).toHaveBeenCalledWith('su.status_id = :statusId', {
      statusId: UserStatusEnum.ACCEPTED,
    });
    // andWhere() is called with is_active = TRUE
    expect(qb.andWhere).toHaveBeenCalledWith('su.is_active = TRUE');
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
