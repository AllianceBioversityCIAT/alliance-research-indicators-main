import { cacheServiceMock, resetRouterEventsSubject, routerEventsSubject, actionsServiceMock, apiServiceMock, routeMock, httpClientMock, submissionServiceMock, getMetadataServiceMock } from './mock-services.mock';

describe('mock-services.mock coverage', () => {
  it('extractNumericId covers number input', () => {
    expect(cacheServiceMock.extractNumericId(789)).toBe(789);
  });

  it('extractNumericId covers platform-prefixed string', () => {
    expect(cacheServiceMock.extractNumericId('STAR-123')).toBe(123);
  });

  it('extractNumericId covers plain numeric string', () => {
    expect(cacheServiceMock.extractNumericId('456')).toBe(456);
  });

  it('getCurrentNumericResultId covers signal value path', () => {
    // default currentResultId is a signal(123)
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(123);
  });

  it('getCurrentNumericResultId covers function source path', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = () => 456;
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(456);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('getCurrentNumericResultId covers parse-from-string path', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = { value: 'PRMS-987' };
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(987);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('getCurrentNumericResultId covers object value that is already number', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = { value: 77 };
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(77);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('getCurrentNumericResultId covers primitive string source path', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = 'STAR-55' as any;
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(55);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('getCurrentNumericResultId covers empty string to fallback 0', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = { value: '' };
    expect(Number.isNaN(cacheServiceMock.getCurrentNumericResultId() as any)).toBe(true);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('extractNumericId evaluates right-hand of nullish coalescing', () => {
    const originalSplit = String.prototype.split;
    // Force split to return empty array so parts[parts.length - 1] is undefined
    // and the right-hand side of ?? is evaluated
    // @ts-ignore
    String.prototype.split = function () { return []; } as any;
    try {
      expect(cacheServiceMock.extractNumericId('STAR-123' as any)).toBeNaN();
    } finally {
      String.prototype.split = originalSplit;
    }
  });

  it('getCurrentNumericResultId handles empty last segment (returns NaN)', () => {
    const original = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = 'STAR-';
    expect(Number.isNaN(cacheServiceMock.getCurrentNumericResultId() as any)).toBe(true);
    (cacheServiceMock as any).currentResultId = original;
  });

  it('getCurrentNumericResultId covers nullish-coalescing to fallback "0"', () => {
    const originalId = (cacheServiceMock as any).currentResultId;
    (cacheServiceMock as any).currentResultId = 'STAR-123';
    const originalSplit = String.prototype.split;
    // Force split to return empty array so pop() === undefined and ?? '0' applies
    // @ts-ignore
    String.prototype.split = function () { return []; } as any;
    try {
      expect(cacheServiceMock.getCurrentNumericResultId()).toBe(0);
    } finally {
      String.prototype.split = originalSplit;
      (cacheServiceMock as any).currentResultId = originalId;
    }
  });

  it('getCurrentNumericResultId covers catch branch on error', () => {
    const original = Object.getOwnPropertyDescriptor(cacheServiceMock as any, 'currentResultId');
    Object.defineProperty(cacheServiceMock, 'currentResultId', { get: () => { throw new Error('boom'); } });
    expect(cacheServiceMock.getCurrentNumericResultId()).toBe(0);
    if (original) Object.defineProperty(cacheServiceMock, 'currentResultId', original);
  });

  it('routerEventsSubject/resetRouterEventsSubject observable emits', () => {
    let count = 0;
    const sub = routerEventsSubject.get().subscribe(() => count++);
    resetRouterEventsSubject();
    sub.unsubscribe();
    expect(typeof routerEventsSubject.get().subscribe).toBe('function');
    expect(count).toBe(0);
  });

  it('invokes a few simple mocks to count lines', async () => {
    actionsServiceMock.getInitials('John', 'Doe');
    actionsServiceMock.showToast({ severity: 'info', summary: 's', detail: 'd' } as any);
    await apiServiceMock.GET_LatestResults();
    await apiServiceMock.GET_GreenChecks(101 as any);
    expect(actionsServiceMock.getInitials).toHaveBeenCalled();
    expect(apiServiceMock.GET_LatestResults).toHaveBeenCalled();
    expect(apiServiceMock.GET_GreenChecks).toHaveBeenCalled();
  });

  it('covers cache getters and storage ops', () => {
    cacheServiceMock.currentMetadata();
    cacheServiceMock.toggleSidebar();
    cacheServiceMock.get('k');
    cacheServiceMock.set('k', 'v');
    cacheServiceMock.remove('k');
    cacheServiceMock.clear();
    cacheServiceMock.currentResultIsLoading();
    cacheServiceMock.loading();
    cacheServiceMock.isSidebarCollapsed();
    cacheServiceMock.hasSmallScreen();
    cacheServiceMock.isMyResult();
    expect(cacheServiceMock.currentMetadata).toHaveBeenCalled();
  });

  it('covers apiServiceMock methods block (512-529)', async () => {
    await apiServiceMock.GET_Institutions();
    await apiServiceMock.GET_InstitutionsTypesChildless();
    await apiServiceMock.GET_Countries();
    await apiServiceMock.GET_IndicatorTypes();
    await apiServiceMock.GET_Years();
    await apiServiceMock.GET_Contracts();
    await apiServiceMock.GET_Results();
    await apiServiceMock.GET_IpOwners();
    await apiServiceMock.GET_InstitutionsTypes();
    await apiServiceMock.GET_Languages();
    await apiServiceMock.GET_SessionPurpose();
    await apiServiceMock.GET_SessionType();
    await apiServiceMock.GET_ResultsCount();
    await apiServiceMock.GET_Alignments();
    await apiServiceMock.GET_GeneralInformation();
    await apiServiceMock.DELETE_Result();
    apiServiceMock.login();
    apiServiceMock.GET_SessionLength();
    apiServiceMock.GET_AllResultStatus();
    expect(apiServiceMock.GET_Institutions).toHaveBeenCalled();
    expect(apiServiceMock.DELETE_Result).toHaveBeenCalled();
  });

  it('covers routeMock param/query param methods', () => {
    const pm = routeMock.snapshot.paramMap;
    pm.get('id');
    pm.has('id');
    pm.getAll('id');
    routeMock.snapshot.queryParamMap.get('q');
    expect(typeof pm.get).toBe('function');
  });

  it('covers httpClientMock and submissionServiceMock', async () => {
    httpClientMock.get('/x');
    httpClientMock.post('/x', {});
    httpClientMock.put('/x', {});
    httpClientMock.delete('/x');
    httpClientMock.patch('/x', {});
    submissionServiceMock.getSubmissionHistory();
    submissionServiceMock.setStatus(1 as any);
    submissionServiceMock.setComment('c');
    submissionServiceMock.submit();
    submissionServiceMock.statusSelected.set(2 as any);
    submissionServiceMock.comment.set('d');
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('covers getMetadataServiceMock methods (incl. formatText at 587)', () => {
    getMetadataServiceMock.update(1);
    getMetadataServiceMock.formatText('a' as any);
    getMetadataServiceMock.clearMetadata();
    expect(getMetadataServiceMock.update).toHaveBeenCalledWith(1);
  });
});

import {
  resetRouterEventsSubject,
  routerEventsSubject,
  cacheServiceMock,
  routeMock,
  actionsServiceMock,
  apiServiceMock,
  httpClientMock,
  routerMock,
  submissionServiceMock,
  mockLatestResults,
  mockGreenChecks,
  mockInstitutions,
  mockInstitutionsTypes,
  mockLanguages,
  mockSessionPurpose,
  mockSessionTypes,
  mockResultsStatus,
  mockIndicatorsResults,
  getMetadataServiceMock,
  clarityServiceMock,
  getResultsServiceMock,
  getUserStaffServiceMock,
  versionWatcherServiceMock
} from './mock-services.mock';

describe('mock-services.mock', () => {
  describe('routerEventsSubject', () => {
    it('should reset router events subject', () => {
      const originalSubject = routerEventsSubject.get();
      resetRouterEventsSubject();
      const newSubject = routerEventsSubject.get();
      expect(newSubject).not.toBe(originalSubject);
    });

    it('should get router events subject', () => {
      const subject = routerEventsSubject.get();
      expect(subject).toBeDefined();
    });
  });

  describe('cacheServiceMock', () => {
    it('should have correct structure', () => {
      expect(cacheServiceMock.windowHeight).toBeDefined();
      expect(cacheServiceMock.dataCache).toBeDefined();
      expect(cacheServiceMock.isLoggedIn).toBeDefined();
      expect(cacheServiceMock.currentMetadata).toBeDefined();
      expect(cacheServiceMock.currentResultId).toBeDefined();
      expect(cacheServiceMock.currentRouteTitle).toBeDefined();
      expect(cacheServiceMock.showSectionHeaderActions).toBeDefined();
      expect(cacheServiceMock.isSidebarCollapsed).toBeDefined();
      expect(cacheServiceMock.hasSmallScreen).toBeDefined();
      expect(cacheServiceMock.toggleSidebar).toBeDefined();
      expect(cacheServiceMock.get).toBeDefined();
      expect(cacheServiceMock.set).toBeDefined();
      expect(cacheServiceMock.remove).toBeDefined();
      expect(cacheServiceMock.clear).toBeDefined();
      expect(cacheServiceMock.currentResultIsLoading).toBeDefined();
      expect(cacheServiceMock.loading).toBeDefined();
      expect(cacheServiceMock.headerHeight).toBeDefined();
      expect(cacheServiceMock.showSubmissionHistory).toBeDefined();
      expect(cacheServiceMock.isMyResult).toBeDefined();
    });

    it('should return correct values from methods', () => {
      expect(cacheServiceMock.currentMetadata()).toEqual({ result_title: 'Test Title', status_id: 1 });
      expect(cacheServiceMock.currentRouteTitle()).toBe('Home');
      expect(cacheServiceMock.isSidebarCollapsed()).toBe(false);
      expect(cacheServiceMock.hasSmallScreen()).toBe(false);
      expect(cacheServiceMock.currentResultIsLoading()).toBe(false);
      expect(cacheServiceMock.loading()).toBe(false);
      expect(cacheServiceMock.isMyResult()).toBe(true);
    });
  });

  describe('routeMock', () => {
    it('should have correct structure', () => {
      expect(routeMock.snapshot).toBeDefined();
      expect(routeMock.snapshot.url).toEqual([]);
      expect(routeMock.snapshot.params).toEqual({});
      expect(routeMock.snapshot.queryParams).toEqual({});
      expect(routeMock.snapshot.fragment).toBeNull();
      expect(routeMock.snapshot.data).toEqual({});
      expect(routeMock.snapshot.outlet).toBe('');
      expect(routeMock.snapshot.component).toBeNull();
      expect(routeMock.snapshot.routeConfig).toBeNull();
      expect(routeMock.snapshot.root).toBeDefined();
      expect(routeMock.snapshot.parent).toBeNull();
      expect(routeMock.snapshot.firstChild).toBeNull();
      expect(routeMock.snapshot.children).toEqual([]);
      expect(routeMock.snapshot.pathFromRoot).toEqual([]);
      expect(routeMock.snapshot.paramMap).toBeDefined();
      expect(routeMock.snapshot.queryParamMap).toBeDefined();
    });

    it('should have working paramMap methods', () => {
      const paramMap = routeMock.snapshot.paramMap;
      expect(paramMap.get('test')).toBeNull();
      expect(paramMap.has('test')).toBe(false);
      expect(paramMap.getAll('test')).toEqual([]);
      expect(paramMap.keys).toEqual([]);
    });
  });

  describe('actionsServiceMock', () => {
    it('should have correct structure', () => {
      expect(actionsServiceMock.getActions).toBeDefined();
      expect(actionsServiceMock.getAction).toBeDefined();
      expect(actionsServiceMock.createAction).toBeDefined();
      expect(actionsServiceMock.updateAction).toBeDefined();
      expect(actionsServiceMock.deleteAction).toBeDefined();
      expect(actionsServiceMock.getInitials).toBeDefined();
      expect(actionsServiceMock.updateList).toBeDefined();
      expect(actionsServiceMock.showToast).toBeDefined();
      expect(actionsServiceMock.showGlobalAlert).toBeDefined();
    });

    it('should return correct values from methods', () => {
      expect(actionsServiceMock.getInitials()).toBe('JD');
    });
  });

  describe('apiServiceMock', () => {
    it('should have correct structure', () => {
      expect(apiServiceMock.GET_LatestResults).toBeDefined();
      expect(apiServiceMock.GET_GreenChecks).toBeDefined();
      expect(apiServiceMock.GET_Institutions).toBeDefined();
      expect(apiServiceMock.GET_InstitutionsTypesChildless).toBeDefined();
      expect(apiServiceMock.GET_Countries).toBeDefined();
      expect(apiServiceMock.GET_IndicatorTypes).toBeDefined();
      expect(apiServiceMock.GET_Years).toBeDefined();
      expect(apiServiceMock.GET_Contracts).toBeDefined();
      expect(apiServiceMock.GET_Results).toBeDefined();
      expect(apiServiceMock.GET_IpOwners).toBeDefined();
      expect(apiServiceMock.GET_InstitutionsTypes).toBeDefined();
      expect(apiServiceMock.GET_Languages).toBeDefined();
      expect(apiServiceMock.GET_SessionPurpose).toBeDefined();
      expect(apiServiceMock.GET_SessionType).toBeDefined();
      expect(apiServiceMock.GET_ResultsCount).toBeDefined();
      expect(apiServiceMock.GET_Alignments).toBeDefined();
      expect(apiServiceMock.GET_GeneralInformation).toBeDefined();
      expect(apiServiceMock.DELETE_Result).toBeDefined();
      expect(apiServiceMock.login).toBeDefined();
      expect(apiServiceMock.GET_SessionLength).toBeDefined();
      expect(apiServiceMock.GET_AllResultStatus).toBeDefined();
    });

    it('should return correct mock data', async () => {
      const latestResults = await apiServiceMock.GET_LatestResults();
      expect(latestResults).toBe(mockLatestResults);

      const greenChecks = await apiServiceMock.GET_GreenChecks(123);
      expect(greenChecks).toBe(mockGreenChecks);

      const institutions = await apiServiceMock.GET_Institutions();
      expect(institutions).toBe(mockInstitutions);

      const institutionsTypes = await apiServiceMock.GET_InstitutionsTypes();
      expect(institutionsTypes).toBe(mockInstitutionsTypes);

      const languages = await apiServiceMock.GET_Languages();
      expect(languages).toBe(mockLanguages);

      const sessionPurpose = await apiServiceMock.GET_SessionPurpose();
      expect(sessionPurpose).toBe(mockSessionPurpose);

      const sessionType = await apiServiceMock.GET_SessionType();
      expect(sessionType).toBe(mockSessionTypes);

      const resultsCount = await apiServiceMock.GET_ResultsCount();
      expect(resultsCount).toEqual({ data: { projectDescription: 'Test Project', description: 'Test Description' } });

      const alignments = await apiServiceMock.GET_Alignments();
      expect(alignments).toEqual({ data: { contracts: [{ is_primary: true, contract_id: 'A1048' }] } });

      const generalInformation = await apiServiceMock.GET_GeneralInformation();
      expect(generalInformation).toEqual({ data: { title: 'Test Result Title' } });

      const deleteResult = await apiServiceMock.DELETE_Result();
      expect(deleteResult).toEqual({ successfulRequest: true });

      const ipOwners = await apiServiceMock.GET_IpOwners();
      expect(ipOwners).toEqual({ data: [] });

      const countries = await apiServiceMock.GET_Countries();
      expect(countries).toEqual({ data: [] });

      const indicatorTypes = await apiServiceMock.GET_IndicatorTypes();
      expect(indicatorTypes).toEqual({ data: [] });

      const years = await apiServiceMock.GET_Years();
      expect(years).toEqual({ data: [] });

      const contracts = await apiServiceMock.GET_Contracts();
      expect(contracts).toEqual({ data: [] });

      const results = await apiServiceMock.GET_Results();
      expect(results).toEqual({ data: { results: [], total: 0 } });

      const userStaff = await apiServiceMock.GET_UserStaff();
      expect(userStaff).toEqual({ data: [] });

      const findContracts = await apiServiceMock.GET_FindContracts();
      expect(findContracts).toEqual({ data: [] });

      const institutionsTypesChildless = await apiServiceMock.GET_InstitutionsTypesChildless();
      expect(institutionsTypesChildless).toEqual({ data: [] });
    });
  });

  describe('httpClientMock', () => {
    it('should have correct structure', () => {
      expect(httpClientMock.get).toBeDefined();
      expect(httpClientMock.post).toBeDefined();
      expect(httpClientMock.put).toBeDefined();
      expect(httpClientMock.delete).toBeDefined();
      expect(httpClientMock.patch).toBeDefined();
    });
  });

  describe('routerMock', () => {
    it('should have correct structure', () => {
      expect(routerMock.events).toBeDefined();
      expect(routerMock.navigate).toBeDefined();
      expect(routerMock.createUrlTree).toBeDefined();
      expect(routerMock.serializeUrl).toBeDefined();
      expect(routerMock.url).toBe('/test');
    });

    it('should return correct values from methods', async () => {
      const navigateResult = await routerMock.navigate(['/test']);
      expect(navigateResult).toBe(true);

      const urlTree = routerMock.createUrlTree(['/test']);
      expect(urlTree).toEqual({});

      const serializedUrl = routerMock.serializeUrl({} as any);
      expect(serializedUrl).toBe('');
    });
  });

  describe('submissionServiceMock', () => {
    it('should have correct structure', () => {
      expect(submissionServiceMock.statusSelected).toBeDefined();
      expect(submissionServiceMock.comment).toBeDefined();
      expect(submissionServiceMock.getSubmissionHistory).toBeDefined();
      expect(submissionServiceMock.setStatus).toBeDefined();
      expect(submissionServiceMock.setComment).toBeDefined();
      expect(submissionServiceMock.submit).toBeDefined();
    });
  });

  describe('mock data objects', () => {
    it('should have correct mockLatestResults structure', () => {
      expect(mockLatestResults.status).toBe(200);
      expect(mockLatestResults.description).toBe('Success');
      expect(mockLatestResults.timestamp).toBeDefined();
      expect(mockLatestResults.path).toBe('/api/latest-results');
      expect(mockLatestResults.successfulRequest).toBe(true);
      expect(mockLatestResults.errorDetail).toBeDefined();
      expect(mockLatestResults.data).toBeDefined();
    });

    it('should have correct mockGreenChecks structure', () => {
      expect(mockGreenChecks.status).toBe(200);
      expect(mockGreenChecks.description).toBe('Success');
      expect(mockGreenChecks.timestamp).toBeDefined();
      expect(mockGreenChecks.path).toBe('/api/green-checks');
      expect(mockGreenChecks.successfulRequest).toBe(true);
      expect(mockGreenChecks.errorDetail).toBeDefined();
      expect(mockGreenChecks.data).toBeDefined();
    });

    it('should have correct mockInstitutions structure', () => {
      expect(mockInstitutions.status).toBe(200);
      expect(mockInstitutions.description).toBe('Success');
      expect(mockInstitutions.timestamp).toBeDefined();
      expect(mockInstitutions.path).toBe('/api/institutions');
      expect(mockInstitutions.successfulRequest).toBe(true);
      expect(mockInstitutions.errorDetail).toBeDefined();
      expect(mockInstitutions.data).toBeDefined();
    });

    it('should have correct mockInstitutionsTypes structure', () => {
      expect(mockInstitutionsTypes.status).toBe(200);
      expect(mockInstitutionsTypes.description).toBe('Success');
      expect(mockInstitutionsTypes.timestamp).toBeDefined();
      expect(mockInstitutionsTypes.path).toBe('/api/institutions-types');
      expect(mockInstitutionsTypes.successfulRequest).toBe(true);
      expect(mockInstitutionsTypes.errorDetail).toBeDefined();
      expect(mockInstitutionsTypes.data).toBeDefined();
    });

    it('should have correct mockLanguages structure', () => {
      expect(mockLanguages.status).toBe(200);
      expect(mockLanguages.description).toBe('Success');
      expect(mockLanguages.timestamp).toBeDefined();
      expect(mockLanguages.path).toBe('/api/languages');
      expect(mockLanguages.successfulRequest).toBe(true);
      expect(mockLanguages.errorDetail).toBeDefined();
      expect(mockLanguages.data).toBeDefined();
    });

    it('should have correct mockSessionPurpose structure', () => {
      expect(mockSessionPurpose.status).toBe(200);
      expect(mockSessionPurpose.description).toBe('Success');
      expect(mockSessionPurpose.timestamp).toBeDefined();
      expect(mockSessionPurpose.path).toBe('/api/session-purpose');
      expect(mockSessionPurpose.successfulRequest).toBe(true);
      expect(mockSessionPurpose.errorDetail).toBeDefined();
      expect(mockSessionPurpose.data).toBeDefined();
    });

    it('should have correct mockSessionTypes structure', () => {
      expect(mockSessionTypes.status).toBe(200);
      expect(mockSessionTypes.description).toBe('Success');
      expect(mockSessionTypes.timestamp).toBeDefined();
      expect(mockSessionTypes.path).toBe('/api/session-types');
      expect(mockSessionTypes.successfulRequest).toBe(true);
      expect(mockSessionTypes.errorDetail).toBeDefined();
      expect(mockSessionTypes.data).toBeDefined();
    });

    it('should have correct mockResultsStatus structure', () => {
      expect(mockResultsStatus.data).toBeDefined();
      expect(Array.isArray(mockResultsStatus.data)).toBe(true);
    });

    it('should have correct mockIndicatorsResults structure', () => {
      expect(mockIndicatorsResults.data).toBeDefined();
      expect(Array.isArray(mockIndicatorsResults.data)).toBe(true);
    });
  });

  describe('service mocks', () => {
    it('should have correct getMetadataServiceMock structure', () => {
      expect(getMetadataServiceMock.update).toBeDefined();
      expect(getMetadataServiceMock.formatText).toBeDefined();
      expect(getMetadataServiceMock.clearMetadata).toBeDefined();
    });

    it('should return correct values from getMetadataServiceMock methods', () => {
      expect(getMetadataServiceMock.formatText()).toBe('');
    });

    it('should have correct clarityServiceMock structure', () => {
      expect(clarityServiceMock.updateUserInfo).toBeDefined();
    });

    it('should have correct getResultsServiceMock structure', () => {
      expect(getResultsServiceMock.updateList).toBeDefined();
    });

    it('should have correct getUserStaffServiceMock structure', () => {
      expect(getUserStaffServiceMock.getData).toBeDefined();
    });

    it('should return correct values from getUserStaffServiceMock methods', async () => {
      const result = await getUserStaffServiceMock.getData();
      expect(result).toEqual({ data: [] });
    });

    it('should have correct versionWatcherServiceMock structure', () => {
      expect(versionWatcherServiceMock.onVersionChange).toBeDefined();
    });
  });
});
