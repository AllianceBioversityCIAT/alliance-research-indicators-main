import { TestBed } from '@angular/core/testing';
import { GlobalTargetsService } from './global-targets.service';
import { ApiService } from '../../services/api.service';
import { GlobalTarget } from '@shared/interfaces/global-target.interface';

describe('GlobalTargetsService', () => {
  let service: GlobalTargetsService;
  let mockApiService: any;

  const mockGlobalTargets: GlobalTarget[] = [
    {
      targetId: 1,
      smo_code: 'SMO1',
      target: 'Target 1',
      impactAreaId: 1,
      impactAreaName: 'Nutrition'
    },
    {
      targetId: 2,
      smo_code: 'SMO2',
      target: 'Target 2',
      impactAreaId: 2,
      impactAreaName: 'Poverty'
    }
  ];

  beforeEach(() => {
    const apiServiceSpy = {
      GET_GlobalTargets: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        GlobalTargetsService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    service = TestBed.inject(GlobalTargetsService);
    mockApiService = TestBed.inject(ApiService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  it('should initialize with empty default list', () => {
    expect(service.getList()()).toEqual([]);
  });

  it('should initialize with isOpenSearch false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should load data successfully for a specific impact area', async () => {
    // Arrange
    const impactAreaId = 1;
    const mockResponse = {
      data: mockGlobalTargets,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(mockApiService.GET_GlobalTargets).toHaveBeenCalledWith(impactAreaId);
    expect(service.getList(impactAreaId)()).toEqual(mockGlobalTargets);
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should handle API response with non-array data', async () => {
    // Arrange
    const impactAreaId = 2;
    const mockResponse = {
      data: mockGlobalTargets[0], // Single object instead of array
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getList(impactAreaId)()).toEqual([]);
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should handle API response with null data', async () => {
    // Arrange
    const impactAreaId = 3;
    const mockResponse = {
      data: null,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getList(impactAreaId)()).toEqual([]);
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should handle API response with undefined data', async () => {
    // Arrange
    const impactAreaId = 4;
    const mockResponse = {
      data: undefined,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getList(impactAreaId)()).toEqual([]);
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should handle API error', async () => {
    // Arrange
    const impactAreaId = 5;
    mockApiService.GET_GlobalTargets.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getList(impactAreaId)()).toEqual([]);
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should set loading to true at start of main', async () => {
    // Arrange
    const impactAreaId = 6;
    const mockResponse = {
      data: mockGlobalTargets,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    const mainPromise = service.main(impactAreaId);
    
    // Assert - loading should be true immediately
    expect(service.getLoading(impactAreaId)()).toBe(true);
    
    await mainPromise;
  });

  it('should set loading to false after completion', async () => {
    // Arrange
    const impactAreaId = 7;
    const mockResponse = {
      data: mockGlobalTargets,
      status: 200,
      successfulRequest: true
    };
    mockApiService.GET_GlobalTargets.mockResolvedValue(mockResponse);

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should set loading to false even after error', async () => {
    // Arrange
    const impactAreaId = 8;
    mockApiService.GET_GlobalTargets.mockRejectedValue(new Error('API Error'));

    // Act
    await service.main(impactAreaId);

    // Assert
    expect(service.getLoading(impactAreaId)()).toBe(false);
  });

  it('should return early from main when impactAreaId is undefined', async () => {
    // Act
    await service.main(undefined);

    // Assert
    expect(mockApiService.GET_GlobalTargets).not.toHaveBeenCalled();
  });

  it('should return early from main when impactAreaId is null', async () => {
    // Act
    await service.main(null as any);

    // Assert
    expect(mockApiService.GET_GlobalTargets).not.toHaveBeenCalled();
  });

  it('should return early from main when impactAreaId is a string', async () => {
    // Act
    await service.main('1' as any);

    // Assert
    expect(mockApiService.GET_GlobalTargets).not.toHaveBeenCalled();
  });

  it('should return default loading signal when impactAreaId is undefined', () => {
    // Act
    const loadingSignal = service.getLoading(undefined);

    // Assert
    expect(loadingSignal).toBe(service.getLoading());
    expect(loadingSignal()).toBe(false);
  });

  it('should return default loading signal when impactAreaId is null', () => {
    // Act
    const loadingSignal = service.getLoading(null as any);

    // Assert
    expect(loadingSignal).toBe(service.getLoading());
    expect(loadingSignal()).toBe(false);
  });

  it('should return default loading signal when impactAreaId is a string', () => {
    // Act
    const loadingSignal = service.getLoading('1' as any);

    // Assert
    expect(loadingSignal).toBe(service.getLoading());
    expect(loadingSignal()).toBe(false);
  });

  it('should return default list signal when impactAreaId is undefined', () => {
    // Act
    const listSignal = service.getList(undefined);

    // Assert
    expect(listSignal).toBe(service.getList());
    expect(listSignal()).toEqual([]);
  });

  it('should return default list signal when impactAreaId is null', () => {
    // Act
    const listSignal = service.getList(null as any);

    // Assert
    expect(listSignal).toBe(service.getList());
    expect(listSignal()).toEqual([]);
  });

  it('should return default list signal when impactAreaId is a string', () => {
    // Act
    const listSignal = service.getList('1' as any);

    // Assert
    expect(listSignal).toBe(service.getList());
    expect(listSignal()).toEqual([]);
  });
});
