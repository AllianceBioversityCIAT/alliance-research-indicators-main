import { TestBed } from '@angular/core/testing';

import { CapSharingGendersService } from './cap-sharing-genders.service';

describe('CapSharingGendersService', () => {
  let service: CapSharingGendersService;
  let apiMock: any;
  let listMock: any;
  let loadingMock: any;

  const mockData = [
    { id: 1, name: 'Gender 1' },
    { id: 2, name: 'Gender 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_Gender: jest.fn().mockResolvedValue({ data: mockData })
    };
    listMock = Object.assign(() => [], { set: jest.fn() });
    loadingMock = Object.assign(() => false, { set: jest.fn() });
    service = Object.create(CapSharingGendersService.prototype);
    service.api = apiMock;
    service.list = listMock;
    service.loading = loadingMock;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main should set loading, call API and set list correctly', async () => {
    await service.main();
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(apiMock.GET_Gender).toHaveBeenCalled();
    expect(listMock.set).toHaveBeenCalledWith(mockData);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main should handle errors correctly', async () => {
    apiMock.GET_Gender = jest.fn().mockRejectedValue(new Error('fail'));
    try {
      await service.main();
    } catch (error) {
      // The error is propagated, but loading.set(false) should have been called
    }
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });
});
