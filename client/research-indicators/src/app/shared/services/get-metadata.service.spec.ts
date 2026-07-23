import { TestBed } from '@angular/core/testing';
import { GetMetadataService } from './get-metadata.service';
import { ApiService } from './api.service';
import { CacheService } from './cache/cache.service';
import { Router } from '@angular/router';

describe('GetMetadataService', () => {
  let service: GetMetadataService;

  const mockApi: Partial<ApiService> = {
    GET_Metadata: jest.fn()
  };

  const mockCache: Partial<CacheService> = {
    currentMetadata: { set: jest.fn() } as any,
    currentResultId: { set: jest.fn() } as any
  };

  const mockRouter: Partial<Router> = {
    navigate: jest.fn()
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GetMetadataService,
        { provide: ApiService, useValue: mockApi },
        { provide: CacheService, useValue: mockCache },
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(GetMetadataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('update', () => {
    it('should navigate and return canOpen false when status is not 200', async () => {
      (mockApi.GET_Metadata as jest.Mock).mockResolvedValueOnce({ status: 404 });

      const res = await service.update(123, null);

      expect(mockApi.GET_Metadata).toHaveBeenCalledWith(123, undefined);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/results-center']);
      expect(res).toEqual({ canOpen: false });
    });

    it('should set cache and return fields when status is 200', async () => {
      const data = {
        result_official_code: 111,
        indicator_id: 5,
        status_id: 9,
        result_title: 'Some Title',
        result_contract_id: 'C-1'
      };
      (mockApi.GET_Metadata as jest.Mock).mockResolvedValueOnce({ status: 200, data });

      const res = await service.update(456, 'STAR');

      expect(mockApi.GET_Metadata).toHaveBeenCalledWith(456, 'STAR');
      expect((mockCache.currentMetadata as any).set).toHaveBeenCalledWith(data);
      expect(res).toEqual({
        canOpen: true,
        result_official_code: 111,
        indicator_id: 5,
        status_id: 9,
        result_contract_id: 'C-1',
        result_title: 'Some Title'
      });
    });

    it('should navigate and return canOpen false when response is undefined', async () => {
      (mockApi.GET_Metadata as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await service.update(789);

      expect(mockApi.GET_Metadata).toHaveBeenCalledWith(789, undefined);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/results-center']);
      expect(res).toEqual({ canOpen: false });
    });

    it('should handle 200 status with undefined data', async () => {
      (mockApi.GET_Metadata as jest.Mock).mockResolvedValueOnce({ status: 200, data: undefined });

      const res = await service.update(999);

      expect(mockApi.GET_Metadata).toHaveBeenCalledWith(999, undefined);
      expect((mockCache.currentMetadata as any).set).toHaveBeenCalledWith(undefined);
      expect(res).toEqual({
        canOpen: true,
        result_official_code: undefined,
        indicator_id: undefined,
        status_id: undefined,
        result_contract_id: undefined,
        result_title: undefined
      });
    });
  });

  describe('formatText', () => {
    it('should return empty string when less than two words', () => {
      expect(service.formatText('Single')).toBe('');
      expect(service.formatText('')).toBe('');
    });

    it('should return concatenated formatted parts', () => {
      const out = service.formatText('hello world');
      expect(out).toBe('HelWor');
    });
  });

  describe('clearMetadata', () => {
    it('should reset metadata and result id', () => {
      service.clearMetadata();
      expect((mockCache.currentMetadata as any).set).toHaveBeenCalledWith({});
      expect((mockCache.currentResultId as any).set).toHaveBeenCalledWith(0);
    });
  });
});
