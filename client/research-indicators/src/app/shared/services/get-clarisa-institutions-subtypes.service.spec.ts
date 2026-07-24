import { TestBed } from '@angular/core/testing';
import { GetClarisaInstitutionsSubTypesService } from './get-clarisa-institutions-subtypes.service';
import { ApiService } from './api.service';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';

const mockSubTypes: ClarisaInstitutionsSubTypes[] = [
  { code: 1, name: 'SubType 1', description: 'desc1', parent_code: 0 },
  { code: 2, name: 'SubType 2', description: null, parent_code: 1 }
];

const mockResponse: MainResponse<ClarisaInstitutionsSubTypes[]> = {
  data: mockSubTypes,
  status: 200,
  description: 'Success',
  timestamp: new Date().toISOString(),
  path: '/api/subtypes',
  successfulRequest: true,
  errorDetail: { errors: '', detail: '', description: '' }
};

const apiServiceMock = {
  GET_SubInstitutionTypes: jest.fn()
} as unknown as jest.Mocked<ApiService>;

describe('GetClarisaInstitutionsSubTypesService', () => {
  let service: GetClarisaInstitutionsSubTypesService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetClarisaInstitutionsSubTypesService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(GetClarisaInstitutionsSubTypesService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array if code is not provided in list()', () => {
    expect(service.list()).toEqual([]);
  });

  it('should return empty array if code is not in map', () => {
    expect(service.list(999)).toEqual([]);
  });

  it('should load subtypes and store them in map', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValue(mockResponse);
    await service.getSubTypes(1, 10);
    expect(apiService.GET_SubInstitutionTypes).toHaveBeenCalledWith(1, 10);
    expect(service.list(10)).toEqual(mockSubTypes);
    expect(service.loading()).toBe(false);
  });

  it('should clear previous list for code before loading new data', async () => {
    apiService.GET_SubInstitutionTypes.mockResolvedValue(mockResponse);
    // Pre-populate map
    (service as any).subTypesMap.set(10, [{ code: 99, name: 'Old', description: null, parent_code: 0 }]);
    await service.getSubTypes(1, 10);
    expect(service.list(10)).toEqual(mockSubTypes);
  });

  it('should handle API error and set empty array for code', async () => {
    apiService.GET_SubInstitutionTypes.mockRejectedValue(new Error('API error'));
    await service.getSubTypes(1, 20);
    expect(service.list(20)).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should set empty array if response.data is null', async () => {
    const nullResponse = { ...mockResponse, data: null } as any;
    apiService.GET_SubInstitutionTypes.mockResolvedValue(nullResponse);
    await service.getSubTypes(1, 30);
    expect(service.list(30)).toEqual([]);
  });

  it('should not call API if code is not provided', async () => {
    await service.getSubTypes(1, undefined);
    expect(apiService.GET_SubInstitutionTypes).not.toHaveBeenCalled();
  });

  it('should clear list for a specific code', async () => {
    (service as any).subTypesMap.set(5, mockSubTypes);
    service.clearList(5);
    expect(service.list(5)).toEqual([]);
  });

  it('should clear all lists if no code is provided', async () => {
    (service as any).subTypesMap.set(1, mockSubTypes);
    (service as any).subTypesMap.set(2, mockSubTypes);
    service.clearList();
    expect(service.list(1)).toEqual([]);
    expect(service.list(2)).toEqual([]);
  });

  it('should set loading true while fetching and false after', async () => {
    let resolveFn: any;
    apiService.GET_SubInstitutionTypes.mockImplementation(
      () =>
        new Promise(res => {
          resolveFn = res;
        })
    );
    const promise = service.getSubTypes(1, 50);
    expect(service.loading()).toBe(true);
    resolveFn(mockResponse);
    await promise;
    expect(service.loading()).toBe(false);
  });
});
