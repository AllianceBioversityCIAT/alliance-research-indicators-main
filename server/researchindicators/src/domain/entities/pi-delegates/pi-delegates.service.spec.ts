// @akili-spec docs/specs/changes/my-pi-delegates — T-09
//
// Unit tests for PiDelegatesService.
//
// Seams (design.md §7 / AKILI TDD skill):
//   - PiDelegatesService.assertCanManageProject() → ForbiddenException (public via CRUD ops)
//   - PiDelegatesService.create()  → ConflictException on errno 1062; delegates to repo
//   - PiDelegatesService.revoke()  → NotFoundException when row absent
//
// KZ-001 (anti-pattern guard): assertions are on RETURNED VALUES / thrown exceptions.
//   The sole call-count assertion is scenario 1b ("isPiOrActiveDelegateOfProject is
//   NOT called when SYSTEM_ADMIN is detected"), which is structurally required because
//   skipping the DB call IS the observable behavior difference (R-PID-007 bypass).
//   All other tests assert on resolved values or thrown error class+message.
//
// KZ-004 (discriminating fields): each scenario uses a distinct projectId and/or
//   userId so per-project scoping is provable from the discriminating input alone.

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PiDelegatesService } from './pi-delegates.service';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { PiDelegate } from './entities/pi-delegate.entity';
import { CreatePiDelegateDto } from './dto/create-pi-delegate.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makePiDelegate(overrides: Partial<PiDelegate> = {}): PiDelegate {
  const row = new PiDelegate();
  row.pi_delegate_id = 1;
  row.project_id = 'PROJ-A';
  row.pi_user_id = 10;
  row.delegate_user_id = 20;
  row.is_active = true;
  return Object.assign(row, overrides);
}

// ─── factory ─────────────────────────────────────────────────────────────────

