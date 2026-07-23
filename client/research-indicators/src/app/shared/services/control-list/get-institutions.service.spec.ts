import { TestBed } from '@angular/core/testing';
import { GetInstitutionsService } from './get-institutions.service';
import { ApiService } from '../api.service';
import { apiServiceMock, mockInstitutions } from '../../../testing/mock-services.mock';

describe('GetInstitutionsService', () => {
  let service: GetInstitutionsService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetInstitutionsService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetInstitutionsService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    // The service already executes main() in the constructor, so it already has data
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
    // The list is already populated by the constructor
    expect(service.list().length).toBeGreaterThan(0);
  });

  it('should call main method on constructor', () => {
    // Verify that the main method was called during creation
    expect(apiService.GET_Institutions).toHaveBeenCalled();
  });

  describe('main method', () => {
    it('should load institutions successfully and transform data correctly', async () => {
      // Arrange - clean the initial state
      service.list.set([]);
      service.loading.set(false);

      // Act
      await service.main();

      // Assert - called once in the constructor and once in the test
      expect(apiService.GET_Institutions).toHaveBeenCalledTimes(2);
      expect(service.loading()).toBe(false);
      expect(service.list()).toHaveLength(2);

      // Check first institution transformation
      const firstInstitution = service.list()[0];
      expect(firstInstitution.institution_id).toBe(1);
      expect(firstInstitution.region_id).toBe(1);
      expect(firstInstitution.html_full_name).toBe('<strong>TI1</strong> - Test Institution 1 - Test Location 1');
      expect(firstInstitution.isoAlpha2).toBe('US');
      expect(firstInstitution.institution_location_name).toBe('Test Location 1');

      // Check second institution transformation (without acronym)
      const secondInstitution = service.list()[1];
      expect(secondInstitution.institution_id).toBe(2);
      expect(secondInstitution.region_id).toBe(2);
      expect(secondInstitution.html_full_name).toBe('Test Institution 2 - Test Location 2');
      expect(secondInstitution.isoAlpha2).toBe('CA');
      expect(secondInstitution.institution_location_name).toBe('Test Location 2');
    });

    it('should handle institutions with empty locations array', async () => {
      // Arrange
      const mockDataWithEmptyLocations = {
        ...mockInstitutions,
        data: [
          {
            ...mockInstitutions.data[0],
            institution_locations: []
          } as any
        ]
      };
      apiService.GET_Institutions.mockResolvedValueOnce(mockDataWithEmptyLocations);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toHaveLength(1);
      const institution = service.list()[0];
      expect(institution.html_full_name).toBe('<strong>TI1</strong> - Test Institution 1 - undefined');
      expect(institution.isoAlpha2).toBeUndefined();
      expect(institution.institution_location_name).toBeUndefined();
    });

    it('should handle institutions with null acronym', async () => {
      // Arrange
      const mockDataWithNullAcronym = {
        ...mockInstitutions,
        data: [
          {
            ...mockInstitutions.data[0],
            acronym: null
          } as any
        ]
      };
      apiService.GET_Institutions.mockResolvedValueOnce(mockDataWithNullAcronym);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toHaveLength(1);
      const institution = service.list()[0];
      expect(institution.html_full_name).toBe('Test Institution 1 - Test Location 1');
    });

    it('should handle institutions with empty string acronym', async () => {
      // Arrange
      const mockDataWithEmptyAcronym = {
        ...mockInstitutions,
        data: [
          {
            ...mockInstitutions.data[0],
            acronym: ''
          } as any
        ]
      };
      apiService.GET_Institutions.mockResolvedValueOnce(mockDataWithEmptyAcronym);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toHaveLength(1);
      const institution = service.list()[0];
      expect(institution.html_full_name).toBe('Test Institution 1 - Test Location 1');
    });

    it('should set loading state correctly during API call', async () => {
      // Arrange
      let loadingStates: boolean[] = [];
      const originalSet = service.loading.set;
      service.loading.set = jest.fn(value => {
        loadingStates.push(value);
        originalSet.call(service.loading, value);
      });

      // Act
      const mainPromise = service.main();

      // Check loading is set to true immediately
      expect(loadingStates).toContain(true);

      await mainPromise;

      // Assert
      expect(loadingStates).toEqual([true, false]);
      expect(service.loading.set).toHaveBeenCalledTimes(2);
      expect(service.loading()).toBe(false);
    });

    it('should handle API error gracefully', async () => {
      // Arrange
      const error = new Error('API Error');
      apiService.GET_Institutions.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(service.main()).rejects.toThrow('API Error');
      expect(service.loading()).toBe(true);
    });

    it('should handle empty response data', async () => {
      // Arrange
      const emptyResponse = {
        ...mockInstitutions,
        data: []
      };
      apiService.GET_Institutions.mockResolvedValueOnce(emptyResponse);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle response with null data', async () => {
      // Arrange
      const nullDataResponse = {
        ...mockInstitutions,
        data: null
      } as any;
      apiService.GET_Institutions.mockResolvedValueOnce(nullDataResponse);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('should handle response with undefined data', async () => {
      // Arrange
      const undefinedDataResponse = {
        ...mockInstitutions,
        data: undefined
      } as any;
      apiService.GET_Institutions.mockResolvedValueOnce(undefinedDataResponse);

      // Act
      await service.main();

      // Assert
      expect(service.list()).toEqual([]);
      expect(service.loading()).toBe(false);
    });
  });

  describe('signal behavior', () => {
    it('should update list signal when data is loaded', async () => {
      // Arrange
      service.list.set([]);
      const initialList = service.list();

      // Act
      await service.main();
      const updatedList = service.list();

      // Assert
      expect(initialList).toEqual([]);
      expect(updatedList).toHaveLength(2);
      expect(updatedList).not.toEqual(initialList);
    });

    it('should update loading signal during API call', async () => {
      // Arrange
      service.loading.set(false);
      const initialLoading = service.loading();

      // Act
      const mainPromise = service.main();
      const loadingDuringCall = service.loading();

      await mainPromise;
      const finalLoading = service.loading();

      // Assert
      expect(initialLoading).toBe(false);
      expect(loadingDuringCall).toBe(true);
      expect(finalLoading).toBe(false);
    });
  });

  describe('data transformation edge cases', () => {
    it('should handle institution with multiple locations and use first one', async () => {
      // Arrange
      const mockDataWithMultipleLocations = {
        ...mockInstitutions,
        data: [
          {
            ...mockInstitutions.data[0],
            institution_locations: [
              {
                code: 1,
                name: 'First Location',
                institution_id: 1,
                isoAlpha2: 'US',
                isHeadquarter: true
              },
              {
                code: 2,
                name: 'Second Location',
                institution_id: 1,
                isoAlpha2: 'CA',
                isHeadquarter: false
              }
            ]
          } as any
        ]
      };
      apiService.GET_Institutions.mockResolvedValueOnce(mockDataWithMultipleLocations);

      // Act
      await service.main();

      // Assert
      const institution = service.list()[0];
      expect(institution.html_full_name).toBe('<strong>TI1</strong> - Test Institution 1 - First Location');
      expect(institution.isoAlpha2).toBe('US');
      expect(institution.institution_location_name).toBe('First Location');
    });

    it('should handle institution with undefined properties', async () => {
      // Arrange
      const mockDataWithUndefinedProps = {
        ...mockInstitutions,
        data: [
          {
            description: 'Test Institution',
            code: 1,
            acronym: undefined,
            name: 'Test Institution',
            is_active: true,
            websiteLink: 'https://test.com',
            added: '2024-01-01',
            institution_type_id: 1,
            institution_locations: [
              {
                code: 1,
                name: undefined,
                institution_id: 1,
                isoAlpha2: undefined,
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
          } as any
        ]
      };
      apiService.GET_Institutions.mockResolvedValueOnce(mockDataWithUndefinedProps);

      // Act
      await service.main();

      // Assert
      const institution = service.list()[0];
      expect(institution.html_full_name).toBe('Test Institution - undefined');
      expect(institution.isoAlpha2).toBeUndefined();
      expect(institution.institution_location_name).toBeUndefined();
    });
  });
});
