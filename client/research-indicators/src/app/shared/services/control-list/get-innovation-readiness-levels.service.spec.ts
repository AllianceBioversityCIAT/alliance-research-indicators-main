import { TestBed } from '@angular/core/testing';
import { GetInnovationReadinessLevelsService } from './get-innovation-readiness-levels.service';
import { ApiService } from '../api.service';

describe('GetInnovationReadinessLevelsService', () => {
  let service: GetInnovationReadinessLevelsService;
  let apiMock: any;
  let listMock: any;
  let loadingMock: any;
  let isOpenSearchMock: any;

  const mockData = [
    { id: 1, name: 'Level 1' },
    { id: 2, name: 'Level 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_InnovationReadinessLevels: jest.fn().mockResolvedValue({ data: mockData })
    };
    listMock = jest.fn(() => []);
    listMock.set = jest.fn();
    loadingMock = jest.fn(() => true);
    loadingMock.set = jest.fn();
    isOpenSearchMock = jest.fn(() => false);
    isOpenSearchMock.set = jest.fn();
    // Instance without constructor
    service = Object.create(GetInnovationReadinessLevelsService.prototype);
    service.apiService = apiMock;
    service.list = listMock;
    service.loading = loadingMock;
    service.isOpenSearch = isOpenSearchMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main sets loading and list correctly with valid data', async () => {
    await service.main();
    expect(apiMock.GET_InnovationReadinessLevels).toHaveBeenCalled();
    expect(listMock.set).toHaveBeenCalledWith(mockData);
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles empty response', async () => {
    apiMock.GET_InnovationReadinessLevels.mockResolvedValueOnce({ data: [] });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response null', async () => {
    apiMock.GET_InnovationReadinessLevels.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response undefined', async () => {
    apiMock.GET_InnovationReadinessLevels.mockResolvedValueOnce(undefined);
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response without data', async () => {
    apiMock.GET_InnovationReadinessLevels.mockResolvedValueOnce({ status: 200 });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response with data not an array', async () => {
    apiMock.GET_InnovationReadinessLevels.mockResolvedValueOnce({ data: 'not an array' });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles API error', async () => {
    apiMock.GET_InnovationReadinessLevels.mockRejectedValueOnce(new Error('API Error'));
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('constructor calls main and sets signals correctly', async () => {
    const apiService = {
      GET_InnovationReadinessLevels: jest.fn().mockResolvedValue({ data: [{ id: 3, name: 'Level 3' }] })
    };
    TestBed.configureTestingModule({
      providers: [GetInnovationReadinessLevelsService, { provide: ApiService, useValue: apiService }]
    });
    const realService = TestBed.inject(GetInnovationReadinessLevelsService);
    // wait for main to finish
    await new Promise(res => setTimeout(res, 0));
    expect(realService.list()).toEqual([{ id: 3, name: 'Level 3' }]);
    expect(realService.loading()).toBe(false);
    expect(realService.isOpenSearch()).toBe(false);
  });
});
