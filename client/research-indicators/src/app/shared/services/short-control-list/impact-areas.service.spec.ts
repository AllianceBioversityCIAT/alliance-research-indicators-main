import { TestBed } from '@angular/core/testing';
import { ImpactAreasService } from './impact-areas.service';
import { ApiService } from '../../services/api.service';
import { ImpactArea } from '@shared/interfaces/impact-area.interface';

describe('ImpactAreasService', () => {
  let service: ImpactAreasService;
  let mockApiService: any;

  const mockImpactAreas: ImpactArea[] = [
    {
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true,
      id: 1,
      name: 'Nutrition, Health and Food Security',
      description: 'End hunger for all and enable affordable healthy diets',
      financialCode: 'IA1',
      icon: 'https://reporting.cgiar.org/assets/impact_areas/1.png',
      color: '#f07e28'
    },
    {
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true,
      id: 2,
      name: 'Poverty Reduction, Livelihoods and Jobs',
      description: 'Lift at least 500 million people living in rural areas',
      financialCode: 'IA2',
      icon: 'https://reporting.cgiar.org/assets/impact_areas/2.png',
      color: '#1275ba'
    }
  ];

  beforeEach(() => {
    const apiServiceSpy = {
      GET_ImpactAreas: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ImpactAreasService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    service = TestBed.inject(ImpactAreasService);
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
      data: mockImpactAreas,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(mockApiService.GET_ImpactAreas).toHaveBeenCalled();
    expect(service.list()).toEqual(mockImpactAreas);
    expect(service.loading()).toBe(false);
  });

  it('should handle API response with non-array data', async () => {
    // Arrange
    const mockResponse = {
      data: mockImpactAreas[0], // Single object instead of array
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

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
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

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
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API error', async () => {
    // Arrange
    mockApiService.GET_ImpactAreas.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to true at start of main', async () => {
    // Arrange
    const mockResponse = {
      data: mockImpactAreas,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    const mainPromise = service.main();
    
    // Assert - loading should be true immediately
    expect(service.loading()).toBe(true);
    
    await mainPromise;
  });

  it('should set loading to false after completion', async () => {
    // Arrange
    const mockResponse = {
      data: mockImpactAreas,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false even after error', async () => {
    // Arrange
    mockApiService.GET_ImpactAreas.mockRejectedValue(new Error('API Error'));

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
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with null status', async () => {
    // Arrange
    const mockResponse = {
      data: mockImpactAreas,
      status: null,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreas.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual(mockImpactAreas);
    expect(service.loading()).toBe(false);
  });
});
