import { TestBed } from '@angular/core/testing';
import { OicrResultsService } from './oicr-results.service';
import { ApiService } from '../api.service';
import { Oicr } from '@shared/interfaces/oicr-creation.interface';

describe('OicrResultsService', () => {
  let service: OicrResultsService;
  let apiMock: { GET_OicrResults: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_OicrResults: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [OicrResultsService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(OicrResultsService);
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

  it('main success sets data with mapped select_label and stops loading', async () => {
    const mockData: Oicr[] = [
      {
        id: 1,
        title: 'Test OICR 1',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      },
      {
        id: 2,
        title: 'Test OICR 2',
        created_at: '2023-01-02',
        updated_at: '2023-01-02',
        is_active: true,
        result_status: 'active',
        maturity_level: 'medium',
        report_year: '2023'
      }
    ];
    const expectedData = [
      {
        ...mockData[0],
        select_label: '1 - Test OICR 1'
      },
      {
        ...mockData[1],
        select_label: '2 - Test OICR 2'
      }
    ];
    await setup({ data: mockData });
    expect(apiMock.GET_OicrResults).toHaveBeenCalled();
    expect(service.list()).toEqual(expectedData);
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
    const newData: Oicr[] = [
      {
        id: 3,
        title: 'New OICR',
        created_at: '2023-01-03',
        updated_at: '2023-01-03',
        is_active: true,
        result_status: 'active',
        maturity_level: 'low',
        report_year: '2023'
      }
    ];
    const expectedData = [
      {
        ...newData[0],
        select_label: '3 - New OICR'
      }
    ];
    apiMock.GET_OicrResults.mockResolvedValueOnce({ data: newData });

    await service.main();
    expect(service.list()).toEqual(expectedData);
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
    await setup({ data: { id: 1, title: 'test' } });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  describe('generateSelectLabel', () => {
    it('should generate label with both id and title', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: 1,
        title: 'Test Title',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('1 - Test Title');
    });

    it('should generate label with only id when title is empty', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: 1,
        title: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('1 -');
    });

    it('should generate label with only title when id is null', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: null as any,
        title: 'Test Title',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('- Test Title');
    });

    it('should generate label with only title when id is undefined', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: undefined as any,
        title: 'Test Title',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('- Test Title');
    });

    it('should return dash when both id and title are empty', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: null as any,
        title: '',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('-');
    });

    it('should return dash when both id and title are undefined', async () => {
      await setup({ data: [] });
      const item: Oicr = {
        id: undefined as any,
        title: undefined as any,
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        is_active: true,
        result_status: 'active',
        maturity_level: 'high',
        report_year: '2023'
      };
      const result = (service as any).generateSelectLabel(item);
      expect(result).toBe('-');
    });
  });

  describe('update method', () => {
    it('should update resultsFilter with provided filter', async () => {
      await setup({ data: [] });
      const filter = { status: 'active', year: '2023' };

      service.update(filter);

      expect((service as any).resultsFilter).toEqual(filter);
    });

    it('should handle empty filter object', async () => {
      await setup({ data: [] });
      const filter = {};

      service.update(filter);

      expect((service as any).resultsFilter).toEqual(filter);
    });

    it('should handle filter with complex nested objects', async () => {
      await setup({ data: [] });
      const filter = {
        status: 'active',
        filters: {
          year: '2023',
          type: 'oicr'
        }
      };

      service.update(filter);

      expect((service as any).resultsFilter).toEqual(filter);
    });
  });
});
