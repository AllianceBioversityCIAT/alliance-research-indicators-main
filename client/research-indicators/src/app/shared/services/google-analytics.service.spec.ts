// Mock ibdevkit before importing the service
jest.mock('ibdevkit', () => ({
  IBDGoogleAnalytics: jest.fn(() => ({
    initialize: jest.fn(),
    trackPageView: jest.fn()
  }))
}));

// Mock environment
jest.mock('../../../environments/environment', () => ({
  environment: {
    googleAnalyticsId: 'GA-123456789'
  }
}));

import { GoogleAnalyticsService } from './google-analytics.service';

describe('GoogleAnalyticsService', () => {
  let service: GoogleAnalyticsService;
  let ibdGoogleAnalyticsMock: any;
  let initializeMock: jest.Mock;
  let trackPageViewMock: jest.Mock;

  beforeEach(() => {
    // Get the mocked functions
    const { IBDGoogleAnalytics } = require('ibdevkit');
    ibdGoogleAnalyticsMock = IBDGoogleAnalytics;
    initializeMock = jest.fn();
    trackPageViewMock = jest.fn();

    // Setup the mock to return the functions
    ibdGoogleAnalyticsMock.mockReturnValue({
      initialize: initializeMock,
      trackPageView: trackPageViewMock
    });

    // Clear mock calls
    ibdGoogleAnalyticsMock.mockClear();
    initializeMock.mockClear();
    trackPageViewMock.mockClear();

    // Create service instance
    service = new GoogleAnalyticsService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('init calls IBDGoogleAnalytics().initialize with env var', () => {
    service.init();
    expect(ibdGoogleAnalyticsMock).toHaveBeenCalled();
    expect(initializeMock).toHaveBeenCalledWith('GA-123456789');
  });

  it('updateState calls IBDGoogleAnalytics().trackPageView', () => {
    service.updateState('/test-url');
    expect(ibdGoogleAnalyticsMock).toHaveBeenCalled();
    expect(trackPageViewMock).toHaveBeenCalledWith('/test-url');
  });
});
