import { TestBed } from '@angular/core/testing';

import { CapSharingFormatsService } from './cap-sharing-formats.service';

describe('CapSharingFormatsService', () => {
  let service: CapSharingFormatsService;
  let apiMock: any;
  let listMock: any;
  let loadingMock: any;

  const mockData = [
    { id: 1, name: 'Format 1' },
    { id: 2, name: 'Format 2' }
  ];

  beforeEach(() => {
    apiMock = {
      GET_SessionFormat: jest.fn().mockResolvedValue({ data: mockData })
    };
    listMock = Object.assign(() => [], { set: jest.fn() });
    loadingMock = Object.assign(() => true, { set: jest.fn() });
    service = Object.create(CapSharingFormatsService.prototype);
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
    expect(apiMock.GET_SessionFormat).toHaveBeenCalled();
    expect(listMock.set).toHaveBeenCalledWith(mockData);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('main should handle errors correctly', async () => {
    apiMock.GET_SessionFormat = jest.fn().mockRejectedValue(new Error('fail'));
    try {
      await service.main();
    } catch (error) {
      // The error is propagated, but loading.set(false) should have been called
    }
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });
});
