// @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
//
// Unit tests for PiDelegatesController.
//
// Scope: all five handlers — assign, list, verify, listByDelegate,
// listManagedProjects, listManagedDelegates — plus the new by-user handlers.
//
// Strategy (NestJS convention):
//   - Create a testing module with PiDelegatesService mocked as a manual mock.
//   - Assert that each handler calls the correct service method with the parsed
//     query/body argument, and that it wraps the result in ResponseUtils.format.
//   - No transport-level assertions (no Supertest) — those belong in e2e tests.
//
// KZ-001: assert on argument values passed to the service, not bare call count.

import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PiDelegatesController } from './pi-delegates.controller';
import { PiDelegatesService } from './pi-delegates.service';
import {
  ProjectDelegatesResponseDto,
  DelegateProjectsResponseDto,
} from './dto/pi-delegate-response.dto';
import { ListManagedDto } from './dto/list-managed.query.dto';
import { ListByDelegateDto } from './dto/list-by-delegate.query.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';
import { BulkAssignPiDelegatesDto } from './dto/bulk-assign-pi-delegates.dto';
import { BulkRevokePiDelegatesDto } from './dto/bulk-revoke-pi-delegates.dto';
import { HistoryQueryDto } from './dto/history.query.dto';
import { PiDelegateHistoryEntryDto } from './dto/pi-delegate-history-response.dto';
import { PiDelegateHistoryActionEnum } from './enum/pi-delegate-history-action.enum';
import { PiDelegateScopeEnum } from './enum/pi-delegate-scope.enum';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROJECT_DELEGATES_FIXTURE: ProjectDelegatesResponseDto = {
  project_code: 'PROJ-01',
  project_name: 'Test Project',
  is_pool_funding_contributor: false,
  pi_user_id: 99,
  pi_name: 'Mayesse Da Silva',
  status: 'ACTIVE',
  start_date: null,
  end_date: null,
  delegates: [
    {
      delegate_user_id: 1,
      name: 'Alice Smith',
      email: 'a.smith@cgiar.org',
      first_name: 'Alice',
      last_name: 'Smith',
      carnet: null,
      status_id: 1,
      is_active: true,
    },
  ],
};

const DELEGATE_PROJECTS_FIXTURE: DelegateProjectsResponseDto = {
  delegate_user_id: 42,
  name: 'Bob Doe',
  email: 'b.doe@cgiar.org',
  first_name: 'Bob',
  last_name: 'Doe',
  carnet: null,
  status_id: 1,
  is_active: true,
  projects: [{ project_code: 'PROJ-01', project_name: 'Test Project' }],
};

// ─── Mock service factory ─────────────────────────────────────────────────────

const HISTORY_ENTRY_FIXTURE: PiDelegateHistoryEntryDto = {
  pi_delegate_history_id: 1,
  action: PiDelegateHistoryActionEnum.ASSIGN,
  actor: { user_id: 50, name: 'Jane Smith' },
  delegate: { user_id: 42, name: 'Juan Carlos Cadavid' },
  project: { project_code: 'INIT-268', project_name: 'Initiative 268' },
  created_at: new Date('2026-09-14T12:00:00.000Z'),
};

function makeMockService() {
  return {
    assign: jest.fn().mockResolvedValue([]),
    bulkRevoke: jest.fn().mockResolvedValue({ revoked_count: 0 }),
    list: jest.fn().mockResolvedValue(PROJECT_DELEGATES_FIXTURE),
    verify: jest.fn().mockResolvedValue({ exists: true }),
    listByDelegate: jest.fn().mockResolvedValue(DELEGATE_PROJECTS_FIXTURE),
    listManagedProjects: jest
      .fn()
      .mockResolvedValue([PROJECT_DELEGATES_FIXTURE]),
    listManagedDelegates: jest
      .fn()
      .mockResolvedValue([DELEGATE_PROJECTS_FIXTURE]),
    getHistory: jest.fn().mockResolvedValue([HISTORY_ENTRY_FIXTURE]),
  };
}

// ─── Test module setup ────────────────────────────────────────────────────────

async function makeController() {
  const mockService = makeMockService();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [PiDelegatesController],
    providers: [
      {
        provide: PiDelegatesService,
        useValue: mockService,
      },
    ],
  }).compile();

  const controller = module.get<PiDelegatesController>(PiDelegatesController);
  return { controller, mockService };
}

