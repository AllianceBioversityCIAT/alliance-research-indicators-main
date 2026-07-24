// src/app/testing/mock-services.ts
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { HttpClient } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SubmissionService } from '@shared/services/submission.service';
import { ActivatedRouteSnapshot, NavigationEnd, ParamMap } from '@angular/router';

let _routerEventsSubject = new Subject<NavigationEnd>();
export function resetRouterEventsSubject() {
  _routerEventsSubject = new Subject<NavigationEnd>();
}
export const routerEventsSubject = {
  get: () => _routerEventsSubject
};

export const cacheServiceMock = {
  windowHeight: signal(0),
  dataCache: signal({
    access_token: 'dummy_token',
    refresh_token: 'dummy_refresh_token',
    user: {
      sec_user_id: 1,
      is_active: true,
      first_name: 'John',
      last_name: 'Doe',
      roleName: 'Admin',
      email: 'john.doe@example.com',
      status_id: 1,
      user_role_list: [
        {
          is_active: true,
          user_id: 1,
          role_id: 1,
          role: {
            is_active: true,
            justification_update: null,
            sec_role_id: 1,
            name: 'Admin',
            focus_id: 0
          }
        }
      ]
    },
    exp: 3600
  }),
  isLoggedIn: signal<boolean>(false),
  currentMetadata: jest.fn(() => ({ result_title: 'Test Title', status_id: 1 })),
  currentResultId: signal(123),
  currentRouteTitle: jest.fn().mockReturnValue('Home'),
  showSectionHeaderActions: signal(false),
  isSidebarCollapsed: jest.fn().mockReturnValue(false),
  hasSmallScreen: jest.fn().mockReturnValue(false),
  toggleSidebar: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
  currentResultIsLoading: jest.fn().mockReturnValue(false),
  loading: jest.fn().mockReturnValue(false),
  headerHeight: signal(0),
  navbarHeight: signal(0),
  showSubmissionHistory: signal(false),
  isMyResult: jest.fn().mockReturnValue(true),
  extractNumericId: jest.fn((id: string | number) => {
    if (typeof id === 'number') return id;
    const parts = String(id).split('-');
    const last = parts[parts.length - 1] ?? String(id);
    return parseInt(last, 10);
  }),
  getCurrentNumericResultId: jest.fn(function (this: { currentResultId: unknown }) {
    try {
      const source = this.currentResultId;
      let value: unknown;
      if (typeof source === 'function') {
        value = (source as () => unknown)();
      } else if (typeof source === 'object' && source !== null && 'value' in (source as Record<string, unknown>)) {
        value = (source as { value: unknown }).value;
      } else {
        value = source;
      }
      return typeof value === 'number' ? value : parseInt(String(value).split('-').pop() ?? '0', 10);
    } catch {
      return 0;
    }
  })
} as unknown as CacheService;

const paramMapMock: ParamMap = {
  get: jest.fn().mockReturnValue(null),
  has: jest.fn().mockReturnValue(false),
  getAll: jest.fn().mockReturnValue([]),
  keys: []
};

export const routeMock = {
  snapshot: {
    url: [],
    params: {},
    queryParams: {},
    fragment: null,
    data: {},
    outlet: '',
    component: null,
    routeConfig: null,
    root: {} as Partial<ActivatedRouteSnapshot>,
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    paramMap: paramMapMock,
    queryParamMap: paramMapMock
  } as Partial<ActivatedRouteSnapshot>
};

export const actionsServiceMock = {
  getActions: jest.fn(),
  getAction: jest.fn(),
  createAction: jest.fn(),
  updateAction: jest.fn(),
  deleteAction: jest.fn(),
  getInitials: jest.fn().mockReturnValue('JD'),
  updateList: jest.fn(),
  showToast: jest.fn(),
  showGlobalAlert: jest.fn()
} as unknown as ActionsService;

