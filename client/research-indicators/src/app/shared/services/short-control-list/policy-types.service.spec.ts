import { TestBed } from '@angular/core/testing';
import { PolicyTypesService } from './policy-types.service';
import { ApiService } from '../api.service';
import { apiServiceMock } from '../../../testing/mock-services.mock';

describe('PolicyTypesService', () => {
  let service: PolicyTypesService;
  let apiService: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PolicyTypesService, { provide: ApiService, useValue: apiServiceMock }]
    });
    service = TestBed.inject(PolicyTypesService);
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize and call main in constructor', async () => {
    await service.main();
    expect(service.loading()).toBe(false);
    expect(service.list().length).toBeGreaterThan(0);
  });

  it('should set loading true while fetching and false after', async () => {
    service.loading.set(false);
    const originalSet = service.loading.set;
    const loadingStates: boolean[] = [];
    service.loading.set = jest.fn(v => {
      loadingStates.push(v);
      originalSet.call(service.loading, v);
    });
    await service.main();
    expect(loadingStates).toEqual([true, false]);
    expect(service.loading()).toBe(false);
  });

  it('should set list with expected policy types', async () => {
    service.list.set([]);
    await service.main();
    expect(service.list()).toEqual([
      { id: 1, name: 'Policy or Strategy' },
      { id: 2, name: 'Legal instrument' },
      { id: 3, name: 'Program, Budget, or Investment' }
    ]);
  });

  it('should have correct initial list values', () => {
    const expected = [
      { id: 1, name: 'Policy or Strategy' },
      { id: 2, name: 'Legal instrument' },
      { id: 3, name: 'Program, Budget, or Investment' }
    ];
    expect(service.list()).toEqual(expected);
  });

  it('should have loading false after initialization', () => {
    expect(service.loading()).toBe(false);
  });

  it('should maintain list consistency across multiple main() calls', async () => {
    const expected = [
      { id: 1, name: 'Policy or Strategy' },
      { id: 2, name: 'Legal instrument' },
      { id: 3, name: 'Program, Budget, or Investment' }
    ];

    await service.main();
    expect(service.list()).toEqual(expected);

    await service.main();
    expect(service.list()).toEqual(expected);
  });

  it('should handle empty list reset and restore', async () => {
    service.list.set([]);
    expect(service.list()).toEqual([]);

    await service.main();
    expect(service.list()).toEqual([
      { id: 1, name: 'Policy or Strategy' },
      { id: 2, name: 'Legal instrument' },
      { id: 3, name: 'Program, Budget, or Investment' }
    ]);
  });
});
