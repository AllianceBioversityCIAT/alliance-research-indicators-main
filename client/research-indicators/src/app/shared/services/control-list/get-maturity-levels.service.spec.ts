import { TestBed } from '@angular/core/testing';
import { GetMaturityLevelsService } from './get-maturity-levels.service';
import { ApiService } from '../api.service';
import { MaturityLevel } from '@shared/interfaces/maturity-level.interface';

describe('GetMaturityLevelsService', () => {
  let service: GetMaturityLevelsService;
  let apiMock: { GET_MaturityLevels: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_MaturityLevels: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [GetMaturityLevelsService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(GetMaturityLevelsService);
    await Promise.resolve();
  };

  it('should be created', async () => {
    await setup({ data: [] });
    expect(service).toBeTruthy();
  });

  it('should initialize with empty list and loading false', async () => {
    await setup({ data: [] });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('main success sets data and stops loading', async () => {
    const mockData: MaturityLevel[] = [
      {
        id: 1,
        name: 'Level 1',
        description: 'Description 1',
        full_name: 'Full Name 1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true
      },
      {
        id: 2,
        name: 'Level 2',
        description: 'Description 2',
        full_name: 'Full Name 2',
        created_at: '2023-01-02',
        updated_at: '2023-01-02',
        is_active: true
      }
    ];
    await setup({ data: mockData });
    expect(apiMock.GET_MaturityLevels).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('main success handles non-array response', async () => {
    await setup({ data: null });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main success handles undefined response', async () => {
    await setup({ data: undefined });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main catch sets empty list and stops loading', async () => {
    await setup(undefined, true);
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should allow manual main call with updated data', async () => {
    await setup({ data: [] });
    const newData: MaturityLevel[] = [
      {
        id: 3,
        name: 'New Level',
        description: 'New Description',
        full_name: 'New Full Name',
        created_at: '2023-01-03',
        updated_at: '2023-01-03',
        is_active: true
      }
    ];
    apiMock.GET_MaturityLevels.mockResolvedValueOnce({ data: newData });

    await service.main();
    expect(service.list()).toEqual(newData);
    expect(service.loading()).toBe(false);
  });

  it('should handle empty array response', async () => {
    await setup({ data: [] });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with no data property', async () => {
    await setup({});
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with invalid data type', async () => {
    await setup({ data: 'invalid' });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('should handle response with data as object instead of array', async () => {
    await setup({ data: { id: 1, name: 'test' } });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
