import { TestBed } from '@angular/core/testing';
import { CapSharingSessionPurposeService } from './cap-sharing-session-purpose.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('CapSharingSessionPurposeService', () => {
  let service: CapSharingSessionPurposeService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CapSharingSessionPurposeService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(CapSharingSessionPurposeService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load data successfully', async () => {
    const mockData = [
      { is_active: true, session_purpose_id: 1, name: 'Purpose 1' },
      { is_active: true, session_purpose_id: 2, name: 'Purpose 2' }
    ];

    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockResolvedValue({
      data: mockData
    } as any);

    await service.main();

    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('should handle loading state correctly', async () => {
    const mockData = [{ is_active: true, session_purpose_id: 1, name: 'Purpose 1' }];

    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockResolvedValue({
      data: mockData
    } as any);

    const loadPromise = service.main();

    expect(service.loading()).toBe(true);

    await loadPromise;

    expect(service.loading()).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockRejectedValue(new Error('API Error'));

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading session purpose:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should handle null response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockResolvedValue({
      data: null
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockResolvedValue({
      data: undefined
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty response data', async () => {
    jest.spyOn(apiServiceMock, 'GET_SessionPurpose').mockResolvedValue({
      data: []
    } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should initialize with empty list and loading false', () => {
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
