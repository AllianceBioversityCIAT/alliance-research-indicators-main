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
import { RolesService } from '@services/cache/roles.service';
import type { DelegateProjects, ProjectDelegates } from '@interfaces/pi-delegates.interface';
import type { MainResponse } from '@shared/interfaces/responses.interface';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProjectDelegates(overrides: Partial<ProjectDelegates> = {}): ProjectDelegates {
  return {
    project_code: 'P001',
    project_name: 'Alpha Project',
    is_pool_funding_contributor: false,
    pi_user_id: null,
    pi_name: null,
    status: 'Active',
    funding_type: null,
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
  /** Flipped by a test to put the service into the administrator view. */
  let isAdmin: boolean;
  let mockApi: jest.Mocked<
    Pick<
      ApiService,
      | 'GET_PIDelegatesByProject'
      | 'GET_PIDelegatesByDelegate'
      | 'GET_PIDelegatesByUserProjects'
      | 'GET_PIDelegatesByUserPeople'
      | 'POST_PIDelegates'
      | 'DELETE_PIDelegates'
      | 'POST_PiDelegatesExportByProjectXlsx'
      | 'POST_PiDelegatesExportByPersonXlsx'
    >
  >;

  beforeEach(() => {
    isAdmin = false;
    mockApi = {
      GET_PIDelegatesByProject: jest.fn(),
      GET_PIDelegatesByDelegate: jest.fn(),
      GET_PIDelegatesByUserProjects: jest.fn(),
      GET_PIDelegatesByUserPeople: jest.fn(),
      POST_PIDelegates: jest.fn(),
      DELETE_PIDelegates: jest.fn(),
      POST_PiDelegatesExportByProjectXlsx: jest.fn(),
      POST_PiDelegatesExportByPersonXlsx: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PiDelegatesClientService,
        { provide: ApiService, useValue: mockApi },
        { provide: RolesService, useValue: { isAdmin: () => isAdmin } }
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

    it('hasNoDelegate is the predicate behind projectsWithoutDelegate (chip and counter cannot disagree)', async () => {
      const withDel = makeProjectDelegates({ project_code: 'P001', delegates: [{ delegate_user_id: 1, name: 'A', email: 'a@a.com', is_active: true }] });
      const withoutDel = makeProjectDelegates({ project_code: 'P002', delegates: [] });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(withDel))
        .mockResolvedValueOnce(makeOkResponse(withoutDel));

      await service.loadByProject(['P001', 'P002']);

      expect(service.hasNoDelegate(withDel)).toBe(false);
      expect(service.hasNoDelegate(withoutDel)).toBe(true);
      expect(service.byProjectCache().filter(p => service.hasNoDelegate(p))).toEqual(service.projectsWithoutDelegate());
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

  // ── 4b. administrator scope (@akili-spec docs/specs/changes/my-pi-delegates-admin-scope) ──

  describe('administrator scope', () => {
    beforeEach(() => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
    });

    it('sends no scope for a PI or delegate', async () => {
      await service.loadByUser(7);

      expect(service.isAdminView()).toBe(false);
      expect(service.scope()).toBeUndefined();
      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledWith(7, undefined);
      expect(mockApi.GET_PIDelegatesByUserPeople).toHaveBeenCalledWith(7, undefined);
    });

    it("sends scope='all' on BOTH reads for an admin", async () => {
      isAdmin = true;

      await service.loadByUser(7);

      expect(service.isAdminView()).toBe(true);
      // ★ discriminating: passing the scope to only one endpoint would show every
      //   project under By project and only the admin's own people under By person.
      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledWith(7, 'all');
      expect(mockApi.GET_PIDelegatesByUserPeople).toHaveBeenCalledWith(7, 'all');
    });

    it('keeps the scope on the post-write reload', async () => {
      isAdmin = true;
      await service.loadByUser(7);
      mockApi.GET_PIDelegatesByUserProjects.mockClear();
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await service.revokePair('P001', 42);

      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledWith(7, 'all');
    });
  });

  // ── 4c. projectsAsDelegate / isDelegateOf answer per view ──────────────────

  describe('isDelegateOf', () => {
    /** MINE: caller is PI. DELEGATED: caller is on the delegate list. UNRELATED: neither. */
    const threeProjects = () => [
      makeProjectDelegates({ project_code: 'MINE', pi_user_id: 7, delegates: [] }),
      makeProjectDelegates({
        project_code: 'DELEGATED',
        pi_user_id: 3,
        delegates: [{ delegate_user_id: 7, name: 'Me', email: 'me@x.com', is_active: true }]
      }),
      makeProjectDelegates({ project_code: 'UNRELATED', pi_user_id: 3, delegates: [] })
    ];

    beforeEach(() => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse(threeProjects()));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
    });

    it('in the admin view, counts ONLY projects the user is actually a delegate on', async () => {
      isAdmin = true;

      await service.loadByUser(7);

      expect(service.projectsAsPi().map(p => p.project_code)).toEqual(['MINE']);
      // ★ discriminating: the admin list is mostly UNRELATED rows — a "not the PI"
      //   definition would report every one of them as a delegation.
      expect(service.projectsAsDelegate().map(p => p.project_code)).toEqual(['DELEGATED']);
    });

    it('in the PI/delegate view, every listed project the user is not PI of still counts', async () => {
      await service.loadByUser(7);

      // That list only ever contains projects the user manages, so UNRELATED cannot
      // occur — and the row IS reachable when pi_user_id failed to resolve. Changing
      // this would regress the PI/delegate view the admin scope must not touch.
      expect(service.projectsAsDelegate().map(p => p.project_code)).toEqual([
        'DELEGATED',
        'UNRELATED'
      ]);
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

  describe('export', () => {
    it('sends user_id, no scope for a managed user, and the keys + filters (by project)', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
      mockApi.POST_PiDelegatesExportByProjectXlsx.mockResolvedValue(new Blob(['x']));
      await service.loadByUser(7);
      await service.exportByProject(['P2', 'P1'], { role: 'pi' });
      expect(mockApi.POST_PiDelegatesExportByProjectXlsx).toHaveBeenCalledWith({
        user_id: 7,
        project_codes: ['P2', 'P1'],
        filters: { role: 'pi' }
      });
    });

    it('sends the SAME scope the tables loaded with (by person)', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
      mockApi.POST_PiDelegatesExportByPersonXlsx.mockResolvedValue(new Blob(['x']));
      await service.loadByUser(7);
      const scope = service.scope();
      await service.exportByPerson([3, 1], { search: 'a' });
      const body = mockApi.POST_PiDelegatesExportByPersonXlsx.mock.calls[0][0];
      expect(body).toEqual({ user_id: 7, ...(scope && { scope }), delegate_user_ids: [3, 1], filters: { search: 'a' } });
    });

    it('rejects when called before the user context is loaded', () => {
      expect(() => service.exportByPerson([1], {})).toThrow();
    });
  });

  // ── Coverage completion: fallbacks, non-Error rejections, revokeDelegate ──

  describe('export with administrator scope', () => {
    it("includes scope='all' in the export context for an admin", async () => {
      isAdmin = true;
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
      mockApi.POST_PiDelegatesExportByProjectXlsx.mockResolvedValue(new Blob(['x']));
      await service.loadByUser(9);

      await service.exportByProject(['P1'], {});

      expect(mockApi.POST_PiDelegatesExportByProjectXlsx.mock.calls[0][0]).toEqual({
        user_id: 9,
        scope: 'all',
        project_codes: ['P1'],
        filters: {}
      });
    });
  });

  describe('null data and non-Error rejections', () => {
    it('loadByUser falls back to empty arrays when successful responses carry no data', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue({ successfulRequest: true } as unknown as MainResponse<ProjectDelegates[]>);
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue({ successfulRequest: true } as unknown as MainResponse<DelegateProjects[]>);

      await service.loadByUser(1);

      expect(service.byProjectCache()).toEqual([]);
      expect(service.byPersonCache()).toEqual([]);
      expect(service.error()).toBeNull();
    });

    it('loadByUser uses the generic message for a non-Error rejection', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockRejectedValue('boom');
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));

      await service.loadByUser(1);

      expect(service.error()).toBe('Failed to load PI delegates data');
    });

    it('loadByProject uses the generic message for a non-Error rejection and skips null data', async () => {
      mockApi.GET_PIDelegatesByProject.mockRejectedValue('boom');
      await service.loadByProject(['P001']);
      expect(service.error()).toBe('Failed to load by-project data');

      mockApi.GET_PIDelegatesByProject.mockResolvedValue({ successfulRequest: true, data: null } as unknown as MainResponse<ProjectDelegates>);
      await service.loadByProject(['P001']);
      expect(service.byProjectCache()).toEqual([]);
    });

    it('loadByPerson reports Error messages, the generic message otherwise, and skips null data', async () => {
      mockApi.GET_PIDelegatesByDelegate.mockRejectedValueOnce(new Error('person fail'));
      await service.loadByPerson([1]);
      expect(service.error()).toBe('person fail');

      mockApi.GET_PIDelegatesByDelegate.mockRejectedValueOnce('boom');
      await service.loadByPerson([1]);
      expect(service.error()).toBe('Failed to load by-person data');

      mockApi.GET_PIDelegatesByDelegate.mockResolvedValue({ successfulRequest: true, data: null } as unknown as MainResponse<DelegateProjects>);
      await service.loadByPerson([1]);
      expect(service.byPersonCache()).toEqual([]);
    });

    it('assign reports Error messages and the generic message for non-Error rejections', async () => {
      mockApi.POST_PIDelegates.mockRejectedValueOnce(new Error('post fail'));
      await service.assign([{ project_id: 'P001', delegates: [{ delegate_user_id: 1 }] }]);
      expect(service.error()).toBe('post fail');

      mockApi.POST_PIDelegates.mockRejectedValueOnce('boom');
      await service.assign([{ project_id: 'P001', delegates: [{ delegate_user_id: 1 }] }]);
      expect(service.error()).toBe('Failed to assign PI delegates');
    });

    it('revokePair and revokeById use the generic message for non-Error rejections', async () => {
      mockApi.DELETE_PIDelegates.mockRejectedValueOnce('boom');
      await service.revokePair('P001', 1);
      expect(service.error()).toBe('Failed to revoke delegate');

      mockApi.DELETE_PIDelegates.mockRejectedValueOnce('boom');
      await service.revokeById([1]);
      expect(service.error()).toBe('Failed to revoke delegates by id');
    });
  });

  describe('revokeDelegate', () => {
    it('does nothing when there are no project ids', async () => {
      await service.revokeDelegate(5, []);

      expect(mockApi.DELETE_PIDelegates).not.toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });

    it('deletes every pair and reloads both caches', async () => {
      mockApi.GET_PIDelegatesByUserProjects.mockResolvedValue(makeOkResponse([]));
      mockApi.GET_PIDelegatesByUserPeople.mockResolvedValue(makeOkResponse([]));
      await service.loadByUser(3);
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await service.revokeDelegate(5, ['P1', 'P2']);

      expect(mockApi.DELETE_PIDelegates).toHaveBeenCalledWith({ project_ids: ['P1', 'P2'], delegate_user_ids: [5] });
      expect(mockApi.GET_PIDelegatesByUserProjects).toHaveBeenCalledTimes(2);
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('sets the Error message, or the generic one, when the DELETE rejects', async () => {
      mockApi.DELETE_PIDelegates.mockRejectedValueOnce(new Error('del fail'));
      await service.revokeDelegate(5, ['P1']);
      expect(service.error()).toBe('del fail');

      mockApi.DELETE_PIDelegates.mockRejectedValueOnce('boom');
      await service.revokeDelegate(5, ['P1']);
      expect(service.error()).toBe('Failed to revoke the delegate');
    });
  });

  describe('_reloadForUser fallback (no user loaded)', () => {
    it('does not refetch anything when no project is cached', async () => {
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await service.revokeById([1]);

      expect(mockApi.GET_PIDelegatesByProject).not.toHaveBeenCalled();
    });

    it('merges refetched projects: keeps unmatched ones, replaces matches, appends new, skips failures', async () => {
      const p1 = makeProjectDelegates({ project_code: 'P1' });
      const p2 = makeProjectDelegates({ project_code: 'P2' });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(p1))
        .mockResolvedValueOnce(makeOkResponse(p2));
      await service.loadByProject(['P1', 'P2']);

      // Refetch of [P1, P2]: P1 comes back updated, P2 fails and keeps its cached value.
      const p1b = makeProjectDelegates({ project_code: 'P1', project_name: 'Renamed' });
      mockApi.GET_PIDelegatesByProject
        .mockResolvedValueOnce(makeOkResponse(p1b))
        .mockResolvedValueOnce(makeErrResponse<ProjectDelegates>());
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await service.revokeById([1]);

      expect(service.byProjectCache()).toEqual([p1b, p2]);
    });

    it('appends refetched projects that are not in the cache yet', async () => {
      const p1 = makeProjectDelegates({ project_code: 'P1' });
      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(p1));
      await service.loadByProject(['P1']);

      // The cached code list is [P1]; make the refetch answer with a different project code.
      const other = makeProjectDelegates({ project_code: 'P9' });
      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(other));
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await service.revokeById([1]);

      expect(service.byProjectCache().map(p => p.project_code)).toEqual(['P1', 'P9']);
    });

    it('swallows a refetch failure', async () => {
      const p1 = makeProjectDelegates({ project_code: 'P1' });
      mockApi.GET_PIDelegatesByProject.mockResolvedValueOnce(makeOkResponse(p1));
      await service.loadByProject(['P1']);
      mockApi.GET_PIDelegatesByProject.mockRejectedValueOnce(new Error('net'));
      mockApi.DELETE_PIDelegates.mockResolvedValue(makeOkResponse(null));

      await expect(service.revokeById([1])).resolves.toBeUndefined();

      expect(service.byProjectCache()).toEqual([p1]);
    });
  });
});
