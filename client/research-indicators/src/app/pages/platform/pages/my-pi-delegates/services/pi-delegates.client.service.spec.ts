// @akili-spec docs/specs/changes/my-pi-delegates-ui (T-UI-02)
//
// Focused spec for PiDelegatesClientService.
// Proofs required:
//   1. Single-cache derivation / no drift (R-UI-010)
//   2. write → refetch, not optimistic mutation (KZ-015 — arrange the transition)
//   3. DELETE rejection normalized: error set, no unhandled rejection, refetch still runs
//
// Network is never hit — ApiService is fully mocked via TestBed providers.

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PiDelegatesClientService } from './pi-delegates.client.service';
import { ApiService } from '@services/api.service';
import type { DelegateProjects, ProjectDelegates } from '@interfaces/pi-delegates.interface';
import type { MainResponse } from '@shared/interfaces/responses.interface';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProjectDelegates(overrides: Partial<ProjectDelegates> = {}): ProjectDelegates {
  return {
    project_code: 'P001',
    project_name: 'Alpha Project',
    is_pool_funding_contributor: false,
    status: 'Active',
    start_date: null,
    end_date: null,
    delegates: [{ delegate_user_id: 42, name: 'Alice', email: 'alice@example.com', is_active: true }],
    ...overrides
  };
}

function makeOkResponse<T>(data: T): MainResponse<T> {
  return { successfulRequest: true, data } as unknown as MainResponse<T>;
}

function makeErrResponse<T>(): MainResponse<T> {
  return { successfulRequest: false, data: undefined as unknown as T } as unknown as MainResponse<T>;
}

