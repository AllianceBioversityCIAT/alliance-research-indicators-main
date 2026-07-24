import { TestBed } from '@angular/core/testing';
import { GetContractsService } from './get-contracts.service';
import { ApiService } from '../api.service';

describe('GetContractsService', () => {
  let service: GetContractsService;
  let apiMock: any;

  const mockData = [
    { agreement_id: 'A1', description: 'Contract 1' },
    { agreement_id: 'A2', description: 'Contract 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_FindContracts: jest.fn().mockResolvedValue({ data: { data: mockData } })
    };

    TestBed.configureTestingModule({
      providers: [GetContractsService, { provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(GetContractsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch and transform contracts successfully', async () => {
    await service.main();
    const result = service.list();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      agreement_id: 'A1',
      description: 'Contract 1',
      select_label: 'A1 - Contract 1',
      contract_id: 'A1'
    });
    expect(result[1]).toEqual({
      agreement_id: 'A2',
      description: 'Contract 2',
      select_label: 'A2 - Contract 2',
      contract_id: 'A2'
    });
    expect(apiMock.GET_FindContracts).toHaveBeenCalledWith({ 'with-indicators': false });
    expect(service.loading()).toBe(false);
  });

  it('should handle response with no data', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce({ data: null });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle undefined response', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce(undefined);
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response without data property', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce({ status: 200 });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with data not array', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce({ data: { data: 'not an array' } });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty array response', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce({ data: { data: [] } });
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle API errors', async () => {
    apiMock.GET_FindContracts.mockRejectedValueOnce(new Error('API Error'));
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should execute initialize correctly', () => {
    const mainSpy = jest.spyOn(service, 'main').mockImplementation();
    service.initialize();
    expect(mainSpy).toHaveBeenCalled();
  });

  it('should use filteredList and filteredLoading when exclude-pooled-funding filter is present', async () => {
    apiMock.GET_FindContracts.mockResolvedValueOnce({ data: { data: mockData } });

    await service.main({ 'exclude-pooled-funding': true });

    const filteredResult = service.filteredList();
    expect(filteredResult).toHaveLength(2);
    expect(filteredResult[0]).toMatchObject({
      agreement_id: 'A1',
      description: 'Contract 1',
      select_label: 'A1 - Contract 1',
      contract_id: 'A1'
    });
    expect(service.filteredLoading()).toBe(false);
  });

  it('should return correct list signal from getList()', () => {
    expect(service.getList()).toBe(service.list);
    expect(service.getList({ 'exclude-pooled-funding': true })).toBe(service.filteredList);
  });

  it('should return correct loading signal from getLoading()', () => {
    expect(service.getLoading()).toBe(service.loading);
    expect(service.getLoading({ 'exclude-pooled-funding': true })).toBe(service.filteredLoading);
  });

  describe('mainForAiAssistant', () => {
    it('should fetch and transform contracts for AI assistant successfully', async () => {
      apiMock.GET_FindContracts.mockResolvedValueOnce({ data: { data: mockData } });

      await service.mainForAiAssistant();

      const result = service.aiAssistantList();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        agreement_id: 'A1',
        description: 'Contract 1',
        select_label: 'A1 - Contract 1',
        contract_id: 'A1'
      });
      expect(result[1]).toEqual({
        agreement_id: 'A2',
        description: 'Contract 2',
        select_label: 'A2 - Contract 2',
        contract_id: 'A2'
      });
      expect(service.aiAssistantLoading()).toBe(false);
      expect(apiMock.GET_FindContracts).toHaveBeenCalledWith({ 'exclude-pooled-funding': true, 'with-indicators': false });
    });

    it('should handle non-array response for AI assistant', async () => {
      apiMock.GET_FindContracts.mockResolvedValueOnce({ data: { data: 'not an array' } });

      await service.mainForAiAssistant();

      expect(service.aiAssistantList()).toEqual([]);
      expect(service.aiAssistantLoading()).toBe(false);
    });

    it('should handle API errors for AI assistant', async () => {
      apiMock.GET_FindContracts.mockRejectedValueOnce(new Error('AI Error'));

      await service.mainForAiAssistant();

      expect(service.aiAssistantList()).toEqual([]);
      expect(service.aiAssistantLoading()).toBe(false);
    });
  });

});
