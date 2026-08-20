import { TestBed } from '@angular/core/testing';
import { GetInnovationUseLevelsService } from './get-innovation-use-levels.service';
import { ApiService } from '../api.service';
import { InnovationUseLevel } from '@shared/interfaces/get-innovation-use-levels.interface';

describe('InnovationUseLevel contract (T-01 c3)', () => {
  it('has no additional_guidance member — the column does not exist on this catalog', () => {
    const level = new InnovationUseLevel();

    expect('additional_guidance' in level).toBe(false);
    expect(Object.keys(level).sort()).toEqual(['definition', 'id', 'level', 'name']);
  });
});

describe('GetInnovationUseLevelsService', () => {
  let service: GetInnovationUseLevelsService;
  let apiMock: any;
  let listMock: any;
  let loadingMock: any;
  let isOpenSearchMock: any;

  const mockData = [
    { id: 1, level: 0, name: 'No use', definition: 'Innovation is not used.' },
    { id: 2, level: 1, name: 'Project lead organization', definition: 'Innovation is used by organization(s) leading the innovation development.' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_InnovationUseLevels: jest.fn().mockResolvedValue({ data: mockData })
    };
    listMock = jest.fn(() => []);
    listMock.set = jest.fn();
    loadingMock = jest.fn(() => true);
    loadingMock.set = jest.fn();
    isOpenSearchMock = jest.fn(() => false);
    isOpenSearchMock.set = jest.fn();
    // Instance without constructor
    service = Object.create(GetInnovationUseLevelsService.prototype);
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
    expect(apiMock.GET_InnovationUseLevels).toHaveBeenCalled();
    expect(listMock.set).toHaveBeenCalledWith(mockData);
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles empty response', async () => {
    apiMock.GET_InnovationUseLevels.mockResolvedValueOnce({ data: [] });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response null', async () => {
    apiMock.GET_InnovationUseLevels.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response undefined', async () => {
    apiMock.GET_InnovationUseLevels.mockResolvedValueOnce(undefined);
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response without data', async () => {
    apiMock.GET_InnovationUseLevels.mockResolvedValueOnce({ status: 200 });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles response with data not an array', async () => {
    apiMock.GET_InnovationUseLevels.mockResolvedValueOnce({ data: 'not an array' });
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main handles API error', async () => {
    apiMock.GET_InnovationUseLevels.mockRejectedValueOnce(new Error('API Error'));
    await service.main();
    expect(listMock.set).toHaveBeenCalledWith([]);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('constructor calls main and sets signals correctly', async () => {
    const apiService = {
      GET_InnovationUseLevels: jest.fn().mockResolvedValue({ data: [{ id: 3, level: 2, name: 'Partners', definition: 'Innovation is used by some partners.' }] })
    };
    TestBed.configureTestingModule({
      providers: [GetInnovationUseLevelsService, { provide: ApiService, useValue: apiService }]
    });
    const realService = TestBed.inject(GetInnovationUseLevelsService);
    // wait for main to finish
    await new Promise(res => setTimeout(res, 0));
    expect(realService.list()).toEqual([{ id: 3, level: 2, name: 'Partners', definition: 'Innovation is used by some partners.' }]);
    expect(realService.loading()).toBe(false);
    expect(realService.isOpenSearch()).toBe(false);
  });

  it('a second consumer does not re-issue the request (c4 — root-provided singleton loads once)', async () => {
    const apiService = {
      GET_InnovationUseLevels: jest.fn().mockResolvedValue({ data: mockData })
    };
    TestBed.configureTestingModule({
      providers: [GetInnovationUseLevelsService, { provide: ApiService, useValue: apiService }]
    });

    const firstConsumer = TestBed.inject(GetInnovationUseLevelsService);
    await new Promise(res => setTimeout(res, 0));
    const secondConsumer = TestBed.inject(GetInnovationUseLevelsService);
    await new Promise(res => setTimeout(res, 0));

    expect(secondConsumer).toBe(firstConsumer);
    expect(apiService.GET_InnovationUseLevels).toHaveBeenCalledTimes(1);
    expect(secondConsumer.list()).toEqual(mockData);
  });
});
