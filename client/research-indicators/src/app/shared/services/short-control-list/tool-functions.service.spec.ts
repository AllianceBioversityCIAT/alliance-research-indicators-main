import { TestBed } from '@angular/core/testing';
import { ToolFunctionsService } from './tool-functions.service';
import { ApiService } from '../api.service';

describe('ToolFunctionsService', () => {
  let service: ToolFunctionsService;
  let apiMock: { GET_ToolFunctions: jest.Mock };

  const mockList = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' }
  ];

  const setup = async (response: any, reject = false) => {
    apiMock = {
      GET_ToolFunctions: reject ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(response)
    };
    TestBed.configureTestingModule({ providers: [ToolFunctionsService, { provide: ApiService, useValue: apiMock }] });
    service = TestBed.inject(ToolFunctionsService);
    // wait a that the constructor promise (main) is resolved
    await Promise.resolve();
  };

  it('should create', async () => {
    await setup({ data: [] });
    expect(service).toBeTruthy();
  });

  it('main success with array', async () => {
    await setup({ data: mockList });
    expect(apiMock.GET_ToolFunctions).toHaveBeenCalled();
    expect(service.list()).toEqual(mockList);
    expect(service.loading()).toBe(false);
    expect(service.isOpenSearch()).toBe(false);
  });

  it('main success with non-array sets empty', async () => {
    await setup({ data: null });
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('main catch sets empty and stops loading', async () => {
    await setup(undefined, true);
    expect(service.list()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