export const mockLatestResults = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/latest-results',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      updated_at: new Date(),
      is_active: true,
      result_id: 1,
      result_official_code: 101,
      platform_code: 'STAR',
      title: 'Test Result 1',
      description: null,
      indicator_id: 1,
      result_status: {
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        is_active: true,
        result_status_id: 1,
        name: 'Active',
        description: 'Active status'
      },
      result_contracts: {
        is_active: true,
        result_contract_id: 1,
        result_id: 1,
        contract_id: 'C001',
        contract_role_id: 1,
        is_primary: true,
        agresso_contract: {
          is_active: true,
          agreement_id: 'A001',
          contract_status: 'Active',
          description: 'Test Contract',
          division: null,
          donor: 'Test Donor',
          donor_reference: 'DR001',
          endDateGlobal: new Date(),
          endDatefinance: new Date(),
          end_date: new Date(),
          entity: 'Test Entity',
          extension_date: new Date(),
          funding_type: 'Test Funding',
          project: 'Test Project',
          projectDescription: 'Test Description',
          project_lead_description: 'Test Lead',
          short_title: 'Test Title',
          start_date: new Date(),
          ubwClientDescription: 'Test Client',
          unit: null,
          office: null
        }
      },
      indicator: {
        is_active: true,
        indicator_id: 1,
        name: 'Test Indicator',
        other_names: null,
        description: 'Test Description',
        long_description: 'Test Long Description',
        indicator_type_id: 1,
        icon_src: 'test-icon'
      }
    },
    {
      updated_at: new Date(),
      is_active: true,
      result_id: 2,
      result_official_code: 102,
      platform_code: 'STAR',
      title: 'Test Result 2',
      description: null,
      indicator_id: 1,
      result_status: {
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        is_active: true,
        result_status_id: 1,
        name: 'Active',
        description: 'Active status'
      },
      result_contracts: {
        is_active: true,
        result_contract_id: 2,
        result_id: 2,
        contract_id: 'C002',
        contract_role_id: 1,
        is_primary: true,
        agresso_contract: {
          is_active: true,
          agreement_id: 'A002',
          contract_status: 'Active',
          description: 'Test Contract 2',
          division: null,
          donor: 'Test Donor 2',
          donor_reference: 'DR002',
          endDateGlobal: new Date(),
          endDatefinance: new Date(),
          end_date: new Date(),
          entity: 'Test Entity 2',
          extension_date: new Date(),
          funding_type: 'Test Funding 2',
          project: 'Test Project 2',
          projectDescription: 'Test Description 2',
          project_lead_description: 'Test Lead 2',
          short_title: 'Test Title 2',
          start_date: new Date(),
          ubwClientDescription: 'Test Client 2',
          unit: null,
          office: null
        }
      },
      indicator: {
        is_active: true,
        indicator_id: 1,
        name: 'Test Indicator',
        other_names: null,
        description: 'Test Description',
        long_description: 'Test Long Description',
        indicator_type_id: 1,
        icon_src: 'test-icon'
      }
    }
  ]
};

export const mockGreenChecks = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/green-checks',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: {
    general_information: 1,
    alignment: 1,
    cap_sharing_ip: 1,
    policy_change: 0,
    partners: 1,
    geo_location: 1,
    evidences: 0
  }
};

export const mockInstitutions = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/institutions',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      description: 'Test Institution 1',
      code: 1,
      acronym: 'TI1',
      name: 'Test Institution 1',
      is_active: true,
      websiteLink: 'https://test1.com',
      added: '2024-01-01',
      institution_type_id: 1,
      institution_locations: [
        {
          code: 1,
          name: 'Test Location 1',
          institution_id: 1,
          isoAlpha2: 'US',
          isHeadquarter: true
        }
      ],
      institution_type: {
        is_active: true,
        code: 1,
        name: 'Test Type',
        description: 'Test Type Description',
        parent_code: null
      },
      disabled: false
    },
    {
      description: 'Test Institution 2',
      code: 2,
      acronym: null,
      name: 'Test Institution 2',
      is_active: true,
      websiteLink: 'https://test2.com',
      added: '2024-01-02',
      institution_type_id: 1,
      institution_locations: [
        {
          code: 2,
          name: 'Test Location 2',
          institution_id: 2,
          isoAlpha2: 'CA',
          isHeadquarter: false
        }
      ],
      institution_type: {
        is_active: true,
        code: 1,
        name: 'Test Type',
        description: 'Test Type Description',
        parent_code: null
      },
      disabled: false
    }
  ]
};

