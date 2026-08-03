import { TestBed } from '@angular/core/testing';
import { InformativeRolesService } from './informative-roles.service';
import { ApiService } from '../../services/api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';

describe('InformativeRolesService', () => {
  let service: InformativeRolesService;
  let mockApiService: any;

  const mockRoles: GenericList[] = [
    {
      id: 1,
      name: 'Principal Investigator',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    },
    {
      id: 2,
      name: 'Co-Investigator',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    },
    {
      id: 3,
      name: 'Research Assistant',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    }
  ];

  beforeEach(() => {
    const apiServiceSpy = {
      GET_InformativeRoles: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        InformativeRolesService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    service = TestBed.inject(InformativeRolesService);
    mockApiService = TestBed.inject(ApiService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  it('should initialize with empty list', () => {
    expect(service.list()).toEqual([]);
  });

  it('should initialize with isOpenSearch false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should load data successfully', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(mockApiService.GET_InformativeRoles).toHaveBeenCalled();
    expect(service.list()).toEqual(mockRoles);
    expect(service.loading()).toBe(false);
  });

  it('should handle API response with non-array data', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles[0], // Single object instead of array
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API response with null data', async () => {
    // Arrange
    const mockResponse = {
      data: null,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API response with undefined data', async () => {
    // Arrange
    const mockResponse = {
      data: undefined,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API error', async () => {
    // Arrange
    mockApiService.GET_InformativeRoles.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to true at start of main', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    const mainPromise = service.main();
    
    // Assert - loading should be true immediately
    expect(service.loading()).toBe(true);
    
    await mainPromise;
  });

  it('should set loading to false after completion', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false even after error', async () => {
    // Arrange
    mockApiService.GET_InformativeRoles.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main();

    // Assert
    expect(service.loading()).toBe(false);
  });

  it('should handle empty array response', async () => {
    // Arrange
    const mockResponse = {
      data: [],
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with null status', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: null,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual(mockRoles);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with undefined status', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: undefined,
      successfulRequest: true
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual(mockRoles);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with successfulRequest false', async () => {
    // Arrange
    const mockResponse = {
      data: mockRoles,
      status: 200,
      successfulRequest: false
    };
    mockApiService.GET_InformativeRoles.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual(mockRoles);
    expect(service.loading()).toBe(false);
  });
});
