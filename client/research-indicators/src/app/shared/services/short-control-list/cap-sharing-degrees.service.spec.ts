import { TestBed } from '@angular/core/testing';
import { CapSharingDegreesService } from './cap-sharing-degrees.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('CapSharingDegreesService', () => {
  let service: CapSharingDegreesService;
  let apiService: jest.Mocked<ApiService>;

  const mockData = [
    { id: 1, name: 'Degree 1' },
    { id: 2, name: 'Degree 2' }
  ];

  beforeEach(() => {
    // Clone the mock and ensure that GET_Degrees is always a jest.fn()
    const apiMock = { ...apiServiceMock, GET_Degrees: jest.fn().mockResolvedValue({ data: mockData }) };
    TestBed.configureTestingModule({
      providers: [
        CapSharingDegreesService,
        {
          provide: ApiService,
          useValue: apiMock
        }
      ]
    });
    service = TestBed.inject(CapSharingDegreesService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main should set loading, call API and set list correctly', async () => {
    apiService.GET_Degrees = jest.fn().mockResolvedValue({ data: mockData });
    await service.main();
    expect(service.loading()).toBe(false);
    expect(apiService.GET_Degrees).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
  });

  it('main should handle errors correctly', async () => {
    apiService.GET_Degrees = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(service.main()).rejects.toThrow('fail');
    expect(service.loading()).toBe(false);
  });

  it('main should handle API response as undefined', async () => {
    apiService.GET_Degrees = jest.fn().mockResolvedValue(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main should handle API response with null data', async () => {
    apiService.GET_Degrees = jest.fn().mockResolvedValue({ data: null });
    await service.main();
    expect(service.list()).toEqual(null);
    expect(service.loading()).toBe(false);
  });

  it('main should handle API response without data property', async () => {
    apiService.GET_Degrees = jest.fn().mockResolvedValue({ status: 200 });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should call main in constructor', async () => {
    const mainSpy = jest.spyOn(CapSharingDegreesService.prototype, 'main').mockImplementation(async () => {});
    // Clone the mock and ensure that GET_Degrees is always a jest.fn()
    const apiMock = { ...apiServiceMock, GET_Degrees: jest.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [CapSharingDegreesService, { provide: ApiService, useValue: apiMock }]
    });
    TestBed.inject(CapSharingDegreesService);
    expect(mainSpy).toHaveBeenCalled();
    mainSpy.mockRestore();
  });
});
