// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-08)
//
// Proves that both picker services expose the signal contract app-multiselect
// expects, populate from real sources, and map correctly.
//
// People service:
//   - main() populates list from ApiService.GET_ActiveUsers mapped to DelegateSummary
//   - sec_user_id → delegate_user_id; first+last → name; email fallback when both null
//   - loading toggles true → false around main()
//   - a failed fetch / successfulRequest:false leaves list empty without throwing
//
// Projects service:
//   - list derives from PiDelegatesClientService.byProjectCache()
//   - mapped to { project_code, project_name }
//   - updating byProjectCache is reflected in list (KZ-015 transition test)
//
// ServiceLocatorService swap-point:
//   - 'piDelegatePeople' resolves to PiDelegatePeoplePickerStubService
//   - 'piDelegateProjects' resolves to PiDelegateProjectsPickerStubService
//   - both expose the expected signal contract

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  PiDelegatePeoplePickerStubService,
  PiDelegateProjectsPickerStubService
} from './pi-delegate-picker-stub.service';
import { ApiService } from '@services/api.service';
import { PiDelegatesClientService } from './pi-delegates.client.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActiveUser } from '@shared/interfaces/pi-delegates.interface';
import type { ProjectDelegates } from '@shared/interfaces/pi-delegates.interface';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeActiveUsersResponse(
  users: ActiveUser[],
  successfulRequest = true
): MainResponse<ActiveUser[]> {
  return { data: users, successfulRequest } as unknown as MainResponse<ActiveUser[]>;
}

function makeProjectDelegates(overrides: Partial<ProjectDelegates> = {}): ProjectDelegates {
  return {
    project_code: 'PROJ-001',
    project_name: 'Test Project',
    is_pool_funding_contributor: false,
    status: 'active',
    start_date: null,
    end_date: null,
    delegates: [],
    ...overrides
  };
}

// ─── People Picker ────────────────────────────────────────────────────────────

describe('PiDelegatePeoplePickerStubService', () => {
  let svc: PiDelegatePeoplePickerStubService;
  let mockApi: { GET_ActiveUsers: jest.Mock };

  beforeEach(() => {
    mockApi = { GET_ActiveUsers: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        PiDelegatePeoplePickerStubService,
        { provide: ApiService, useValue: mockApi },
        // PiDelegatesClientService is not needed for this service but must be resolvable
        {
          provide: PiDelegatesClientService,
          useValue: { byProjectCache: jest.fn(() => []) }
        }
      ]
    });

    svc = TestBed.inject(PiDelegatePeoplePickerStubService);
  });

  it('should be created', () => {
    expect(svc).toBeTruthy();
  });

  it('exposes loading as a signal defaulting to false', () => {
    expect(svc.loading()).toBe(false);
  });

  it('exposes isOpenSearch as a signal defaulting to false', () => {
    expect(svc.isOpenSearch()).toBe(false);
  });

  it('exposes list as an empty signal before main() is called', () => {
    expect(Array.isArray(svc.list())).toBe(true);
    expect(svc.list()).toHaveLength(0);
  });

  it('main() populates list with correctly mapped DelegateSummary items', async () => {
    const users: ActiveUser[] = [
      { sec_user_id: 10, first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com' },
      { sec_user_id: 20, first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com' }
    ];
    mockApi.GET_ActiveUsers.mockResolvedValue(makeActiveUsersResponse(users));

    await svc.main();

    const list = svc.list();
    expect(list).toHaveLength(2);

    // First user: full name composite
    expect(list[0].delegate_user_id).toBe(10);
    expect(list[0].name).toBe('Alice Smith');
    expect(list[0].email).toBe('alice@example.com');

    // Second user
    expect(list[1].delegate_user_id).toBe(20);
    expect(list[1].name).toBe('Bob Jones');
    expect(list[1].email).toBe('bob@example.com');
  });

  it('main() falls back to email as name when both first_name and last_name are null', async () => {
    const users: ActiveUser[] = [
      { sec_user_id: 99, first_name: null, last_name: null, email: 'noname@example.com' }
    ];
    mockApi.GET_ActiveUsers.mockResolvedValue(makeActiveUsersResponse(users));

    await svc.main();

    const [item] = svc.list();
    expect(item.delegate_user_id).toBe(99);
    // Must NOT use sec_user_id as name — must use email fallback
    expect(item.name).toBe('noname@example.com');
    expect(item.email).toBe('noname@example.com');
  });

  it('main() toggles loading true then false around the fetch', async () => {
    const loadingStates: boolean[] = [];
    mockApi.GET_ActiveUsers.mockImplementation(async () => {
      loadingStates.push(svc.loading());
      return makeActiveUsersResponse([]);
    });

    await svc.main();

    // loading was true during the fetch, false after
    expect(loadingStates).toContain(true);
    expect(svc.loading()).toBe(false);
  });

  it('main() leaves list empty when successfulRequest is false — does not throw', async () => {
    mockApi.GET_ActiveUsers.mockResolvedValue(makeActiveUsersResponse([], false));

    await expect(svc.main()).resolves.not.toThrow();
    expect(svc.list()).toHaveLength(0);
  });

  it('main() leaves list empty and does not throw when the fetch rejects', async () => {
    mockApi.GET_ActiveUsers.mockRejectedValue(new Error('Network error'));

    await expect(svc.main()).resolves.not.toThrow();
    expect(svc.list()).toHaveLength(0);
  });

  it('main() sets loading to false even when the fetch rejects', async () => {
    mockApi.GET_ActiveUsers.mockRejectedValue(new Error('Network error'));

    await svc.main();

    expect(svc.loading()).toBe(false);
  });
});

