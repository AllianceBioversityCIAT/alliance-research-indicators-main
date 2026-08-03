import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestPartnerModalComponent } from './request-partner-modal.component';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { Router } from '@angular/router';
import { GetClarisaInstitutionsTypesChildlessService } from '@shared/services/get-clarisa-institutions-type-childless.service';
import { GetCountriesService } from '@shared/services/control-list/get-countries.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { signal } from '@angular/core';

describe('RequestPartnerModalComponent', () => {
  let component: RequestPartnerModalComponent;
  let fixture: ComponentFixture<RequestPartnerModalComponent>;
  let mockServiceLocator: Partial<ServiceLocatorService>;
  let mockApiService: Partial<ApiService>;
  let mockActionsService: Partial<ActionsService>;
  let mockAllModalsService: Partial<AllModalsService>;
  let mockRouter: Partial<Router>;
  let mockCacheService: Partial<CacheService>;
  let mockInstitutionsService: Partial<GetClarisaInstitutionsTypesChildlessService>;
  let mockCountriesService: Partial<GetCountriesService>;

  beforeEach(async () => {
    mockInstitutionsService = {
      list: jest.fn().mockReturnValue([
        { code: 'TEST1', name: 'Test Institution 1' },
        { code: 'TEST2', name: 'Test Institution 2' }
      ])
    };
    mockCountriesService = {
      list: jest.fn().mockReturnValue([
        { isoAlpha2: 'US', name: 'United States' },
        { isoAlpha2: 'CA', name: 'Canada' }
      ])
    };

    mockServiceLocator = {
      getService: jest.fn().mockImplementation((serviceName: string) => {
        if (serviceName === 'clarisaInstitutionsTypesChildless') {
          return mockInstitutionsService;
        }
        if (serviceName === 'countries') {
          return mockCountriesService;
        }
        return null;
      })
    };

    mockApiService = {
      POST_PartnerRequest: jest.fn()
    };

    mockActionsService = {
      showToast: jest.fn(),
      showGlobalAlert: jest.fn()
    };

    mockAllModalsService = {
      setCreatePartner: jest.fn(),
      setDisabledConfirmPartner: jest.fn(),
      closeModal: jest.fn(),
      partnerRequestSection: jest.fn().mockReturnValue('Test Section')
    };

    mockRouter = {
      url: '/test-url'
    };

    mockCacheService = {
      dataCache: signal({
        user: {
          first_name: 'John',
          last_name: 'Doe',
          sec_user_id: 123
        }
      }),
      currentMetadata: signal({
        result_official_code: 'TEST-001'
      })
    };

    await TestBed.configureTestingModule({
      imports: [RequestPartnerModalComponent],
      providers: [
        { provide: ServiceLocatorService, useValue: mockServiceLocator },
        { provide: ApiService, useValue: mockApiService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: Router, useValue: mockRouter },
        { provide: CacheService, useValue: mockCacheService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestPartnerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default body values', () => {
    expect(component.body()).toEqual({
      acronym: null,
      name: null,
      institutionTypeCode: null,
      hqCountryIso: null,
      websiteLink: null,
      externalUserComments: null
    });
  });

  it('should initialize loading as false', () => {
    expect(component.loading()).toBe(false);
  });

  it('should set up services in ngOnInit', () => {
    mockServiceLocator.getService!.mockReturnValue(mockInstitutionsService);
    mockServiceLocator.getService!.mockReturnValue(mockCountriesService);

    component.ngOnInit();

    expect(mockServiceLocator.getService).toHaveBeenCalledWith('clarisaInstitutionsTypesChildless');
    expect(mockServiceLocator.getService).toHaveBeenCalledWith('countries');
  });

  it('should validate website correctly', () => {
    // Valid URLs
    expect(component.validateWebsite('https://example.com')).toBe(true);
    expect(component.validateWebsite('http://example.com')).toBe(true);
    expect(component.validateWebsite('example.com')).toBe(true);
    expect(component.validateWebsite('www.example.com')).toBe(true);
    expect(component.validateWebsite('subdomain.example.com')).toBe(true);
    expect(component.validateWebsite('https://example.com/path')).toBe(true);
    expect(component.validateWebsite('')).toBe(true);
    expect(component.validateWebsite('   ')).toBe(true);

    // Invalid URLs
    expect(component.validateWebsite('invalid-url')).toBe(false);
    expect(component.validateWebsite('ftp://example.com')).toBe(false);
    expect(component.validateWebsite('example')).toBe(false);
    expect(component.validateWebsite('example.')).toBe(false);
  });

  it('should set value and convert to lowercase', () => {
    component.setValue('HTTPS://EXAMPLE.COM');
    expect(component.body().websiteLink).toBe('https://example.com');
  });

  it('should compute isPartnerConfirmDisabled correctly', () => {
    // All fields empty - should be disabled
    expect(component.isPartnerConfirmDisabled()).toBe(true);

    // Set required fields
    component.body.set({
      ...component.body(),
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com'
    });
    expect(component.isPartnerConfirmDisabled()).toBe(false);

    // Invalid website - should be disabled
    component.body.set({
      ...component.body(),
      websiteLink: 'invalid-url'
    });
    expect(component.isPartnerConfirmDisabled()).toBe(true);

    // Loading - should be disabled
    component.loading.set(true);
    component.body.set({
      ...component.body(),
      websiteLink: 'https://example.com'
    });
    expect(component.isPartnerConfirmDisabled()).toBe(true);
  });

  it('should create partner successfully', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.POST_PartnerRequest!.mockResolvedValue(mockResponse);

    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(mockActionsService.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Success',
      detail: 'Partner request sent successfully'
    });

    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('requestPartner');
    expect(component.loading()).toBe(false);
  });

  it('should handle bad request with warning (409 status)', async () => {
    const mockResponse = {
      successfulRequest: false,
      status: 409,
      errorDetail: { errors: 'Conflict error' }
    };
    mockApiService.POST_PartnerRequest!.mockResolvedValue(mockResponse);

    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'warning',
      summary: 'Warning',
      detail: 'Conflict error'
    });

    expect(component.loading()).toBe(false);
  });

  it('should handle bad request with error (non-409 status)', async () => {
    const mockResponse = {
      successfulRequest: false,
      status: 400,
      errorDetail: { errors: 'Bad request error' }
    };
    mockApiService.POST_PartnerRequest!.mockResolvedValue(mockResponse);

    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Bad request error'
    });

    expect(component.loading()).toBe(false);
  });

  it('should not create partner if validation fails', async () => {
    component.body.set({
      acronym: 'TEST',
      name: '', // Empty name
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(mockApiService.POST_PartnerRequest).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should not create partner if loading', async () => {
    component.loading.set(true);
    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(mockApiService.POST_PartnerRequest).not.toHaveBeenCalled();
    expect(component.loading()).toBe(true);
  });

  it('should reset body after successful request', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.POST_PartnerRequest!.mockResolvedValue(mockResponse);

    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });

    await component.createPartner();

    expect(component.body()).toEqual({
      acronym: null,
      name: null,
      institutionTypeCode: null,
      hqCountryIso: null,
      websiteLink: null,
      externalUserComments: null
    });
  });

  it('should cover line 58 - validateWebsite with null websiteLink', () => {
    component.body.set({
      ...component.body(),
      websiteLink: null
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled
    expect(component.isPartnerConfirmDisabled()).toBe(true);
  });

  it('should cover line 95 - validateWebsite with invalid websiteLink in createPartner', async () => {
    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'invalid-url',
      externalUserComments: null
    });

    await component.createPartner();

    // Should not call API because validation fails (early return)
    expect(mockApiService.POST_PartnerRequest).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false); // Should remain false since API wasn't called
  });

  it('should cover line 58 - validateWebsite with undefined websiteLink', () => {
    component.body.set({
      ...component.body(),
      websiteLink: undefined
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled
    expect(component.isPartnerConfirmDisabled()).toBe(true);
  });

  it('should cover line 95 - validateWebsite with undefined websiteLink in createPartner', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.POST_PartnerRequest!.mockResolvedValue(mockResponse);

    component.body.set({
      acronym: 'TEST',
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: undefined,
      externalUserComments: null
    });

    await component.createPartner();

    // Should call API because undefined passes validation (empty is valid)
    expect(mockApiService.POST_PartnerRequest).toHaveBeenCalled();
  });

  it('should cover line 58 - validateWebsite with empty string websiteLink', () => {
    component.body.set({
      ...component.body(),
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: '' // Empty string
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled with empty string
    expect(component.isPartnerConfirmDisabled()).toBe(false); // Empty string is valid
  });

  it('should cover line 58 - validateWebsite with whitespace-only websiteLink', () => {
    component.body.set({
      ...component.body(),
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: '   ' // Whitespace only
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled with whitespace
    expect(component.isPartnerConfirmDisabled()).toBe(false); // Whitespace is valid
  });

  it('should cover line 58 - validateWebsite with valid URL in isPartnerConfirmDisabled', () => {
    component.body.set({
      ...component.body(),
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com' // Valid URL
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled with valid URL
    expect(component.isPartnerConfirmDisabled()).toBe(false); // Valid URL should not disable
  });

  it('should cover line 58 - validateWebsite with invalid URL in isPartnerConfirmDisabled', () => {
    component.body.set({
      ...component.body(),
      name: 'Test Name',
      institutionTypeCode: 'TEST',
      hqCountryIso: 'US',
      websiteLink: 'invalid-url' // Invalid URL
    });

    // This should trigger the validateWebsite call in isPartnerConfirmDisabled with invalid URL
    expect(component.isPartnerConfirmDisabled()).toBe(true); // Invalid URL should disable
  });

  it('should force coverage of line 58 by triggering computed multiple times', () => {
    // Test with different websiteLink values to ensure line 58 is covered
    const testCases = [
      { websiteLink: '', expected: false },
      { websiteLink: '   ', expected: false },
      { websiteLink: 'https://example.com', expected: false },
      { websiteLink: 'invalid-url', expected: true },
      { websiteLink: null, expected: false },
      { websiteLink: undefined, expected: false }
    ];

    testCases.forEach(({ websiteLink, expected }) => {
      component.body.set({
        ...component.body(),
        name: 'Test Name',
        institutionTypeCode: 'TEST',
        hqCountryIso: 'US',
        websiteLink: websiteLink
      });

      // Force the computed to run by calling it
      const result = component.isPartnerConfirmDisabled();
      expect(result).toBe(expected);
    });
  });

  it('should invoke createPartner via constructor-registered callback', async () => {
    const createCb = (mockAllModalsService.setCreatePartner as jest.Mock).mock.calls[0][0];
    const mockResponse = { successfulRequest: true } as any;
    (mockApiService.POST_PartnerRequest as jest.Mock).mockResolvedValue(mockResponse);
    component.body.set({
      acronym: 'ACR',
      name: 'Name',
      institutionTypeCode: 'CODE',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });
    await createCb();
    expect(mockApiService.POST_PartnerRequest).toHaveBeenCalled();
  });

  it('should invoke disabledConfirm via constructor-registered callback', () => {
    const disabledCb = (mockAllModalsService.setDisabledConfirmPartner as jest.Mock).mock.calls[0][0];
    component.body.set({
      acronym: null,
      name: null,
      institutionTypeCode: null,
      hqCountryIso: null,
      websiteLink: null,
      externalUserComments: null
    });
    expect(disabledCb()).toBe(true);
    component.body.set({
      acronym: 'A',
      name: 'N',
      institutionTypeCode: 'C',
      hqCountryIso: 'US',
      websiteLink: 'https://example.com',
      externalUserComments: null
    });
    expect(disabledCb()).toBe(false);
    component.loading.set(true);
    expect(disabledCb()).toBe(true);
  });
});
