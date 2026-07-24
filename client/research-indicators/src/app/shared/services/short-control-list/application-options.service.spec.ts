import { TestBed } from '@angular/core/testing';
import { ApplicationOptionsService } from './application-options.service';
import { ApiService } from '../api.service';

describe('ApplicationOptionsService', () => {
  let service: ApplicationOptionsService;
  let apiMock: { GET_ApplicationOptions: jest.Mock };

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_ApplicationOptions: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({
      providers: [ApplicationOptionsService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(ApplicationOptionsService);
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
  });

  it('main success sets data and stops loading', async () => {
    const mockData = [
      { id: 1, name: 'Option 1' },
      { id: 2, name: 'Option 2' }
    ];
    await setup({ data: mockData });
    expect(apiMock.GET_ApplicationOptions).toHaveBeenCalled();
    expect(service.list()).toEqual(mockData);
    expect(service.loading()).toBe(false);
  });

  it('main catch logs error and sets empty list', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    await setup(undefined, true);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch application options:', expect.any(Error));
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should allow manual main call with updated data', async () => {
    await setup({ data: [] });
    const newData = [{ id: 3, name: 'New Option' }];
    apiMock.GET_ApplicationOptions.mockResolvedValueOnce({ data: newData });

    await service.main();
    expect(service.list()).toEqual(newData);
    expect(service.loading()).toBe(false);
  });
});
