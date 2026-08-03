// Mock @hotjar/browser before importing the service
jest.mock('@hotjar/browser', () => ({
  init: jest.fn(),
  stateChange: jest.fn()
}));

// Mock environment
jest.mock('../../../environments/environment', () => ({
  environment: {
    hotjarId: 123,
    hotjarVersion: 4
  }
}));

import { HotjarService } from './hotjar.service';

describe('HotjarService', () => {
  let service: HotjarService;
  let hotjarInitMock: jest.Mock;
  let hotjarStateChangeMock: jest.Mock;

  beforeEach(() => {
    // Get the mocked functions
    const Hotjar = require('@hotjar/browser');
    hotjarInitMock = Hotjar.init;
    hotjarStateChangeMock = Hotjar.stateChange;

    // Clear mock calls
    hotjarInitMock.mockClear();
    hotjarStateChangeMock.mockClear();

    // Create service instance
    service = new HotjarService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('init calls Hotjar.init with env vars', () => {
    service.init();
    expect(hotjarInitMock).toHaveBeenCalledWith(123, 4);
  });

  it('updateState calls Hotjar.stateChange', () => {
    service.updateState('/test-url');
    expect(hotjarStateChangeMock).toHaveBeenCalledWith('/test-url');
  });

  it('updateState handles error', () => {
    hotjarStateChangeMock.mockImplementation(() => {
      throw new Error('Hotjar error');
    });
    const spy = jest.spyOn(console, 'error').mockImplementation();

    service.updateState('/fail-url');

    expect(spy).toHaveBeenCalledWith('Error updating Hotjar state:', expect.any(Error));
    spy.mockRestore();
  });
});
