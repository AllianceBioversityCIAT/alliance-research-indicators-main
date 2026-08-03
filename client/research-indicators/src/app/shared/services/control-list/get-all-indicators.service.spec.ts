import { TestBed } from '@angular/core/testing';
import { GetAllIndicatorsService } from './get-all-indicators.service';
import { ApiService } from '../api.service';

describe('GetAllIndicatorsService', () => {
  let service: GetAllIndicatorsService;
  let apiMock: any;

  const mockData = [
    { id: 1, name: 'Indicator 1' },
    { id: 2, name: 'Indicator 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_AllIndicators: jest.fn().mockResolvedValue({ data: mockData })
    };

    TestBed.configureTestingModule({
      providers: [GetAllIndicatorsService, { provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(GetAllIndicatorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main sets loading and list correctly with valid data', async () => {
    await service.main();
    expect(apiMock.GET_AllIndicators).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('main handles empty response', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: [] });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response null', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response undefined', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response without data', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ status: 200 });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles response with data not an array', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: 'not an array' });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main handles API error', async () => {
    apiMock.GET_AllIndicators.mockRejectedValueOnce(new Error('API Error'));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('getInstance returns signal with valid data', async () => {
    const resultSignal = await service.getInstance();
    expect(apiMock.GET_AllIndicators).toHaveBeenCalled();
    expect(resultSignal()).toEqual(mockData);
  });

  it('getInstance handles empty response', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: [] });
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('getInstance handles response null', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: null });
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('getInstance handles response undefined', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce(undefined);
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('getInstance handles response without data', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ status: 200 });
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('getInstance handles response with data not an array', async () => {
    apiMock.GET_AllIndicators.mockResolvedValueOnce({ data: 'not an array' });
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('getInstance handles API error', async () => {
    apiMock.GET_AllIndicators.mockRejectedValueOnce(new Error('API Error'));
    const resultSignal = await service.getInstance();
    expect(resultSignal()).toEqual([]);
  });

  it('constructor initializes signals correctly and executes main', async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });
});
