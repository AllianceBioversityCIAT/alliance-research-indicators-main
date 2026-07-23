import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { IpOwnerService } from './ip-owner.service';
import { ApiService } from '../api.service';

@Injectable()
class MockIpOwnerService extends IpOwnerService {
  constructor() {
    super();
  }
}

describe('IpOwnerService', () => {
  let service: MockIpOwnerService;
  let apiMock: Partial<ApiService>;

  beforeEach(() => {
    apiMock = {
      GET_IpOwners: jest.fn().mockResolvedValue({
        data: [
          { id: 1, name: 'Owner 1' },
          { id: 2, name: 'Owner 2' }
        ]
      })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: IpOwnerService, useClass: MockIpOwnerService }
      ]
    });
  });

  it('should be created', () => {
    service = TestBed.inject(IpOwnerService) as MockIpOwnerService;
    expect(service).toBeTruthy();
  });

  it('should load ip owners data on main() call', async () => {
    service = TestBed.inject(IpOwnerService) as MockIpOwnerService;
    await service.main();
    expect(service.list()).toEqual([
      { id: 1, name: 'Owner 1' },
      { id: 2, name: 'Owner 2' }
    ]);
    expect(service.loading()).toBeFalsy();
  });

  it('should handle loading state correctly', async () => {
    service = TestBed.inject(IpOwnerService) as MockIpOwnerService;
    const mainPromise = service.main();
    expect(service.loading()).toBeTruthy();
    await mainPromise;
    expect(service.loading()).toBeFalsy();
  });

  it('should handle API errors gracefully', async () => {
    apiMock.GET_IpOwners = jest.fn().mockRejectedValue(new Error('API Error'));
    TestBed.overrideProvider(ApiService, { useValue: apiMock });
    service = TestBed.inject(IpOwnerService) as MockIpOwnerService;
    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBeFalsy();
  });
});
