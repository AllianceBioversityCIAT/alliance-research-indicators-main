import { TestBed } from '@angular/core/testing';
import { GetInitiativesService } from './get-initiatives.service';
import { ApiService } from '../api.service';
import { Initiative } from '@shared/interfaces/initiative.interface';

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T) => void;
  reject!: (reason?: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

describe('GetInitiativesService', () => {
  let service: GetInitiativesService;
  let api: { GET_Initiatives: jest.Mock };

  const makeService = () => {
    TestBed.configureTestingModule({
      providers: [GetInitiativesService, { provide: ApiService, useValue: api }]
    });
    service = TestBed.inject(GetInitiativesService);
  };

  beforeEach(() => {
    api = { GET_Initiatives: jest.fn() };
    jest.clearAllMocks();
  });

  it('should be created', () => {
    makeService();
    expect(service).toBeTruthy();
  });

  test('success with array: maps initiatives and disables loading', async () => {
    const data: Initiative[] = [
      { initiative_id: 1, name: 'Initiative 1', description: 'Desc 1', is_active: true },
      { initiative_id: 2, name: 'Initiative 2', description: 'Desc 2', is_active: true }
    ];
    api.GET_Initiatives.mockResolvedValue({ data });
    makeService();
    await Promise.resolve();
    expect(service.list()).toEqual(data);
    expect(service.loading()).toBe(false);
  });

  test('success without array: disables loading and clears signal', async () => {
    api.GET_Initiatives.mockResolvedValue({ data: null });
    makeService();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  test('success with response without data: disables loading and clears signal', async () => {
    api.GET_Initiatives.mockResolvedValue({});
    makeService();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  test('success with data not an array: disables loading and clears signal', async () => {
    api.GET_Initiatives.mockResolvedValue({ data: 'not an array' });
    makeService();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  test('error: disables loading and clears signal', async () => {
    api.GET_Initiatives.mockRejectedValue(new Error('API Error'));
    makeService();
    await Promise.resolve();
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  test('constructor calls main automatically', async () => {
    const data: Initiative[] = [{ initiative_id: 1, name: 'Test Initiative', description: 'Test Desc', is_active: true }];
    api.GET_Initiatives.mockResolvedValue({ data });

    makeService();
    await Promise.resolve();

    expect(api.GET_Initiatives).toHaveBeenCalled();
    expect(service.list()).toEqual(data);
    expect(service.loading()).toBe(false);
  });

  test('loading initializes in true and changes to false', async () => {
    const deferred = new Deferred<{ data: Initiative[] }>();
    api.GET_Initiatives.mockReturnValue(deferred.promise);

    makeService();
    expect(service.loading()).toBe(true);

    deferred.resolve({ data: [] });
    await Promise.resolve();

    expect(service.loading()).toBe(false);
  });

  test('isOpenSearch initializes in false', () => {
    makeService();
    expect(service.isOpenSearch()).toBe(false);
  });
});
