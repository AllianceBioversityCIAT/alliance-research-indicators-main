import { TestBed } from '@angular/core/testing';

import { BugHerdService } from './bug-herd.service';

describe('BugHerdService', () => {
  let service: BugHerdService;
  const scriptId = 'bugherd-script';
  const apiKey = 'xjszm5izs5xh4u3vdnwqna';

  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let getElementByIdSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BugHerdService);
    document.body.innerHTML = '';
    createElementSpy = jest.spyOn(document, 'createElement');
    appendChildSpy = jest.spyOn(document.body, 'appendChild');
    getElementByIdSpy = jest.spyOn(document, 'getElementById');
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    getElementByIdSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not load script in production', () => {
    service.init(true);
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('should load script when not in production and script does not exist', () => {
    getElementByIdSpy.mockReturnValue(null);
    const script = document.createElement('script');
    createElementSpy.mockReturnValue(script);
    appendChildSpy.mockImplementation(() => script);
    service.init(false);
    expect(createElementSpy).toHaveBeenCalledWith('script');
    expect(appendChildSpy).toHaveBeenCalledWith(script);
  });

  it('should not load script if it already exists', () => {
    const fakeScript = document.createElement('script');
    fakeScript.id = scriptId;
    document.body.appendChild(fakeScript);
    getElementByIdSpy.mockImplementation((id: string) => (id === scriptId ? fakeScript : null));
    createElementSpy.mockClear();
    appendChildSpy.mockClear();
    service.init(false);
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('should set correct script attributes', () => {
    getElementByIdSpy.mockReturnValue(null);
    const script = document.createElement('script');
    createElementSpy.mockReturnValue(script);
    appendChildSpy.mockImplementation(() => script);
    service.init(false);
    expect(script.id).toBe(scriptId);
    expect(script.type).toBe('text/javascript');
    expect(script.src).toContain(apiKey);
    expect(script.async).toBe(true);
  });

  it('should handle script creation error gracefully', () => {
    getElementByIdSpy.mockReturnValue(null);
    createElementSpy.mockReturnValue(null);
    service.init(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('BugHerd: Could not create script element');
  });

  it('should handle appendChild error gracefully', () => {
    getElementByIdSpy.mockReturnValue(null);
    const script = document.createElement('script');
    createElementSpy.mockReturnValue(script);
    appendChildSpy.mockImplementation(() => {
      throw new Error('DOM error');
    });
    service.init(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('BugHerd: Error loading script', expect.any(Error));
  });

  it('should handle getElementById error gracefully', () => {
    getElementByIdSpy.mockImplementation(() => {
      throw new Error('DOM error');
    });
    service.init(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('BugHerd: Error loading script', expect.any(Error));
  });

  it('should not load script when called with no argument and environment.production is true', () => {
    jest.resetModules();
    jest.doMock('../../../environments/environment', () => ({ environment: { production: true } }));
    const { BugHerdService: BugHerdServiceReloaded } = require('./bug-herd.service');
    const reloadedService = new BugHerdServiceReloaded();
    const createElement = jest.spyOn(document, 'createElement');
    const appendChild = jest.spyOn(document.body, 'appendChild');
    reloadedService.init();
    expect(createElement).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
    createElement.mockRestore();
    appendChild.mockRestore();
  });

  it('should load script when called with no argument and environment.production is false', () => {
    jest.resetModules();
    jest.doMock('../../../environments/environment', () => ({ environment: { production: false } }));
    const { BugHerdService: BugHerdServiceReloaded } = require('./bug-herd.service');
    const reloadedService = new BugHerdServiceReloaded();
    const createElement = jest.spyOn(document, 'createElement');
    const appendChild = jest.spyOn(document.body, 'appendChild');
    const getElementById = jest.spyOn(document, 'getElementById').mockReturnValue(null);
    reloadedService.init();
    expect(createElement).toHaveBeenCalledWith('script');
    expect(appendChild).toHaveBeenCalled();
    createElement.mockRestore();
    appendChild.mockRestore();
    getElementById.mockRestore();
  });
});