function makeService(opts: {
  userId?: number;
  roles?: number[];
  isPiOrActiveDelegate?: boolean;
  findOneResult?: PiDelegate | null;
  createDelegateResult?: PiDelegate;
  findResult?: PiDelegate[];
  createDelegateError?: unknown;
  softDeleteDelegate?: jest.Mock;
}) {
  const isPiOrActiveDelegateOfProjectMock = jest
    .fn()
    .mockResolvedValue(opts.isPiOrActiveDelegate ?? false);
  const findOneMock = jest.fn().mockResolvedValue(opts.findOneResult ?? null);
  const createDelegateMock = opts.createDelegateError
    ? jest.fn().mockRejectedValue(opts.createDelegateError)
    : jest
        .fn()
        .mockResolvedValue(opts.createDelegateResult ?? makePiDelegate());
  const findMock = jest
    .fn()
    .mockResolvedValue(opts.findResult ?? [makePiDelegate()]);
  const softDeleteDelegateMock =
    opts.softDeleteDelegate ?? jest.fn().mockResolvedValue(undefined);

  const repo = {
    isPiOrActiveDelegateOfProject: isPiOrActiveDelegateOfProjectMock,
    findOne: findOneMock,
    createDelegate: createDelegateMock,
    find: findMock,
    softDeleteDelegate: softDeleteDelegateMock,
  } as unknown as PiDelegatesRepository;

  const currentUser = {
    user_id: opts.userId ?? 99,
    roles: opts.roles ?? [],
  } as unknown as CurrentUserUtil;

  const service = new PiDelegatesService(repo, currentUser);

  return {
    service,
    isPiOrActiveDelegateOfProjectMock,
    findOneMock,
    createDelegateMock,
    findMock,
    softDeleteDelegateMock,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PiDelegatesService — auth (assertCanManageProject)', () => {
  // Scenario: auth — SYSTEM_ADMIN allowed (R-PID-007 AC.1 Case 1)
  it('SYSTEM_ADMIN is allowed without querying isPiOrActiveDelegateOfProject', async () => {
    // KZ-001 exception: the bypass of the DB query IS the observable behavior.
    const { service, isPiOrActiveDelegateOfProjectMock } = makeService({
      userId: 1,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-ADMIN',
      delegate_user_id: 42,
    };
    // createDelegate mock resolves — no throw expected
    await expect(service.create(dto)).resolves.toBeDefined();
    // The DB auth query MUST NOT have been called (the bypass is the AC)
    expect(isPiOrActiveDelegateOfProjectMock).not.toHaveBeenCalled();
  });

  // Scenario: auth — PI/delegate allowed (R-PID-007 AC.1 Case 2)
  it('PI/active-delegate of the project is allowed (isPiOrActiveDelegateOfProject returns true)', async () => {
    const { service } = makeService({
      userId: 55,
      roles: [SecRolesEnum.CONTRIBUTOR], // not SYSTEM_ADMIN
      isPiOrActiveDelegate: true,
      createDelegateResult: makePiDelegate({
        project_id: 'PROJ-PI',
        delegate_user_id: 66,
      }),
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-PI',
      delegate_user_id: 66,
    };
    await expect(service.create(dto)).resolves.toBeDefined();
  });

  // Scenario: auth — neither → 403 ForbiddenException (R-PID-007, named red input K-012)
  it('caller who is not PI, delegate, or SYSTEM_ADMIN for a project → 403 ForbiddenException', async () => {
    const { service } = makeService({
      userId: 77,
      roles: [SecRolesEnum.CONTRIBUTOR],
      isPiOrActiveDelegate: false, // neither PI nor delegate
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-FORBIDDEN',
      delegate_user_id: 88,
    };
    await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
  });

  // Scenario: auth — ForbiddenException message is descriptive
  it('ForbiddenException carries a human-readable message when access is denied', async () => {
    const { service } = makeService({
      userId: 100,
      roles: [],
      isPiOrActiveDelegate: false,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-MSG',
      delegate_user_id: 101,
    };
    await expect(service.create(dto)).rejects.toThrow(
      'Access denied: caller is not the PI, an active delegate, or a SYSTEM_ADMIN for this project.',
    );
  });
});

describe('PiDelegatesService.create()', () => {
  // Scenario 5 — delegate already exists in sec_users → reused (no insert)
  // The repository.createDelegate() handles this internally; the service just
  // passes the delegate_user_id path through, so the discriminating observable
  // is: createDelegate was called with delegate_user_id (not an identity object).
  it('when delegate_user_id is supplied, delegates to repo.createDelegate with the userId path', async () => {
    const expected = makePiDelegate({
      project_id: 'PROJ-C5',
      delegate_user_id: 200,
    });
    const { service, createDelegateMock } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateResult: expected,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C5',
      delegate_user_id: 200,
    };
    const result = await service.create(dto);

    expect(result).toBe(expected);
    // Delegate input passed is { delegate_user_id: 200 } (not an identity object)
    expect(createDelegateMock).toHaveBeenCalledWith(
      'PROJ-C5',
      10, // callerUserId = pi_user_id
      { delegate_user_id: 200 },
      10, // createdBy = callerUserId
    );
  });

  // Scenario 6 — delegate absent → identity object passed to repo (repo provisions sec_user)
  it('when delegate identity is supplied (no delegate_user_id), repo.createDelegate receives the identity object', async () => {
    const expected = makePiDelegate({
      project_id: 'PROJ-C6',
      delegate_user_id: 300,
    });
    const { service, createDelegateMock } = makeService({
      userId: 20,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateResult: expected,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C6',
      delegate: {
        email: 'new@example.org',
        first_name: 'New',
        last_name: 'User',
      },
    };
    const result = await service.create(dto);

    expect(result).toBe(expected);
    expect(createDelegateMock).toHaveBeenCalledWith(
      'PROJ-C6',
      20,
      { email: 'new@example.org', first_name: 'New', last_name: 'User' },
      20,
    );
  });

  // Scenario 7 — association (pi_delegates row) created → service returns the repo result
  it('create() returns the PiDelegate row returned by the repository', async () => {
    const expected = makePiDelegate({
      project_id: 'PROJ-C7',
      pi_user_id: 30,
      delegate_user_id: 400,
    });
    const { service } = makeService({
      userId: 30,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateResult: expected,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C7',
      delegate_user_id: 400,
    };
    const result = await service.create(dto);

    expect(result.project_id).toBe('PROJ-C7');
    expect(result.delegate_user_id).toBe(400);
    expect(result.pi_user_id).toBe(30);
  });

  // Scenario 8 — errno 1062 → ConflictException at the service layer (R-PID-006)
  it('DB errno 1062 from repository is converted to ConflictException (409)', async () => {
    const dupKeyError = Object.assign(new Error('ER_DUP_ENTRY'), {
      errno: 1062,
    });
    const { service } = makeService({
      userId: 40,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateError: dupKeyError,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C8',
      delegate_user_id: 500,
    };
    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  // Verify the ConflictException message
  it('ConflictException from errno 1062 carries a descriptive message', async () => {
    const dupKeyError = Object.assign(new Error('ER_DUP_ENTRY'), {
      errno: 1062,
    });
    const { service } = makeService({
      userId: 40,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateError: dupKeyError,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C8-MSG',
      delegate_user_id: 501,
    };
    await expect(service.create(dto)).rejects.toThrow(
      'An active delegation already exists for this (project, delegate) pair.',
    );
  });

  // Non-1062 errors are re-thrown as-is (not wrapped)
  it('non-1062 errors from repository are re-thrown as-is', async () => {
    const genericError = new Error('generic DB error');
    const { service } = makeService({
      userId: 40,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      createDelegateError: genericError,
    });

    const dto: CreatePiDelegateDto = {
      project_id: 'PROJ-C8-RETHROW',
      delegate_user_id: 502,
    };
    await expect(service.create(dto)).rejects.toThrow('generic DB error');
    // Must NOT be wrapped in ConflictException
    await expect(
      makeService({
        userId: 40,
        roles: [SecRolesEnum.SYSTEM_ADMIN],
        createDelegateError: genericError,
      }).service.create(dto),
    ).rejects.not.toThrow(ConflictException);
  });
});

describe('PiDelegatesService.revoke()', () => {
  // Scenario 9 — revoke → the soft-delete is performed
  it('revoke() calls softDeleteDelegate with the correct id and caller userId', async () => {
    const existingRow = makePiDelegate({
      pi_delegate_id: 7,
      project_id: 'PROJ-R9',
      is_active: true,
    });
    const { service, softDeleteDelegateMock } = makeService({
      userId: 50,
      roles: [],
      isPiOrActiveDelegate: true, // caller is PI of the project
      findOneResult: existingRow,
    });

    await service.revoke(7);

    expect(softDeleteDelegateMock).toHaveBeenCalledWith(7, 50);
  });

  // Scenario 9b — after revoke, isPi would return false (proven via repo soft-delete path)
  // The behavioral proof at this unit level is: the soft-delete was called (which causes
  // the DB unique constraint to unblock, and isPi query to return no rows for this user).
  it('revoke() for a non-existent or already-revoked delegation → NotFoundException', async () => {
    const { service } = makeService({
      userId: 50,
      roles: [],
      findOneResult: null, // no active row found
    });

    await expect(service.revoke(999)).rejects.toThrow(NotFoundException);
  });

  it('NotFoundException carries the delegation id in its message', async () => {
    const { service } = makeService({ findOneResult: null });
    await expect(service.revoke(404)).rejects.toThrow(
      'Active delegation with id 404 not found.',
    );
  });
});

describe('PiDelegatesService.list()', () => {
  it('list() returns the active delegations array for the given projectId', async () => {
    const rows = [
      makePiDelegate({ project_id: 'PROJ-L1', delegate_user_id: 61 }),
      makePiDelegate({
        project_id: 'PROJ-L1',
        delegate_user_id: 62,
        pi_delegate_id: 2,
      }),
    ];
    const { service, findMock } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      findResult: rows,
    });

    const result = await service.list('PROJ-L1');

    expect(result).toBe(rows);
    expect(findMock).toHaveBeenCalledWith({
      where: { project_id: 'PROJ-L1', is_active: true },
      order: { pi_delegate_id: 'ASC' },
    });
  });

  it('list() for unauthorized caller → ForbiddenException (not the empty array)', async () => {
    const { service } = makeService({
      userId: 88,
      roles: [],
      isPiOrActiveDelegate: false,
    });

    await expect(service.list('PROJ-L-AUTH')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('PiDelegatesService.verify()', () => {
  it('verify() returns { exists: true } when an active delegation row is found', async () => {
    const row = makePiDelegate({ project_id: 'PROJ-V1', delegate_user_id: 71 });
    const { service } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      findOneResult: row,
    });

    const dto: VerifyPiDelegateDto = {
      project_id: 'PROJ-V1',
      delegate_user_id: 71,
    };
    const result = await service.verify(dto);

    expect(result).toEqual({ exists: true });
  });

  it('verify() returns { exists: false } when no active delegation row is found', async () => {
    const { service } = makeService({
      userId: 10,
      roles: [SecRolesEnum.SYSTEM_ADMIN],
      findOneResult: null,
    });

    const dto: VerifyPiDelegateDto = {
      project_id: 'PROJ-V2',
      delegate_user_id: 72,
    };
    const result = await service.verify(dto);

    expect(result).toEqual({ exists: false });
  });
});