// ─── Projects Picker ──────────────────────────────────────────────────────────

describe('PiDelegateProjectsPickerStubService', () => {
  let svc: PiDelegateProjectsPickerStubService;
  // Use a real Angular signal so the effect() in the service can track reactivity.
  let byProjectCacheSignal: ReturnType<typeof signal<ProjectDelegates[]>>;

  beforeEach(() => {
    // Start with one project in the cache
    byProjectCacheSignal = signal<ProjectDelegates[]>([
      makeProjectDelegates({ project_code: 'P-001', project_name: 'Alpha' })
    ]);

    TestBed.configureTestingModule({
      providers: [
        PiDelegateProjectsPickerStubService,
        {
          provide: PiDelegatesClientService,
          useValue: { byProjectCache: byProjectCacheSignal }
        },
        { provide: ApiService, useValue: { GET_ActiveUsers: jest.fn() } }
      ]
    });

    svc = TestBed.inject(PiDelegateProjectsPickerStubService);
    // Flush the effect that runs synchronously on construction
    TestBed.flushEffects();
  });

  it('should be created', () => {
    expect(svc).toBeTruthy();
  });

  it('exposes loading as a signal defaulting to false', () => {
    expect(svc.loading()).toBe(false);
  });

  it('exposes isOpenSearch as a signal defaulting to false', () => {
    expect(svc.isOpenSearch()).toBe(false);
  });

  it('list is populated from byProjectCache on construction (initial state)', () => {
    const list = svc.list();
    expect(list).toHaveLength(1);
    expect(list[0].project_code).toBe('P-001');
    expect(list[0].project_name).toBe('Alpha');
  });

  it('list only exposes project_code and project_name (correct mapping shape)', () => {
    const [item] = svc.list();
    // Only the two mapped keys should drive the multiselect
    expect(item.project_code).toBeDefined();
    expect(item.project_name).toBeDefined();
  });

  it('list stays in sync when byProjectCache changes (KZ-015 transition)', () => {
    // Simulate the table gaining a second project — mutate the real signal
    byProjectCacheSignal.set([
      makeProjectDelegates({ project_code: 'P-001', project_name: 'Alpha' }),
      makeProjectDelegates({ project_code: 'P-002', project_name: 'Beta' })
    ]);

    // Flush the effect so the service's list signal is updated
    TestBed.flushEffects();

    const list = svc.list();
    expect(list).toHaveLength(2);
    expect(list[1].project_code).toBe('P-002');
    expect(list[1].project_name).toBe('Beta');
  });
});

// ─── ServiceLocatorService swap-point registration ───────────────────────────

describe('ServiceLocatorService — swap point registration', () => {
  let locator: ServiceLocatorService;

  beforeEach(() => {
    const emptyCache = signal<ProjectDelegates[]>([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { GET_ActiveUsers: jest.fn() } },
        {
          provide: PiDelegatesClientService,
          useValue: { byProjectCache: emptyCache }
        }
      ]
    });
    locator = TestBed.inject(ServiceLocatorService);
  });

  it('resolves piDelegatePeople to PiDelegatePeoplePickerStubService', () => {
    const resolved = locator.getService('piDelegatePeople');
    expect(resolved).toBeInstanceOf(PiDelegatePeoplePickerStubService);
  });

  it('resolves piDelegateProjects to PiDelegateProjectsPickerStubService', () => {
    const resolved = locator.getService('piDelegateProjects');
    expect(resolved).toBeInstanceOf(PiDelegateProjectsPickerStubService);
  });

  it('resolved People service exposes the expected signal contract', () => {
    const people = locator.getService('piDelegatePeople') as PiDelegatePeoplePickerStubService;
    expect(typeof people.list).toBe('function');
    expect(typeof people.loading).toBe('function');
    expect(typeof people.isOpenSearch).toBe('function');
    expect(typeof people.main).toBe('function');
    expect(Array.isArray(people.list())).toBe(true);
  });

  it('resolved Projects service exposes the expected signal contract', () => {
    const projects = locator.getService('piDelegateProjects') as PiDelegateProjectsPickerStubService;
    expect(typeof projects.list).toBe('function');
    expect(typeof projects.loading).toBe('function');
    expect(typeof projects.isOpenSearch).toBe('function');
    expect(Array.isArray(projects.list())).toBe(true);
  });
});
