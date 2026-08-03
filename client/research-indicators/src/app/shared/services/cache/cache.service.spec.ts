function withLocalStorage(map: Record<string, string | null>): void {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(map)) {
    if (v !== null) store.set(k, v);
  }
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(((key: string) => (store.has(key) ? store.get(key)! : null)) as any);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    store.set(key, value);
  });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
    store.delete(key);
  });
}

describe('CacheService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes dataCache from valid JSON and showMetadataPanel from LS', () => {
    withLocalStorage({ data: JSON.stringify({ user: { sec_user_id: 9 } }), showMetadataPanel: 'true', isSidebarCollapsed: 'false' });
    const service = TestBed.inject(CacheService);
    expect(service.dataCache().user.sec_user_id).toBe(9);
    expect(service.showMetadataPanel()).toBe(true);
    expect(service.isSidebarCollapsed()).toBe(false);
  });

  it('falls back to empty object when JSON invalid', () => {
    withLocalStorage({ data: '}{', isSidebarCollapsed: 'true' });
    const service = TestBed.inject(CacheService);
    expect(service.dataCache()).toEqual({});
    expect(service.isSidebarCollapsed()).toBe(true);
  });

  it('currentResultIndicatorSectionPath covers all branches', () => {
    const service = TestBed.inject(CacheService);
    service.currentMetadata.set({ indicator_id: 1 } as any);
    expect(service.currentResultIndicatorSectionPath()).toBe('capacity-sharing');
    service.currentMetadata.set({ indicator_id: 2 } as any);
    expect(service.currentResultIndicatorSectionPath()).toBe('innovation-details');
    service.currentMetadata.set({ indicator_id: 4 } as any);
    expect(service.currentResultIndicatorSectionPath()).toBe('policy-change');
    service.currentMetadata.set({ indicator_id: 5 } as any);
    expect(service.currentResultIndicatorSectionPath()).toBe('oicr-details');
    service.currentMetadata.set({ indicator_id: 999 } as any);
    expect(service.currentResultIndicatorSectionPath()).toBe('');
  });

  it('setCurrentResultId and getCurrentNumericResultId work for strings and numbers', () => {
    const service = TestBed.inject(CacheService);
    service.setCurrentResultId('STAR-2879');
    expect(service.getCurrentNumericResultId()).toBe(2879);
    service.setCurrentResultId(321);
    expect(service.getCurrentNumericResultId()).toBe(321);
  });

  it('getCurrentPlatformCode extracts platform code correctly', () => {
    const service = TestBed.inject(CacheService);
    
    // Test with STAR platform
    service.setCurrentResultId('STAR-2879');
    expect(service.getCurrentPlatformCode()).toBe('STAR');
    
    // Test with TIP platform
    service.setCurrentResultId('TIP-2863');
    expect(service.getCurrentPlatformCode()).toBe('TIP');
    
    // Test with numeric ID (no platform code)
    service.setCurrentResultId(321);
    expect(service.getCurrentPlatformCode()).toBe('');
    
    // Test with string without hyphen
    service.setCurrentResultId('12345');
    expect(service.getCurrentPlatformCode()).toBe('');
  });

  it('extractNumericId covers hyphen and plain numeric string', () => {
    const service = TestBed.inject(CacheService);
    expect(service.extractNumericId('TIP-2863')).toBe(2863);
    expect(service.extractNumericId('4042')).toBe(4042);
    expect(service.extractNumericId(77)).toBe(77);
  });

  it('allGreenChecksAreTrue and isMyResult computed branches', () => {
    const service = TestBed.inject(CacheService);
    service.greenChecks.set({ a: true, b: true } as any);
    expect(service.allGreenChecksAreTrue()).toBe(true);
    service.greenChecks.set({ a: true, b: false } as any);
    expect(service.allGreenChecksAreTrue()).toBe(false);

    service.dataCache.set({ user: { sec_user_id: 5 } } as any);
    service.currentMetadata.set({ created_by: 5 } as any);
    expect(service.isMyResult()).toBe(true);
    service.currentMetadata.set({ created_by: 6 } as any);
    expect(service.isMyResult()).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';

import { CacheService } from '@services/cache/cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        }
      },
      writable: true
    });

    // Mock window.innerWidth and innerHeight
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.isValidatingToken()).toBe(false);
    expect(service.showMetadataPanel()).toBe(false);
    expect(service.currentSectionHeaderName()).toBe('');
    expect(service.currentResultId()).toBe(0);
    expect(service.currentResultIsLoading()).toBe(false);
    expect(service.currentUrlPath()).toBe('');
    expect(service.currentMetadata()).toEqual({});
    expect(service.greenChecks()).toEqual({});
    expect(service.currentRouteTitle()).toBe('');
    expect(service.showSectionHeaderActions()).toBe(false);
    expect(service.lastResultId()).toBe(null);
    expect(service.lastVersionParam()).toBe(null);
    expect(service.versionsList()).toEqual([]);
    expect(service.liveVersionData()).toBe(null);
    expect(service.loadingCurrentResult()).toBe(false);
    expect(service.navbarHeight()).toBe(0);
    expect(service.headerHeight()).toBe(0);
    expect(service.tableFiltersSidebarHeight()).toBe(0);
    expect(service.windowWidth()).toBe(1024);
    expect(service.windowHeight()).toBe(768);
    expect(service.showSubmissionHistory()).toBe(false);
    expect(service.searchAResultValue()).toBe('');
    expect(service.isSidebarCollapsed()).toBe(true);
  });

  it('should initialize dataCache from localStorage when data exists', () => {
    const mockData = {
      access_token: 'token',
      refresh_token: 'refresh',
      user: {
        is_active: true,
        sec_user_id: 123,
        first_name: 'John',
        last_name: 'Doe',
        roleName: 'User',
        email: 'john@example.com',
        status_id: 1,
        user_role_list: []
      },
      exp: 1234567890
    };
    mockLocalStorage['data'] = JSON.stringify(mockData);

    // Recreate service to test localStorage initialization
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(CacheService);

    expect(newService.dataCache()).toEqual(mockData);
  });

  it('should initialize dataCache as empty object when no localStorage data', () => {
    expect(service.dataCache()).toEqual({});
  });

  it('should initialize dataCache as empty object when localStorage data is null', () => {
    const mockLocalStorageNull: { [key: string]: string } = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => (key === 'data' ? null : mockLocalStorageNull[key] || null),
        setItem: (key: string, value: string) => {
          mockLocalStorageNull[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorageNull[key];
        }
      },
      writable: true
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(CacheService);

    expect(newService.dataCache()).toEqual({});
  });

  it('should initialize dataCache as empty object when localStorage data is invalid JSON', () => {
    mockLocalStorage['data'] = 'invalid json';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(CacheService);

    expect(newService.dataCache()).toEqual({});
  });

  it('should initialize showMetadataPanel from localStorage', () => {
    mockLocalStorage['showMetadataPanel'] = 'true';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(CacheService);

    expect(newService.showMetadataPanel()).toBe(true);
  });

  it('should initialize isSidebarCollapsed from localStorage', () => {
    mockLocalStorage['isSidebarCollapsed'] = 'false';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(CacheService);

    expect(newService.isSidebarCollapsed()).toBe(false);
  });

  it('should set current section header name', () => {
    service.setCurrentSectionHeaderName('Test Header');
    expect(service.currentSectionHeaderName()).toBe('Test Header');
  });

  it('should toggle sidebar', () => {
    const initialValue = service.isSidebarCollapsed();
    service.toggleSidebar();
    expect(service.isSidebarCollapsed()).toBe(!initialValue);
    expect(mockLocalStorage['isSidebarCollapsed']).toBe(service.isSidebarCollapsed().toString());
  });

  it('should collapse sidebar', () => {
    service.collapseSidebar();
    expect(service.isSidebarCollapsed()).toBe(true);
    expect(mockLocalStorage['isSidebarCollapsed']).toBe('true');
  });

  it('should compute allGreenChecksAreTrue correctly', () => {
    // Test when all checks are true
    service.greenChecks.set({
      general_information: 1,
      alignment: 1,
      geo_location: 1
    });
    expect(service.allGreenChecksAreTrue()).toBe(true);

    // Test when some checks are false
    service.greenChecks.set({
      general_information: 1,
      alignment: 0,
      geo_location: 1
    });
    expect(service.allGreenChecksAreTrue()).toBe(false);

    // Test when all checks are false
    service.greenChecks.set({
      general_information: 0,
      alignment: 0,
      geo_location: 0
    });
    expect(service.allGreenChecksAreTrue()).toBe(false);

    // Test with empty object
    service.greenChecks.set({});
    expect(service.allGreenChecksAreTrue()).toBe(true);
  });

  it('should compute isMyResult correctly', () => {
    // Test when created_by matches user id
    service.dataCache.set({
      access_token: 'token',
      refresh_token: 'refresh',
      user: {
        is_active: true,
        sec_user_id: 123,
        first_name: 'John',
        last_name: 'Doe',
        roleName: 'User',
        email: 'john@example.com',
        status_id: 1,
        user_role_list: []
      },
      exp: 1234567890
    });
    service.currentMetadata.set({ created_by: '123' });
    expect(service.isMyResult()).toBe(true);

    // Test when created_by does not match user id
    service.currentMetadata.set({ created_by: '456' });
    expect(service.isMyResult()).toBe(false);

    // Test with no user data
    service.dataCache.set({
      access_token: '',
      refresh_token: '',
      user: {} as any,
      exp: 0
    });
    expect(service.isMyResult()).toBe(false);
  });

  it('should compute hasSmallScreen correctly', () => {
    // Test with large screen
    service.windowHeight.set(1024);
    expect(service.hasSmallScreen()).toBe(false);

    // Test with small screen
    service.windowHeight.set(600);
    expect(service.hasSmallScreen()).toBe(true);

    // Test with exactly 768
    service.windowHeight.set(768);
    expect(service.hasSmallScreen()).toBe(false);
  });

  it('should compute currentResultIndicatorSectionPath correctly', () => {
    // Test indicator_id = 1
    service.currentMetadata.set({ indicator_id: 1 });
    expect(service.currentResultIndicatorSectionPath()).toBe('capacity-sharing');

    // Test indicator_id = 2
    service.currentMetadata.set({ indicator_id: 2 });
    expect(service.currentResultIndicatorSectionPath()).toBe('innovation-details');

    // Test indicator_id = 4
    service.currentMetadata.set({ indicator_id: 4 });
    expect(service.currentResultIndicatorSectionPath()).toBe('policy-change');

    // Test other indicator_id
    service.currentMetadata.set({ indicator_id: 3 });
    expect(service.currentResultIndicatorSectionPath()).toBe('');

    // Test with no indicator_id
    service.currentMetadata.set({});
    expect(service.currentResultIndicatorSectionPath()).toBe('');
  });

  it('should update signals correctly', () => {
    // Test various signal updates
    service.isLoggedIn.set(true);
    expect(service.isLoggedIn()).toBe(true);

    service.isValidatingToken.set(true);
    expect(service.isValidatingToken()).toBe(true);

    service.currentResultId.set(123);
    expect(service.currentResultId()).toBe(123);

    service.currentResultIsLoading.set(true);
    expect(service.currentResultIsLoading()).toBe(true);

    service.currentUrlPath.set('/test/path');
    expect(service.currentUrlPath()).toBe('/test/path');

    const mockMetadata = {
      indicator_id: 1,
      indicator_name: 'Test Indicator',
      result_id: 123,
      result_official_code: 456,
      status_id: 1,
      status_name: 'Active',
      result_title: 'Test Result',
      created_by: '123',
      is_principal_investigator: true
    };
    service.currentMetadata.set(mockMetadata);
    expect(service.currentMetadata()).toEqual(mockMetadata);

    const mockGreenChecks = {
      general_information: 1,
      alignment: 0
    };
    service.greenChecks.set(mockGreenChecks);
    expect(service.greenChecks()).toEqual(mockGreenChecks);

    service.currentRouteTitle.set('Test Title');
    expect(service.currentRouteTitle()).toBe('Test Title');

    service.showSectionHeaderActions.set(true);
    expect(service.showSectionHeaderActions()).toBe(true);

    service.lastResultId.set(456);
    expect(service.lastResultId()).toBe(456);

    service.lastVersionParam.set('v1.0');
    expect(service.lastVersionParam()).toBe('v1.0');

    const mockVersions = [
      {
        report_year_id: 1,
        result_id: 123,
        result_official_code: 456,
        result_status_id: 1
      }
    ];
    service.versionsList.set(mockVersions);
    expect(service.versionsList()).toEqual(mockVersions);

    const mockLiveVersion = {
      report_year_id: 1,
      result_id: 123,
      result_official_code: 456,
      result_status_id: 1
    };
    service.liveVersionData.set(mockLiveVersion);
    expect(service.liveVersionData()).toEqual(mockLiveVersion);

    service.loadingCurrentResult.set(true);
    expect(service.loadingCurrentResult()).toBe(true);

    service.navbarHeight.set(60);
    expect(service.navbarHeight()).toBe(60);

    service.headerHeight.set(80);
    expect(service.headerHeight()).toBe(80);

    service.tableFiltersSidebarHeight.set(200);
    expect(service.tableFiltersSidebarHeight()).toBe(200);

    service.windowWidth.set(1200);
    expect(service.windowWidth()).toBe(1200);

    service.windowHeight.set(900);
    expect(service.windowHeight()).toBe(900);

    service.showSubmissionHistory.set(true);
    expect(service.showSubmissionHistory()).toBe(true);

    service.searchAResultValue.set('test search');
    expect(service.searchAResultValue()).toBe('test search');
  });
});