function makeDelegateProjects(overrides: Partial<DelegateProjects> = {}): DelegateProjects {
  return {
    delegate_user_id: 42,
    name: 'Alice',
    email: 'alice@example.com',
    is_active: true,
    projects: [{ project_code: 'P001', project_name: 'Alpha Project' }],
    ...overrides
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PiDelegatesClientService', () => {
  let service: PiDelegatesClientService;
  let mockApi: jest.Mocked<
    Pick<
      ApiService,
      | 'GET_PIDelegatesByProject'
      | 'GET_PIDelegatesByDelegate'
      | 'GET_PIDelegatesByUserProjects'
      | 'GET_PIDelegatesByUserPeople'
      | 'POST_PIDelegates'
      | 'DELETE_PIDelegates'
    >
  >;

  beforeEach(() => {
    mockApi = {
      GET_PIDelegatesByProject: jest.fn(),
      GET_PIDelegatesByDelegate: jest.fn(),
      GET_PIDelegatesByUserProjects: jest.fn(),
      GET_PIDelegatesByUserPeople: jest.fn(),
      POST_PIDelegates: jest.fn(),
      DELETE_PIDelegates: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PiDelegatesClientService,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    service = TestBed.inject(PiDelegatesClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Single-cache derivation / no drift (R-UI-010) ──────────────────────

  describe('single-cache derivation (R-UI-010)', () => {
    it('loads byProjectCache from the mocked API payload', async () => {
      const project = makeProjectDelegates({ project_code: 'P001', delegates: [{ delegate_user_id: 7, name: 'Bob', email: 'b@c.com', is_active: true }] });
      mockApi.GET_PIDelegatesByProject.mockResolvedValue(makeOkResponse(project));

      await service.loadByProject(['P001']);

      expect(service.byProjectCache()).toEqual([project]);
    });

    it('computed totalProjects reflects byProjectCache length, not a second field', async () => {
      // Arrange: two projects — a divergent copy would disagree with this count.
      const p1 = makeProjectDelegates({ project_code: 'P001', delegates: [] });
      const p2 = makeProjectDelegates({ project_code: 'P002', delegates: [{ delegate_user_id: 5, name: 'C', email: 'c@d.com', is_active: true }] });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(p1))
        .mockResolvedValueOnce(makeOkResponse(p2));

      await service.loadByProject(['P001', 'P002']);

      // The computed reads from byProjectCache — if there were a divergent copy
      // holding different data, this assertion would fail.
      expect(service.totalProjects()).toBe(2);
      expect(service.byProjectCache().length).toBe(service.totalProjects());
    });

    it('computed totalDistinctDelegates counts unique delegate_user_ids across all projects', async () => {
      const sharedDelegate = { delegate_user_id: 99, name: 'Shared', email: 's@s.com', is_active: true };
      const p1 = makeProjectDelegates({ project_code: 'P001', delegates: [sharedDelegate, { delegate_user_id: 10, name: 'X', email: 'x@x.com', is_active: true }] });
      const p2 = makeProjectDelegates({ project_code: 'P002', delegates: [sharedDelegate] });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(p1))
        .mockResolvedValueOnce(makeOkResponse(p2));

      await service.loadByProject(['P001', 'P002']);

      // delegate_user_id 99 appears in both projects but must count as 1.
      expect(service.totalDistinctDelegates()).toBe(2);
    });

    it('projectsWithoutDelegate only includes projects with empty delegates array', async () => {
      const withDel = makeProjectDelegates({ project_code: 'P001', delegates: [{ delegate_user_id: 1, name: 'A', email: 'a@a.com', is_active: true }] });
      const withoutDel = makeProjectDelegates({ project_code: 'P002', delegates: [] });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(withDel))
        .mockResolvedValueOnce(makeOkResponse(withoutDel));

      await service.loadByProject(['P001', 'P002']);

      expect(service.projectsWithoutDelegate()).toHaveLength(1);
      expect(service.projectsWithoutDelegate()[0].project_code).toBe('P002');
    });
  });

  // ── 2. write → refetch, not optimistic mutation (KZ-015) ──────────────────

  describe('assign (POST → refetch)', () => {
    it('calls POST before GET and cache equals the refetched value, not the pre-write snapshot', async () => {
      // Initial load: project has no delegates.
      const beforeWrite = makeProjectDelegates({ project_code: 'P001', delegates: [] });
      // After the POST the server returns a delegate assigned.
      const afterWrite = makeProjectDelegates({
        project_code: 'P001',
        delegates: [{ delegate_user_id: 55, name: 'New', email: 'new@test.com', is_active: true }]
      });

      // Initial load uses the first mockResolvedValueOnce (beforeWrite).
      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(beforeWrite));
      await service.loadByProject(['P001']);
      expect(service.byProjectCache()[0].delegates).toHaveLength(0); // pre-write snapshot

      // After the initial load, set up tracking mocks for the write+refetch phase.
      // We set these AFTER loadByProject so the queue is empty and mockImplementation
      // fires for every subsequent call (including the refetch inside assign).
      const callOrderLog: string[] = [];
      mockApi.POST_PIDelegates.mockImplementation(async () => {
        callOrderLog.push('POST');
        return makeOkResponse(null);
      });
      mockApi.GET_PIDelegatesByProject.mockImplementation(async () => {
        callOrderLog.push('GET');
        return makeOkResponse(afterWrite);
      });

      await service.assign([{ project_id: 'P001', delegates: [{ delegate_user_id: 55 }] }]);

      // The write (POST) must have been called BEFORE the read (GET refetch).
      expect(callOrderLog).toEqual(['POST', 'GET']);
      // The cache must now reflect the refetched value, not the pre-write snapshot.
      expect(service.byProjectCache()[0].delegates).toHaveLength(1);
      expect(service.byProjectCache()[0].delegates[0].delegate_user_id).toBe(55);
    });

    it('sets error and still refetches when POST returns successfulRequest:false', async () => {
      const afterWrite = makeProjectDelegates({ project_code: 'P001', delegates: [] });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(makeProjectDelegates({ project_code: 'P001', delegates: [] })))
        .mockResolvedValueOnce(makeOkResponse(afterWrite));
      mockApi.POST_PIDelegates.mockResolvedValue(makeErrResponse());

      await service.loadByProject(['P001']);
      await service.assign([{ project_id: 'P001', delegates: [] }]);

      expect(service.error()).toBeTruthy();
      // Refetch still ran despite the error — GET called twice total.
      expect(mockApi.GET_PIDelegatesByProject).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokePair (DELETE → refetch)', () => {
    it('calls DELETE before GET and cache equals refetched value', async () => {
      // Initial: project has a delegate.
      const withDelegate = makeProjectDelegates({
        project_code: 'P001',
        delegates: [{ delegate_user_id: 42, name: 'Alice', email: 'alice@example.com', is_active: true }]
      });
      // After revoke: project has no delegates.
      const afterRevoke = makeProjectDelegates({ project_code: 'P001', delegates: [] });

      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(withDelegate));
      await service.loadByProject(['P001']);

      const callOrderLog: string[] = [];
      mockApi.DELETE_PIDelegates.mockImplementation(async () => {
        callOrderLog.push('DELETE');
        return makeOkResponse(null);
      });
      mockApi.GET_PIDelegatesByProject.mockImplementation(async () => {
        callOrderLog.push('GET');
        return makeOkResponse(afterRevoke);
      });

      await service.revokePair('P001', 42);

      expect(callOrderLog).toEqual(['DELETE', 'GET']);
      expect(service.byProjectCache()[0].delegates).toHaveLength(0);
    });
  });

  describe('revokeById (DELETE → refetch)', () => {
    it('calls DELETE before GET and cache equals refetched value', async () => {
      const withDelegate = makeProjectDelegates({
        project_code: 'P001',
        delegates: [{ delegate_user_id: 9, name: 'Z', email: 'z@z.com', is_active: true }]
      });
      const afterRevoke = makeProjectDelegates({ project_code: 'P001', delegates: [] });

      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(withDelegate));
      await service.loadByProject(['P001']);

      const callOrderLog: string[] = [];
      mockApi.DELETE_PIDelegates.mockImplementation(async () => {
        callOrderLog.push('DELETE');
        return makeOkResponse(null);
      });
      mockApi.GET_PIDelegatesByProject.mockImplementation(async () => {
        callOrderLog.push('GET');
        return makeOkResponse(afterRevoke);
      });

      await service.revokeById([9]);

      expect(callOrderLog).toEqual(['DELETE', 'GET']);
      expect(service.byProjectCache()[0].delegates).toHaveLength(0);
    });
  });

  // ── 3. DELETE rejection normalized (advisory from T-UI-01) ────────────────

  describe('DELETE rejection handling', () => {
    it('revokePair: sets error when DELETE rejects, does not throw unhandled rejection, still refetches', async () => {
      const initial = makeProjectDelegates({ project_code: 'P001' });
      const afterRefetch = makeProjectDelegates({ project_code: 'P001' });

      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(initial))
        .mockResolvedValueOnce(makeOkResponse(afterRefetch));
      mockApi.DELETE_PIDelegates.mockRejectedValue(new Error('Network error'));

      await service.loadByProject(['P001']);

      // Must not throw (no unhandled rejection propagated).
      await expect(service.revokePair('P001', 42)).resolves.toBeUndefined();

      expect(service.error()).toBe('Network error');
      // Refetch still ran after the rejection.
      expect(mockApi.GET_PIDelegatesByProject).toHaveBeenCalledTimes(2);
    });

    it('revokeById: sets error when DELETE rejects, does not throw, still refetches', async () => {
      const initial = makeProjectDelegates({ project_code: 'P001' });
      const afterRefetch = makeProjectDelegates({ project_code: 'P001' });

      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(initial))
        .mockResolvedValueOnce(makeOkResponse(afterRefetch));
      mockApi.DELETE_PIDelegates.mockRejectedValue(new Error('500 Server Error'));

      await service.loadByProject(['P001']);
      await expect(service.revokeById([1, 2])).resolves.toBeUndefined();

      expect(service.error()).toBe('500 Server Error');
      expect(mockApi.GET_PIDelegatesByProject).toHaveBeenCalledTimes(2);
    });

    it('error signal is falsy (null) before any operation', () => {
      expect(service.error()).toBeNull();
    });

    it('error signal is cleared to null at the start of a successful operation', async () => {
      // Arrange a prior error.
      mockApi.GET_PIDelegatesByProject.mockRejectedValueOnce(new Error('prev error'));
      await service.loadByProject(['P001']);
      expect(service.error()).toBeTruthy();

      // Now a clean load clears the error.
      const project = makeProjectDelegates({ project_code: 'P001' });
      mockApi.GET_PIDelegatesByProject.mockResolvedValue(makeOkResponse(project));
      await service.loadByProject(['P001']);
      expect(service.error()).toBeNull();
    });
  });

  // ── 4. loading signal ─────────────────────────────────────────────────────

  describe('loading signal', () => {
    it('starts false', () => {
      expect(service.loading()).toBe(false);
    });

    it('is false after a completed loadByProject', async () => {
      mockApi.GET_PIDelegatesByProject.mockResolvedValue(makeOkResponse(makeProjectDelegates()));
      await service.loadByProject(['P001']);
      expect(service.loading()).toBe(false);
    });

    it('is false after a loadByPerson', async () => {
      const delegateProjects: DelegateProjects = {
        delegate_user_id: 1,
        name: 'Alice',
        email: 'a@a.com',
        is_active: true,
        projects: [{ project_code: 'P001', project_name: 'Alpha' }]
      };
      mockApi.GET_PIDelegatesByDelegate.mockResolvedValue(makeOkResponse(delegateProjects));
      await service.loadByPerson([1]);
      expect(service.loading()).toBe(false);
    });
  });

  // ── 5. loadByUser — both caches populated from by-user endpoints ──────────

  describe('loadByUser', () => {
    it('sets byProjectCache from GET_PIDelegatesByUserProjects response data', async () => {
      const project = makeProjectDelegates({ project_code: 'P001' });
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([project]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      await service.loadByUser(7);

      expect(service.byProjectCache()).toEqual([project]);
    });

    it('sets byPersonCache from GET_PIDelegatesByUserPeople response data', async () => {
      const person = makeDelegateProjects({ delegate_user_id: 42 });
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([person]));

      await service.loadByUser(7);

      expect(service.byPersonCache()).toEqual([person]);
    });

    it('loading toggles true then false over the call', async () => {
      let loadingDuringCall = false;
      mockApi.GET_PIDelegatesByUserProjects.mockImplementation(async () => {
        loadingDuringCall = service.loading();
        return makeOkResponse([]);
      });
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      expect(service.loading()).toBe(false);
      await service.loadByUser(1);
      expect(loadingDuringCall).toBe(true);
      expect(service.loading()).toBe(false);
    });

    it('sets error when GET_PIDelegatesByUserProjects returns successfulRequest:false', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeErrResponse<ProjectDelegates[]>());
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      await service.loadByUser(1);

      expect(service.error()).toBeTruthy();
    });

    it('sets error when GET_PIDelegatesByUserPeople returns successfulRequest:false', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeErrResponse<DelegateProjects[]>());

      await service.loadByUser(1);

      expect(service.error()).toBeTruthy();
    });

    it('sets error and loading=false when an exception is thrown', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockRejectedValue(new Error('Network fail'));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      await service.loadByUser(1);

      expect(service.error()).toBe('Network fail');
      expect(service.loading()).toBe(false);
    });
  });

  // ── 6. write → _reloadForUser (both endpoints called after revokePair) ────

  describe('revokePair → _reloadForUser reloads both caches', () => {
    it('after revokePair, GET_PIDelegatesByUserProjects AND GET_PIDelegatesByUserPeople are called', async () => {
      // Arrange: loadByUser first so _userId is set.
      const project = makeProjectDelegates({ project_code: 'P001', delegates: [{ delegate_user_id: 42, name: 'Alice', email: 'a@a.com', is_active: true }] });
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([project]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
      await service.loadByUser(7);
      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledTimes(1);
      expect(mockApi.GET_PIDelegatesByUserPeople).toHaveBeenCalledTimes(1);

      // Arrange reload mocks (after the initial load).
      const afterRevoke = makeProjectDelegates({ project_code: 'P001', delegates: [] });
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([afterRevoke]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      // Act: DELETE runs then _reloadForUser → both GETs fire again.
      await service.revokePair('P001', 42);

      // Assert: both endpoints called a second time (the reload).
      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledTimes(2);
      expect(mockApi.GET_PIDelegatesByUserPeople).toHaveBeenCalledTimes(2);
      // And the project cache reflects the reloaded (empty delegates) state.
      expect(service.byProjectCache()[0].delegates).toHaveLength(0);
    });
  });
});