export const mockResults = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/results',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: {
    results: [
      {
        is_active: true,
        result_id: 1,
        result_official_code: 'R001',
        version_id: null,
        title: 'Innovación 1',
        description: 'Desc 1',
        indicator_id: 2,
        geo_scope_id: null
      },
      {
        is_active: false,
        result_id: 2,
        result_official_code: 'R002',
        version_id: null,
        title: 'Innovación 2',
        description: null,
        indicator_id: 2,
        geo_scope_id: null
      }
    ],
    total: 2
  }
};

export const mockInstitutionsTypes = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/institutions-types',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      code: 1,
      created_at: '2024-01-01',
      description: 'Tipo 1',
      is_active: true,
      name: 'Institución Tipo 1',
      parent_code: null,
      updated_at: '2024-01-02'
    },
    {
      code: 2,
      created_at: '2024-01-03',
      description: null,
      is_active: false,
      name: 'Institución Tipo 2',
      parent_code: '1',
      updated_at: '2024-01-04'
    }
  ]
};

export const mockLanguages = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/languages',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      is_active: true,
      id: 1,
      name: 'English',
      iso_alpha_2: 'en',
      iso_alpha_3: 'eng'
    },
    {
      is_active: true,
      id: 2,
      name: 'Spanish',
      iso_alpha_2: 'es',
      iso_alpha_3: 'spa'
    },
    {
      is_active: false,
      id: 3,
      name: null,
      iso_alpha_2: null,
      iso_alpha_3: 'fra'
    }
  ]
};

export const mockSessionPurpose = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/session-purpose',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      is_active: true,
      session_purpose_id: 1,
      name: 'Purpose 1'
    },
    {
      is_active: true,
      session_purpose_id: 2,
      name: 'Purpose 2'
    },
    {
      is_active: false,
      session_purpose_id: 3,
      name: 'Purpose 3'
    }
  ]
};

export const mockSessionTypes = {
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/session-types',
  successfulRequest: true,
  errorDetail: {
    errors: '',
    detail: '',
    description: ''
  },
  data: [
    {
      session_type_id: 1,
      name: 'Type 1',
      is_active: true
    },
    {
      session_type_id: 2,
      name: 'Type 2',
      is_active: false
    },
    {
      session_type_id: 3,
      name: 'Type 3',
      is_active: true
    }
  ]
};

export const apiServiceMock = {
  GET_LatestResults: jest.fn().mockImplementation(() => Promise.resolve(mockLatestResults)),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GET_GreenChecks: jest.fn().mockImplementation((_resultCode: number) => Promise.resolve(mockGreenChecks)),
  GET_Institutions: jest.fn().mockImplementation(() => Promise.resolve(mockInstitutions)),
  GET_InstitutionsTypesChildless: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_Countries: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_IndicatorTypes: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_Years: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_Contracts: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_Results: jest.fn().mockImplementation(() => Promise.resolve({ data: { results: [], total: 0 } })),
  GET_IpOwners: jest.fn().mockResolvedValue({ data: [] }),
  GET_InstitutionsTypes: jest.fn().mockImplementation(() => Promise.resolve(mockInstitutionsTypes)),
  GET_Languages: jest.fn().mockImplementation(() => Promise.resolve(mockLanguages)),
  GET_SessionPurpose: jest.fn().mockImplementation(() => Promise.resolve(mockSessionPurpose)),
  GET_SessionType: jest.fn().mockImplementation(() => Promise.resolve(mockSessionTypes)),
  GET_ResultsCount: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ data: { projectDescription: 'Test Project', description: 'Test Description' } })),
  GET_Alignments: jest.fn().mockImplementation(() => Promise.resolve({ data: { contracts: [{ is_primary: true, contract_id: 'A1048' }] } })),
  GET_GeneralInformation: jest.fn().mockImplementation(() => Promise.resolve({ data: { title: 'Test Result Title' } })),
  DELETE_Result: jest.fn().mockImplementation(() => Promise.resolve({ successfulRequest: true })),
  login: jest.fn(),
  GET_SessionLength: jest.fn(),
  GET_AllResultStatus: jest.fn(),
  GET_UserStaff: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  GET_FindContracts: jest.fn().mockImplementation(() => Promise.resolve({ data: [] })),
  indicatorTabs: {
    lazy: jest.fn().mockReturnValue({
      isLoading: signal(false),
      hasValue: signal(false),
      list: signal([])
    }),
    fetch: jest.fn(),
    promise: jest.fn(),
    setReferenceName: jest.fn()
  }
} as unknown as jest.Mocked<ApiService>;

