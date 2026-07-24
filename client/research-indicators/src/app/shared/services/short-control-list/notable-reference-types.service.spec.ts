import { TestBed } from '@angular/core/testing';
import { NotableReferenceTypesService } from './notable-reference-types.service';
import { ApiService } from '../../services/api.service';

describe('NotableReferenceTypesService', () => {
  let service: NotableReferenceTypesService;
  let api: jest.Mocked<ApiService>;

  beforeEach(() => {
    const apiMock = {
      GET_ReferencesType: jest.fn()
    } as any as jest.Mocked<ApiService>;

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiMock }]
    });

    service = TestBed.inject(NotableReferenceTypesService);
    api = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
  });

  it('should create with initial state', () => {
    expect(service).toBeTruthy();
    // loading may switch to false quickly due to constructor main(); just assert it is boolean
    expect(typeof service.loading()).toBe('boolean');
    expect(Array.isArray(service.list())).toBe(true);
  });

  it('main: sets list and clears loading on success', async () => {
    const data = [{ id: 1, name: 'Type A' }];
    api.GET_ReferencesType.mockResolvedValue({ successfulRequest: true, data } as any);

    await service.main();

    expect(api.GET_ReferencesType).toHaveBeenCalled();
    expect(service.list()).toEqual(data);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('main: sets empty list on malformed data', async () => {
    api.GET_ReferencesType.mockResolvedValue({ successfulRequest: true, data: null } as any);

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main: handles error and clears loading', async () => {
    api.GET_ReferencesType.mockRejectedValue(new Error('network'));

    await service.main();

    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});


