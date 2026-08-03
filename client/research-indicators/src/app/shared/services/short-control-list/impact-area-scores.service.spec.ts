import { TestBed } from '@angular/core/testing';
import { ImpactAreaScoresService } from './impact-area-scores.service';
import { ApiService } from '../../services/api.service';
import { GenericList } from '@shared/interfaces/generic-list.interface';

describe('ImpactAreaScoresService', () => {
  let service: ImpactAreaScoresService;
  let mockApiService: any;

  const mockScores: GenericList[] = [
    {
      id: 0,
      name: 'Not Targeted',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    },
    {
      id: 1,
      name: 'Significant',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    },
    {
      id: 2,
      name: 'Principal',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      is_active: true
    }
  ];

  beforeEach(() => {
    const apiServiceSpy = {
      GET_ImpactAreaScores: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ImpactAreaScoresService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    service = TestBed.inject(ImpactAreaScoresService);
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

  it('should load data successfully and format names', async () => {
    // Arrange
    const mockResponse = {
      data: mockScores,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(mockApiService.GET_ImpactAreaScores).toHaveBeenCalled();
    expect(service.list()).toEqual([
      {
        id: 0,
        name: '<strong>-1 -</strong> Not Targeted',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        is_active: true
      },
      {
        id: 1,
        name: '<strong>0 -</strong> Significant',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        is_active: true
      },
      {
        id: 2,
        name: '<strong>1 -</strong> Principal',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        is_active: true
      }
    ]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API response with non-array data', async () => {
    // Arrange
    const mockResponse = {
      data: mockScores[0], // Single object instead of array
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

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
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

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
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API error and set fallback data', async () => {
    // Arrange
    mockApiService.GET_ImpactAreaScores.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main();

    // Assert
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should format data with missing created_at and updated_at', async () => {
    // Arrange
    const scoresWithMissingDates = [
      {
        id: 0,
        name: 'Not Targeted',
        is_active: true
      }
    ];
    const mockResponse = {
      data: scoresWithMissingDates,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()[0].created_at).toBeDefined();
    expect(service.list()[0].updated_at).toBeDefined();
    expect(service.loading()).toBe(false);
  });

  it('should format data with undefined is_active', async () => {
    // Arrange
    const scoresWithUndefinedActive = [
      {
        id: 0,
        name: 'Not Targeted',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    ];
    const mockResponse = {
      data: scoresWithUndefinedActive,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.list()[0].is_active).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to true at start of main', async () => {
    // Arrange
    const mockResponse = {
      data: mockScores,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    const mainPromise = service.main();
    
    // Assert - loading should be true immediately
    expect(service.loading()).toBe(true);
    
    await mainPromise;
  });

  it('should set loading to false after completion', async () => {
    // Arrange
    const mockResponse = {
      data: mockScores,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_ImpactAreaScores.mockResolvedValue(mockResponse);

    // Act
    await service.main();

    // Assert
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false even after error', async () => {
    // Arrange
    mockApiService.GET_ImpactAreaScores.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main();

    // Assert
    expect(service.loading()).toBe(false);
  });
});