// ─────────────────────────────────────────────────────────────────────────────
// assign() handler
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.assign()', () => {
  it('calls service.assign() with the body DTO and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: BulkAssignPiDelegatesDto = {
      assignments: [
        { project_id: 'PROJ-X', delegates: [{ delegate_user_id: 5 }] },
      ],
    };

    const result = await controller.assign(dto);

    expect(mockService.assign).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegations synchronised',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// list() handler
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.list()', () => {
  it('calls service.list() with projectId and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();

    const result = await controller.list('G232');

    expect(mockService.list).toHaveBeenCalledWith('G232');
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegations found',
      data: PROJECT_DELEGATES_FIXTURE,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verify() handler
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.verify()', () => {
  it('calls service.verify() with the query DTO and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: VerifyPiDelegateDto = {
      project_id: 'G232',
      delegate_user_id: 42,
    };

    const result = await controller.verify(dto);

    expect(mockService.verify).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegation verification complete',
      data: { exists: true },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listByDelegate() handler
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.listByDelegate()', () => {
  it('calls service.listByDelegate() with parsed delegate_user_id and wraps result', async () => {
    const { controller, mockService } = await makeController();
    const dto: ListByDelegateDto = { delegate_user_id: 42 };

    const result = await controller.listByDelegate(dto);

    // KZ-001: assert the service received the correct numeric id from the DTO
    expect(mockService.listByDelegate).toHaveBeenCalledWith(42);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'Projects for the delegate',
      data: DELEGATE_PROJECTS_FIXTURE,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listManagedProjects() handler — GET /pi-delegates/by-user/projects
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.listManagedProjects() — GET /pi-delegates/by-user/projects', () => {
  it('calls service.listManagedProjects() with parsed user_id and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: ListManagedDto = { user_id: 99 };

    const result = await controller.listManagedProjects(dto);

    // KZ-001: the service must receive the correct numeric user_id
    expect(mockService.listManagedProjects).toHaveBeenCalledWith(99, undefined);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'Managed projects for the user',
    });
  });

  it('data field contains the array returned by the service', async () => {
    const { controller, mockService } = await makeController();
    const expectedData = [PROJECT_DELEGATES_FIXTURE];
    mockService.listManagedProjects.mockResolvedValue(expectedData);

    const dto: ListManagedDto = { user_id: 10 };
    const result = await controller.listManagedProjects(dto);

    expect(result.data).toEqual(expectedData);
  });

  it('passes user_id from the DTO (not a hard-coded value)', async () => {
    const { controller, mockService } = await makeController();

    await controller.listManagedProjects({ user_id: 123 });
    await controller.listManagedProjects({ user_id: 456 });

    const calls = (mockService.listManagedProjects as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe(123);
    expect(calls[1][0]).toBe(456);
  });

  // @akili-spec docs/specs/changes/my-pi-delegates-admin-scope
  it('forwards scope=all to the service (the admin view is decided there, not here)', async () => {
    const { controller, mockService } = await makeController();

    await controller.listManagedProjects({
      user_id: 5,
      scope: PiDelegateScopeEnum.ALL,
    });

    expect(mockService.listManagedProjects).toHaveBeenCalledWith(
      5,
      PiDelegateScopeEnum.ALL,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listManagedDelegates() handler — GET /pi-delegates/by-user/people
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.listManagedDelegates() — GET /pi-delegates/by-user/people', () => {
  it('calls service.listManagedDelegates() with parsed user_id and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: ListManagedDto = { user_id: 77 };

    const result = await controller.listManagedDelegates(dto);

    // KZ-001: the service must receive the correct numeric user_id
    expect(mockService.listManagedDelegates).toHaveBeenCalledWith(
      77,
      undefined,
    );
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: "Distinct delegates across the user's managed projects",
    });
  });

  it('data field contains the array returned by the service', async () => {
    const { controller, mockService } = await makeController();
    const expectedData = [DELEGATE_PROJECTS_FIXTURE];
    mockService.listManagedDelegates.mockResolvedValue(expectedData);

    const dto: ListManagedDto = { user_id: 20 };
    const result = await controller.listManagedDelegates(dto);

    expect(result.data).toEqual(expectedData);
  });

  it('passes user_id from the DTO (not a hard-coded value)', async () => {
    const { controller, mockService } = await makeController();

    await controller.listManagedDelegates({ user_id: 200 });
    await controller.listManagedDelegates({ user_id: 300 });

    const calls = (mockService.listManagedDelegates as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe(200);
    expect(calls[1][0]).toBe(300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bulkRevoke() handler
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.bulkRevoke()', () => {
  it('calls service.bulkRevoke() with the body DTO and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: BulkRevokePiDelegatesDto = { pi_delegate_ids: [7, 12] };

    const result = await controller.bulkRevoke(dto);

    expect(mockService.bulkRevoke).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegations revoked',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ResponseUtils.format integration — verify the envelope fields are set
// ─────────────────────────────────────────────────────────────────────────────
describe('ResponseUtils.format envelope — listManagedProjects and listManagedDelegates', () => {
  it('listManagedProjects envelope: status=200, description set, data=service result', async () => {
    const { controller } = await makeController();
    const dto: ListManagedDto = { user_id: 5 };

    const result = await controller.listManagedProjects(dto);

    expect(result.status).toBe(HttpStatus.OK);
    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('listManagedDelegates envelope: status=200, description set, data=service result', async () => {
    const { controller } = await makeController();
    const dto: ListManagedDto = { user_id: 6 };

    const result = await controller.listManagedDelegates(dto);

    expect(result.status).toBe(HttpStatus.OK);
    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('listManagedProjects: service throwing ForbiddenException is not caught by the handler', async () => {
    const { controller, mockService } = await makeController();
    const { ForbiddenException } = await import('@nestjs/common');
    mockService.listManagedProjects.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );

    await expect(
      controller.listManagedProjects({ user_id: 99 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('listManagedDelegates: service throwing ForbiddenException is not caught by the handler', async () => {
    const { controller, mockService } = await makeController();
    const { ForbiddenException } = await import('@nestjs/common');
    mockService.listManagedDelegates.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );

    await expect(
      controller.listManagedDelegates({ user_id: 99 }),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getHistory() handler — GET /pi-delegates/history
// @akili-spec docs/specs/changes/my-pi-delegates-ui — history endpoint
// ─────────────────────────────────────────────────────────────────────────────
describe('PiDelegatesController.getHistory() — GET /pi-delegates/history', () => {
  it('project_id branch: calls service.getHistory({ project_id }) and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: HistoryQueryDto = { project_id: 'INIT-268' };

    const result = await controller.getHistory(dto);

    // KZ-001: service receives the exact DTO object
    expect(mockService.getHistory).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegation history',
    });
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('delegate_user_id branch: calls service.getHistory({ delegate_user_id }) and wraps in ResponseUtils.format', async () => {
    const { controller, mockService } = await makeController();
    const dto: HistoryQueryDto = { delegate_user_id: 42 };

    const result = await controller.getHistory(dto);

    // KZ-001: service receives the exact DTO including the numeric delegate_user_id
    expect(mockService.getHistory).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({
      status: HttpStatus.OK,
      description: 'PI delegation history',
    });
  });

  it('data field contains the array returned by the service', async () => {
    const { controller, mockService } = await makeController();
    mockService.getHistory.mockResolvedValue([HISTORY_ENTRY_FIXTURE]);
    const dto: HistoryQueryDto = { project_id: 'INIT-268' };

    const result = await controller.getHistory(dto);

    expect(result.data).toEqual([HISTORY_ENTRY_FIXTURE]);
  });

  it('empty result from service → data is an empty array', async () => {
    const { controller, mockService } = await makeController();
    mockService.getHistory.mockResolvedValue([]);
    const dto: HistoryQueryDto = { delegate_user_id: 99 };

    const result = await controller.getHistory(dto);

    expect(result.data).toEqual([]);
  });

  it('project branch: ForbiddenException from assertCanManageProject propagates (non-manager is denied)', async () => {
    const { controller, mockService } = await makeController();
    const { ForbiddenException } = await import('@nestjs/common');
    mockService.getHistory.mockRejectedValue(
      new ForbiddenException(
        'Access denied: caller is not the PI, an active delegate, or a SYSTEM_ADMIN for this project.',
      ),
    );

    await expect(
      controller.getHistory({ project_id: 'PROJ-DENIED' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
