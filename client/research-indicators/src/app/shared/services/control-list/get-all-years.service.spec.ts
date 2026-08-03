import { TestBed } from '@angular/core/testing';
import { GetAllYearsService } from './get-all-years.service';
import { ApiService } from '../api.service';

describe('GetAllYearsService', () => {
  let service: GetAllYearsService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {};

    TestBed.configureTestingModule({
      providers: [
        GetAllYearsService,
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(GetAllYearsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should inject ApiService', () => {
    expect(service.api).toBe(mockApiService);
  });

  it('should initialize isOpenSearch signal with false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });

  it('should call main in constructor and populate list', async () => {
    // The constructor calls main(), so we need to wait for it to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify that main() was called by checking the list was populated
    expect(service.list()).toEqual([
      { id: 2024, name: '2024' },
      { id: 2025, name: '2025' }
    ]);
    expect(service.loading()).toBe(false);
  });

  it('main should set loading and list correctly', async () => {
    // Reset the list to empty to test main() independently
    service.list.set([]);
    
    await service.main();
    
    expect(service.loading()).toBe(false);
    expect(service.list()).toEqual([
      { id: 2024, name: '2024' },
      { id: 2025, name: '2025' }
    ]);
  });

  it('isOpenSearch should be false', () => {
    expect(service.isOpenSearch()).toBe(false);
  });
});
