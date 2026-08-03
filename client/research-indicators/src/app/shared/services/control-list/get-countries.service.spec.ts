import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { GetCountriesService } from './get-countries.service';
import { ApiService } from '../api.service';

@Injectable()
class MockGetCountriesService extends GetCountriesService {
  constructor() {
    super();
    // No call main() in the constructor for the tests
  }
}

describe('GetCountriesService', () => {
  let service: MockGetCountriesService;
  let apiMock: Partial<ApiService>;

  beforeEach(() => {
    apiMock = {
      GET_Countries: jest.fn().mockResolvedValue({
        data: [
          { id: 1, name: 'Country 1' },
          { id: 2, name: 'Country 2' }
        ]
      })
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: GetCountriesService, useClass: MockGetCountriesService }
      ]
    });
  });

  it('should be created', () => {
    service = TestBed.inject(GetCountriesService) as MockGetCountriesService;
    expect(service).toBeTruthy();
  });

  it('should load countries data on main() call', async () => {
    service = TestBed.inject(GetCountriesService) as MockGetCountriesService;
    await service.main();
    expect(apiMock.GET_Countries).toHaveBeenCalledWith({ 'is-sub-national': false });
    expect(service.list()).toEqual([
      { id: 1, name: 'Country 1' },
      { id: 2, name: 'Country 2' }
    ]);
    expect(service.loading()).toBeFalsy();
  });

  it('should load countries data with isSubNational true', async () => {
    service = TestBed.inject(GetCountriesService) as MockGetCountriesService;
    await service.main(true);
    expect(apiMock.GET_Countries).toHaveBeenCalledWith({ 'is-sub-national': true });
    expect(service.list()).toEqual([
      { id: 1, name: 'Country 1' },
      { id: 2, name: 'Country 2' }
    ]);
    expect(service.loading()).toBeFalsy();
  });

  it('should handle API errors gracefully', async () => {
    apiMock.GET_Countries = jest.fn().mockRejectedValue(new Error('API Error'));
    TestBed.overrideProvider(ApiService, { useValue: apiMock });
    service = TestBed.inject(GetCountriesService) as MockGetCountriesService;
    await service.main();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBeFalsy();
  });
});