export const httpClientMock = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn()
} as unknown as HttpClient;

export const whatsNewServiceMock = {
  notionData: signal<{ results: unknown[] } | null>({ results: [] }),
  notionDataLoading: signal(false),
  notionDataError: signal(null),
  activeNotionPageData: signal(null),
  lastSeenAt: signal<string | null>(null),
  hasUnreadReleaseNotes: computed(() => false),
  getWhatsNewPages: jest.fn(),
  markWhatsNewAsSeen: jest.fn(),
  isReleaseNoteNew: jest.fn().mockReturnValue(false),
  getDisplayDate: jest.fn().mockReturnValue(null),
  getActiveDisplayDate: jest.fn().mockReturnValue(null),
  getReleaseNoteTitle: jest.fn().mockReturnValue(''),
  getActiveReleaseNoteTitle: jest.fn().mockReturnValue(''),
  findReleaseNoteById: jest.fn().mockReturnValue(undefined),
  getActiveNotionPageUrl: jest.fn().mockReturnValue(null),
  getNotionBlockChildren: jest.fn(),
  getColor: jest.fn().mockReturnValue('#313131')
};

export const routerMock = {
  events: routerEventsSubject.get().asObservable(),
  navigate: jest.fn().mockResolvedValue(true),
  createUrlTree: jest.fn().mockReturnValue({}),
  serializeUrl: jest.fn().mockReturnValue(''),
  url: '/test'
};

export const submissionServiceMock = {
  statusSelected: signal(null),
  comment: signal(''),
  getSubmissionHistory: jest.fn(),
  setStatus: jest.fn(),
  setComment: jest.fn(),
  submit: jest.fn()
} as unknown as SubmissionService;

export const mockResultsStatus = {
  data: [
    { 
      name: 'Status 1', 
      amount_results: 5, 
      result_status_id: 1,
      result_status: {
        name: 'Status 1',
        config: {
          color: {
            text: '#112F5C',
            border: '#7C9CB9',
            background: null
          }
        }
      }
    },
    { 
      name: 'Status 2', 
      amount_results: 3, 
      result_status_id: 2,
      result_status: {
        name: 'Status 2',
        config: {
          color: {
            text: '#7CB580',
            border: '#A8CEAB',
            background: null
          }
        }
      }
    },
    { 
      name: 'Status 3', 
      amount_results: 0, 
      result_status_id: 3,
      result_status: {
        name: 'Status 3',
        config: {
          color: {
            text: '#F58220',
            border: '#F58220',
            background: null
          }
        }
      }
    }
  ]
};

export const mockIndicatorsResults = {
  data: [
    {
      indicator_id: 1,
      name: 'Indicator 1',
      amount_results: 2,
      icon_src: 'science'
    },
    {
      indicator_id: 2,
      name: 'Indicator 2',
      amount_results: 0,
      icon_src: 'analytics'
    }
  ]
};

export const getMetadataServiceMock = {
  update: jest.fn(),
  formatText: jest.fn(() => ''),
  clearMetadata: jest.fn()
};

export const clarityServiceMock = {
  updateUserInfo: jest.fn()
};

export const getResultsServiceMock = {
  updateList: jest.fn()
};

export const getUserStaffServiceMock = {
  getData: jest.fn().mockResolvedValue({ data: [] })
};

export const versionWatcherServiceMock = {
  onVersionChange: jest.fn()
};
