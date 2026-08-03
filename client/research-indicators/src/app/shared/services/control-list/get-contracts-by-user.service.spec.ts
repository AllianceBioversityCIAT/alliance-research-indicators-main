import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { GetContractsByUserService } from './get-contracts-by-user.service';
import { ApiService } from '../api.service';

@Injectable()
class MockGetContractsByUserService extends GetContractsByUserService {
  constructor() {
    super();
    // No call main() in the constructor for the tests
  }
}

describe('GetContractsByUserService', () => {
  let service: MockGetContractsByUserService;
  let apiMock: Partial<ApiService>;

  const mockData = [
    {
      agreement_id: 'A1',
      projectDescription: 'Desc1',
      description: 'D1',
      project_lead_description: 'PL1'
    },
    {
      agreement_id: 'A2',
      projectDescription: 'Desc2',
      description: 'D2',
      project_lead_description: 'PL2'
    }
  ];

  beforeEach(() => {
    apiMock = {
      GET_ContractsByUser: jest.fn().mockResolvedValue({ data: mockData })
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: GetContractsByUserService, useClass: MockGetContractsByUserService }
      ]
    });
  });

  it('should be created', () => {
    service = TestBed.inject(GetContractsByUserService) as MockGetContractsByUserService;
    expect(service).toBeTruthy();
  });

  it('should load contracts and set full_name', async () => {
    service = TestBed.inject(GetContractsByUserService) as MockGetContractsByUserService;
    await service.main();
    expect(apiMock.GET_ContractsByUser).toHaveBeenCalled();
    expect(service.list()).toEqual([
      { ...mockData[0], full_name: 'A1 Desc1 D1 PL1' },
      { ...mockData[1], full_name: 'A2 Desc2 D2 PL2' }
    ]);
    expect(service.loading()).toBeFalsy();
  });

  it('should handle empty data', async () => {
    apiMock.GET_ContractsByUser = jest.fn().mockResolvedValue({ data: undefined });
    TestBed.overrideProvider(ApiService, { useValue: apiMock });
    service = TestBed.inject(GetContractsByUserService) as MockGetContractsByUserService;
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBeFalsy();
  });

  it('should handle API errors gracefully', async () => {
    apiMock.GET_ContractsByUser = jest.fn().mockRejectedValue(new Error('API Error'));
    TestBed.overrideProvider(ApiService, { useValue: apiMock });
    service = TestBed.inject(GetContractsByUserService) as MockGetContractsByUserService;
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBeFalsy();
  });
});
