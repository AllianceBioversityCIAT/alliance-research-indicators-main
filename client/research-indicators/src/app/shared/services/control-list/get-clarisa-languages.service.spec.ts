import { TestBed } from '@angular/core/testing';
import { GetClarisaLanguagesService } from './get-clarisa-languages.service';
import { ApiService } from '../api.service';
import { apiServiceMock, mockLanguages } from '../../../testing/mock-services.mock';

describe('GetClarisaLanguagesService', () => {
  let service: GetClarisaLanguagesService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    apiServiceMock.GET_Languages.mockResolvedValue(Promise.resolve(mockLanguages));
    TestBed.configureTestingModule({
      providers: [GetClarisaLanguagesService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetClarisaLanguagesService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize and call main in constructor', async () => {
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguages));
    await service.main();
    expect(apiService.GET_Languages).toHaveBeenCalled();
    expect(service.loading()).toBe(false);
    expect(service.list().length).toBeGreaterThan(0);
  });

  it('should set loading true while fetching and false after', async () => {
    service.loading.set(false);
    const originalSet = service.loading.set;
    const loadingStates: boolean[] = [];
    service.loading.set = jest.fn(v => {
      loadingStates.push(v);
      originalSet.call(service.loading, v);
    });
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguages));
    await service.main();
    expect(loadingStates).toEqual([true, false]);
    expect(service.loading()).toBe(false);
  });

  it('should set list with languages from API', async () => {
    service.list.set([]);
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguages));
    await service.main();
    expect(service.list()).toEqual(mockLanguages.data);
  });

  it('should handle API error and keep loading true', async () => {
    apiService.GET_Languages.mockRejectedValueOnce(new Error('API Error'));
    await expect(service.main()).rejects.toThrow('API Error');
    expect(service.loading()).toBe(true);
  });

  it('should have correct initial loading state', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have correct initial isOpenSearch state', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should handle languages with null values', async () => {
    const mockLanguagesWithNulls = {
      ...mockLanguages,
      data: [
        {
          is_active: true,
          id: 1,
          name: null,
          iso_alpha_2: null,
          iso_alpha_3: 'eng'
        }
      ]
    };
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguagesWithNulls));
    await service.main();
    expect(service.list()).toEqual(mockLanguagesWithNulls.data);
    expect(service.list()[0].name).toBeNull();
    expect(service.list()[0].iso_alpha_2).toBeNull();
  });

  it('should handle empty languages array', async () => {
    const mockEmptyLanguages = {
      ...mockLanguages,
      data: []
    };
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockEmptyLanguages));
    await service.main();
    expect(service.list()).toEqual([]);
  });

  it('should maintain list consistency across multiple main() calls', async () => {
    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguages));
    await service.main();
    const firstCall = service.list();

    apiService.GET_Languages.mockResolvedValueOnce(Promise.resolve(mockLanguages));
    await service.main();
    const secondCall = service.list();

    expect(firstCall).toEqual(secondCall);
  });
});
